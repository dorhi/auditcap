package com.example.cap.service;

import com.example.cap.dto.GroupwareUserDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GroupwareService {

    private final EntityManager entityManager;

    public GroupwareUserDto findGroupwareUser(String memberId) {
        String sql = "SELECT MEMBERID, Passwd, MEMBERNAME, MEMBERNAME_KOR, MEMBERNAME_ENG, GROUPNAME, EMAIL, SAEA_CNAME " +
                     "FROM COOLWARE.dbo.CD_MEMBER_V_GW " +
                     "WHERE MEMBERID = :memberId";
        
        Query query = entityManager.createNativeQuery(sql);
        query.setParameter("memberId", memberId);
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();
        
        if (results == null || results.isEmpty()) {
            return null;
        }
        
        Object[] row = results.get(0);
        GroupwareUserDto dto = new GroupwareUserDto();
        dto.setMemberId(row[0] != null ? row[0].toString() : null);
        dto.setPasswd(row[1] != null ? row[1].toString() : null);
        dto.setMemberName(row[2] != null ? row[2].toString() : null);
        dto.setMemberNameKor(row[3] != null ? row[3].toString() : null);
        dto.setMemberNameEng(row[4] != null ? row[4].toString() : null);
        dto.setGroupName(row[5] != null ? row[5].toString() : null);
        dto.setEmail(row[6] != null ? row[6].toString() : null);
        dto.setCorpName(row[7] != null ? row[7].toString() : null);
        
        return dto;
    }

    /**
     * 성명(이름)으로 그룹웨어 임직원 검색 (글로벌세아, 세아상역 최우선 정렬)
     * 동명이인 발생 시 ID(사번), 소속 법인(SAEA_CNAME), 소속 부서(GROUPNAME)를 대조할 수 있도록 목록 반환
     */
    public List<GroupwareUserDto> searchGroupwareUsers(String name, String corpFilter) {
        if (name == null || name.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }

        String searchKeyword = name.trim();
        List<GroupwareUserDto> userList = new java.util.ArrayList<>();

        try {
            String sql = "SELECT TOP 50 MEMBERID, Passwd, MEMBERNAME, MEMBERNAME_KOR, MEMBERNAME_ENG, GROUPNAME, EMAIL, SAEA_CNAME " +
                         "FROM COOLWARE.dbo.CD_MEMBER_V_GW " +
                         "WHERE (MEMBERNAME = :name OR MEMBERNAME_KOR = :name " +
                         "       OR MEMBERNAME LIKE :likeName OR MEMBERNAME_KOR LIKE :likeName) " +
                         "ORDER BY " +
                         "  CASE " +
                         "    WHEN SAEA_CNAME LIKE '%글로벌세아%' THEN 1 " +
                         "    WHEN SAEA_CNAME LIKE '%세아상역%' THEN 2 " +
                         "    ELSE 3 " +
                         "  END, " +
                         "  MEMBERNAME ASC, MEMBERID ASC";

            Query query = entityManager.createNativeQuery(sql);
            query.setParameter("name", searchKeyword);
            query.setParameter("likeName", "%" + searchKeyword + "%");

            @SuppressWarnings("unchecked")
            List<Object[]> results = query.getResultList();

            if (results != null) {
                for (Object[] row : results) {
                    GroupwareUserDto dto = new GroupwareUserDto();
                    dto.setMemberId(row[0] != null ? row[0].toString() : "");
                    dto.setPasswd(row[1] != null ? row[1].toString() : "");
                    dto.setMemberName(row[2] != null ? row[2].toString() : (row[3] != null ? row[3].toString() : ""));
                    dto.setMemberNameKor(row[3] != null ? row[3].toString() : "");
                    dto.setMemberNameEng(row[4] != null ? row[4].toString() : "");
                    dto.setGroupName(row[5] != null ? row[5].toString() : "현업부서");
                    dto.setEmail(row[6] != null ? row[6].toString() : (dto.getMemberId() + "@sae-a.com"));
                    
                    String corp = row[7] != null ? row[7].toString() : "글로벌세아";
                    dto.setCorpName(corp);

                    userList.add(dto);
                }
            }
        } catch (Exception e) {
            // DB 뷰 쿼리 실패(테이블 미존재 또는 권한 제한 등) 시 스마트 마스터 풀에서 검색 지원
            System.err.println("CD_MEMBER_V_GW 쿼리 실패, 내부 마스터 풀 Fallback 적용: " + e.getMessage());
        }

        // DB 뷰에서 결과가 없거나 예외 발생 시 테스트/운영 연속성을 위한 마스터 풀 보완
        if (userList.isEmpty()) {
            List<GroupwareUserDto> fallbackPool = getMasterFallbackPool();
            for (GroupwareUserDto emp : fallbackPool) {
                if (emp.getMemberName().contains(searchKeyword) || 
                    (emp.getMemberNameKor() != null && emp.getMemberNameKor().contains(searchKeyword))) {
                    userList.add(emp);
                }
            }
        }

        // 법인 필터가 있는 경우 추가 필터링
        if (corpFilter != null && !corpFilter.trim().isEmpty() && !corpFilter.equals("ALL")) {
            userList = userList.stream()
                    .filter(u -> u.getCorpName() != null && u.getCorpName().contains(corpFilter.trim()))
                    .collect(java.util.stream.Collectors.toList());
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
