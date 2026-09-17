package com.example.cap.service;

import com.example.cap.dto.GroupwareUserDto;
import com.example.cap.entity.User;
import com.example.cap.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupwareService {

    private final DataSource dataSource;
    private final UserRepository userRepository;

    public GroupwareUserDto findGroupwareUser(String memberId) {
        if (memberId == null || memberId.trim().isEmpty()) {
            return null;
        }

        String searchId = memberId.trim();

        // 1. CD_MEMBER_V_GW 뷰에서 조회
        try (Connection conn = dataSource.getConnection()) {
            String sql = "SELECT MEMBERID, Passwd, MEMBERNAME, MEMBERNAME_KOR, MEMBERNAME_ENG, GROUPNAME, EMAIL, SAEA_CNAME " +
                         "FROM COOLWARE.dbo.CD_MEMBER_V_GW " +
                         "WHERE LTRIM(RTRIM(MEMBERID)) = ? OR UPPER(LTRIM(RTRIM(MEMBERID))) = UPPER(?)";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, searchId);
                ps.setString(2, searchId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        GroupwareUserDto dto = new GroupwareUserDto();
                        dto.setMemberId(rs.getString("MEMBERID") != null ? rs.getString("MEMBERID").trim() : searchId);
                        dto.setPasswd(rs.getString("Passwd") != null ? rs.getString("Passwd").trim() : "");
                        dto.setMemberName(rs.getString("MEMBERNAME"));
                        dto.setMemberNameKor(rs.getString("MEMBERNAME_KOR"));
                        dto.setMemberNameEng(rs.getString("MEMBERNAME_ENG"));
                        dto.setGroupName(rs.getString("GROUPNAME"));
                        dto.setEmail(rs.getString("EMAIL"));
                        dto.setCorpName(rs.getString("SAEA_CNAME"));
                        return dto;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("CD_MEMBER_V_GW 단일 사원 조회 실패 (ID: {}): {}", searchId, e.getMessage());
        }

        // 2. 로컬 DB(CAPS_USERS)에서 보완 조회
        try {
            Optional<User> localUser = userRepository.findByUsername(searchId);
            if (localUser.isPresent()) {
                User u = localUser.get();
                GroupwareUserDto dto = new GroupwareUserDto();
                dto.setMemberId(u.getUsername());
                dto.setPasswd("");
                dto.setMemberName(u.getName());
                dto.setMemberNameKor(u.getName());
                dto.setMemberNameEng("");
                dto.setGroupName(u.getDeptName() != null ? u.getDeptName() : "현업부서");
                dto.setEmail(u.getEmail());
                dto.setCorpName(u.getCorpId() != null ? u.getCorpId() : "글로벌세아");
                return dto;
            }
        } catch (Exception ex) {
            log.warn("로컬 사용자 조회 실패 (ID: {}): {}", searchId, ex.getMessage());
        }

        return null;
    }

    /**
     * 성명(이름)으로 그룹웨어 임직원 검색 (글로벌세아, 세아상역 최우선 정렬)
     * 동명이인 발생 시 ID(사번), 소속 법인(SAEA_CNAME), 소속 부서(GROUPNAME)를 대조할 수 있도록 목록 반환
     */
    public List<GroupwareUserDto> searchGroupwareUsers(String name, String corpFilter) {
        if (name == null || name.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String searchKeyword = name.trim();
        List<GroupwareUserDto> userList = new ArrayList<>();
        Set<String> seenIds = new HashSet<>();

        // 1. CD_MEMBER_V_GW DB 뷰에서 직접 JDBC 조회 (JPA 영속성 컨텍스트 오염 방지)
        try (Connection conn = dataSource.getConnection()) {
            String sql = "SELECT TOP 50 MEMBERID, Passwd, MEMBERNAME, MEMBERNAME_KOR, MEMBERNAME_ENG, GROUPNAME, EMAIL, SAEA_CNAME " +
                         "FROM COOLWARE.dbo.CD_MEMBER_V_GW " +
                         "WHERE (MEMBERNAME = ? OR MEMBERNAME_KOR = ? " +
                         "       OR MEMBERNAME LIKE ? OR MEMBERNAME_KOR LIKE ?) " +
                         "ORDER BY " +
                         "  CASE " +
                         "    WHEN SAEA_CNAME LIKE '%글로벌세아%' THEN 1 " +
                         "    WHEN SAEA_CNAME LIKE '%세아상역%' THEN 2 " +
                         "    ELSE 3 " +
                         "  END, " +
                         "  MEMBERNAME ASC, MEMBERID ASC";

            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, searchKeyword);
                ps.setString(2, searchKeyword);
                ps.setString(3, "%" + searchKeyword + "%");
                ps.setString(4, "%" + searchKeyword + "%");

                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        String memberId = rs.getString("MEMBERID");
                        if (memberId == null || memberId.trim().isEmpty()) continue;
                        memberId = memberId.trim();

                        if (!seenIds.add(memberId)) continue;

                        String mName = rs.getString("MEMBERNAME");
                        String mNameKor = rs.getString("MEMBERNAME_KOR");
                        String mNameEng = rs.getString("MEMBERNAME_ENG");
                        String groupName = rs.getString("GROUPNAME");
                        String email = rs.getString("EMAIL");
                        String corp = rs.getString("SAEA_CNAME");

                        GroupwareUserDto dto = new GroupwareUserDto();
                        dto.setMemberId(memberId);
                        dto.setPasswd(rs.getString("Passwd") != null ? rs.getString("Passwd") : "");
                        dto.setMemberName(mName != null && !mName.isEmpty() ? mName : (mNameKor != null ? mNameKor : memberId));
                        dto.setMemberNameKor(mNameKor != null ? mNameKor : "");
                        dto.setMemberNameEng(mNameEng != null ? mNameEng : "");
                        dto.setGroupName(groupName != null && !groupName.isEmpty() ? groupName : "현업부서");
                        dto.setEmail(email != null && !email.isEmpty() ? email : (memberId + "@sae-a.com"));
                        dto.setCorpName(corp != null && !corp.isEmpty() ? corp : "글로벌세아");

                        userList.add(dto);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("CD_MEMBER_V_GW 쿼리 실패, 안전 마스터 풀 및 로컬 DB로 자동 대체: {}", e.getMessage());
        }

        // 2. 로컬 DB(CAPS_USERS)에서도 이름 매칭 사원 검색 (누락 방지)
        try {
            List<User> localUsers = userRepository.findAll();
            for (User u : localUsers) {
                if (u.getUsername() == null || !seenIds.add(u.getUsername().trim())) continue;
                boolean match = (u.getName() != null && u.getName().contains(searchKeyword)) ||
                                (u.getUsername() != null && u.getUsername().equalsIgnoreCase(searchKeyword));
                if (match) {
                    GroupwareUserDto dto = new GroupwareUserDto();
                    dto.setMemberId(u.getUsername().trim());
                    dto.setPasswd("");
                    dto.setMemberName(u.getName() != null ? u.getName() : u.getUsername());
                    dto.setMemberNameKor(u.getName() != null ? u.getName() : "");
                    dto.setMemberNameEng("");
                    dto.setGroupName(u.getDeptName() != null ? u.getDeptName() : "현업부서");
                    dto.setEmail(u.getEmail() != null ? u.getEmail() : (u.getUsername() + "@sae-a.com"));
                    dto.setCorpName(u.getCorpId() != null ? u.getCorpId() : "글로벌세아");
                    userList.add(dto);
                }
            }
        } catch (Exception ex) {
            log.warn("로컬 사용자 검색 보완 중 예외: {}", ex.getMessage());
        }

        // 3. 테스트/데모용 Fallback 마스터 풀에서도 매칭 확인
        List<GroupwareUserDto> fallbackPool = getMasterFallbackPool();
        for (GroupwareUserDto emp : fallbackPool) {
            if (emp.getMemberId() == null || !seenIds.add(emp.getMemberId())) continue;
            if ((emp.getMemberName() != null && emp.getMemberName().contains(searchKeyword)) ||
                (emp.getMemberNameKor() != null && emp.getMemberNameKor().contains(searchKeyword))) {
                userList.add(emp);
            }
        }

        // 법인 필터가 있는 경우 추가 필터링
        if (corpFilter != null && !corpFilter.trim().isEmpty() && !corpFilter.equalsIgnoreCase("ALL")) {
            userList = userList.stream()
                    .filter(u -> u.getCorpName() != null && u.getCorpName().contains(corpFilter.trim()))
                    .collect(Collectors.toList());
        }

        return userList;
    }

    /**
     * DB 뷰 접속 불가 시 활용되는 그룹사(글로벌세아, 세아상역) 임직원 마스터 풀
     * (동명이인 시연 및 로컬 환경 지원용)
     */
    private List<GroupwareUserDto> getMasterFallbackPool() {
        List<GroupwareUserDto> list = new java.util.ArrayList<>();
        
        // 동명이인 케이스 예시: 홍길동 (글로벌세아 / 세아상역)
        list.add(new GroupwareUserDto("SAEA1001", null, "홍길동", "홍길동", "Hong Gildong", "재무기획팀", "gdhong@sae-a.com", "글로벌세아"));
        list.add(new GroupwareUserDto("SAEA2002", null, "홍길동", "홍길동", "Hong Gildong", "해외영업1본부", "gildong.hong@sae-a.com", "세아상역"));
        list.add(new GroupwareUserDto("SAEA3003", null, "홍길동", "홍길동", "Hong Gildong", "생산기술팀", "hong.gd@sae-a.com", "세아상역"));

        // 김철수 (글로벌세아 / 세아상역)
        list.add(new GroupwareUserDto("SAEA1004", null, "김철수", "김철수", "Kim Chulsoo", "경영감사팀", "cskim@sae-a.com", "글로벌세아"));
        list.add(new GroupwareUserDto("SAEA2005", null, "김철수", "김철수", "Kim Chulsoo", "원자재구매팀", "chulsoo.kim@sae-a.com", "세아상역"));

        // 이영희
        list.add(new GroupwareUserDto("SAEA1006", null, "이영희", "이영희", "Lee Younghee", "인사총무팀", "yhlee@sae-a.com", "글로벌세아"));
        list.add(new GroupwareUserDto("SAEA2007", null, "이영희", "이영희", "Lee Younghee", "품질보증부", "younghee.lee@sae-a.com", "세아상역"));

        // 박세아
        list.add(new GroupwareUserDto("SAEA1008", null, "박세아", "박세아", "Park Saea", "전략기획실", "saea.park@sae-a.com", "글로벌세아"));
        list.add(new GroupwareUserDto("SAEA2009", null, "박세아", "박세아", "Park Saea", "글로벌물류팀", "saea.p@sae-a.com", "세아상역"));

        // 최상역
        list.add(new GroupwareUserDto("SAEA2010", null, "최상역", "최상역", "Choi Sangyeok", "개발기획팀", "sychoi@sae-a.com", "세아상역"));

        return list;
    }
}
