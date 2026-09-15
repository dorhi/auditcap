package com.example.cap.security;

import com.example.cap.entity.User;
import com.example.cap.entity.UserRole;
import com.example.cap.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Types;
import java.util.Collections;

@Slf4j
@Component
public class CustomAuthenticationProvider implements AuthenticationProvider {

    private final DataSource dataSource;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public CustomAuthenticationProvider(DataSource dataSource, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.dataSource = dataSource;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String username = authentication.getName();
        String password = authentication.getCredentials() != null ? authentication.getCredentials().toString() : "";

        if (username == null || username.trim().isEmpty() || password.trim().isEmpty()) {
            throw new BadCredentialsException("아이디와 비밀번호를 모두 입력해 주세요.");
        }

        username = username.trim();

        // 1. 사내 그룹웨어 DB 조회용 Stored Procedure (sp_check_groupware_login) 호출 시도
        // JPA/Hibernate 트랜잭션 오염(rollback-only) 방지를 위해 독립 JDBC Connection으로 안전하게 실행
        // IN: @username, @password / OUT: @isValid, @corpId, @deptName, @name, @email
        boolean isGroupwareValid = false;
        String gwCorpId = "";
        String gwDeptName = "";
        String gwName = "";
        String gwEmail = "";

        try (Connection conn = dataSource.getConnection()) {
            String spSql = "{call sp_check_groupware_login(?, ?, ?, ?, ?, ?, ?)}";
            try (CallableStatement cs = conn.prepareCall(spSql)) {
                cs.setString(1, username);
                cs.setString(2, password);
                cs.registerOutParameter(3, Types.INTEGER);
                cs.registerOutParameter(4, Types.VARCHAR);
                cs.registerOutParameter(5, Types.VARCHAR);
                cs.registerOutParameter(6, Types.VARCHAR);
                cs.registerOutParameter(7, Types.VARCHAR);

                cs.execute();
                int isValidResult = cs.getInt(3);
                if (isValidResult == 1) {
                    isGroupwareValid = true;
                    gwCorpId = cs.getString(4);
                    gwDeptName = cs.getString(5);
                    gwName = cs.getString(6);
                    gwEmail = cs.getString(7);
                    log.info("그룹웨어(sp_check_groupware_login) 인증 성공: 사용자={}", username);
                }
            }
        } catch (Exception e) {
            // DB에 SP가 존재하지 않거나 호출 중 에러가 발생해도 JPA 트랜잭션에 영향을 주지 않고 2단계(기본 계정관리)로 안전하게 전환
            log.warn("그룹웨어 SP(sp_check_groupware_login) 호출 불가 또는 예외 (기본 사용자 계정관리 확인으로 전환): {}", e.getMessage());
        }

        User systemUser = null;

        // 2-A. 그룹웨어 SP에서 조회가 성공한 경우: 로컬 DB(CAPS_USERS) 동기화 및 확인
        if (isGroupwareValid) {
            systemUser = userRepository.findByUsername(username).orElse(null);
            if (systemUser != null) {
                // 그룹웨어 최신 정보로 동기화 갱신
                if (gwName != null && !gwName.isEmpty()) systemUser.setName(gwName);
                if (gwCorpId != null && !gwCorpId.isEmpty()) systemUser.setCorpId(gwCorpId);
                if (gwDeptName != null && !gwDeptName.isEmpty()) systemUser.setDeptName(gwDeptName);
                if (gwEmail != null && !gwEmail.isEmpty()) systemUser.setEmail(gwEmail);
                userRepository.save(systemUser);
            } else {
                // 로컬 DB에 아직 없는 그룹웨어 사원이면 자동 동기화 등록 (승인완료 상태)
                systemUser = User.builder()
                        .username(username)
                        .password(passwordEncoder.encode(password))
                        .name(gwName != null && !gwName.isEmpty() ? gwName : username)
                        .email(gwEmail != null ? gwEmail : (username + "@sae-a.com"))
                        .corpId(gwCorpId != null && !gwCorpId.isEmpty() ? gwCorpId : "글로벌세아")
                        .deptName(gwDeptName != null && !gwDeptName.isEmpty() ? gwDeptName : "현업부서")
                        .role(UserRole.DEPT_MEMBER)
                        .approvalStatus("APPROVED")
                        .isOtpRegistered(false)
                        .enabled(true)
                        .build();
                userRepository.save(systemUser);
                log.info("그룹웨어 계정 로컬 DB 신규 동기화 완료: {}", username);
            }
        } else {
            // 2-B. 그룹웨어 SP에서 조회가 되지 않은 경우 -> 기본 사용자 계정관리(CAPS_USERS)에서 확인
            log.info("그룹웨어 SP 미조회 -> 기본 사용자 계정관리(CAPS_USERS)에서 확인 진행: 사용자={}", username);
            systemUser = userRepository.findByUsername(username)
                    .orElseThrow(() -> new BadCredentialsException("등록되지 않은 사용자 ID이거나 비밀번호가 일치하지 않습니다."));

            // 기본 사용자 계정관리 비밀번호 일치 검증 (BCrypt 검증 및 평문 하위호환)
            boolean passwordMatches = false;
            if (systemUser.getPassword() != null) {
                if (passwordEncoder.matches(password, systemUser.getPassword())) {
                    passwordMatches = true;
                } else if (password.equals(systemUser.getPassword())) {
                    // 평문으로 저장된 레코드인 경우 BCrypt 암호화 업그레이드
                    passwordMatches = true;
                    systemUser.setPassword(passwordEncoder.encode(password));
                    userRepository.save(systemUser);
                }
            }

            if (!passwordMatches) {
                throw new BadCredentialsException("비밀번호가 일치하지 않습니다.");
            }
            log.info("기본 사용자 계정관리(CAPS_USERS) 인증 성공: 사용자={}, 역할={}", username, systemUser.getRole());
        }

        // 3. 계정 활성화 상태 및 승인 여부 검증
        if (systemUser.getEnabled() != null && !systemUser.getEnabled()) {
            throw new DisabledException("사용 안함(비활성화) 처리된 계정입니다. 시스템 관리자에게 문의하세요.");
        }
        if ("PENDING".equals(systemUser.getApprovalStatus())) {
            throw new DisabledException("관리자의 승인을 기다리는 중인 계정입니다.");
        } else if ("REJECTED".equals(systemUser.getApprovalStatus())) {
            throw new DisabledException("가입이 거절된 계정입니다. 시스템 관리자에게 문의하세요.");
        }

        // CustomUserInfo 생성 및 인증 토큰 반환
        CustomUserInfo userInfo = new CustomUserInfo(
                systemUser.getUsername(),
                systemUser.getRole().name(),
                systemUser.getCorpId(),
                systemUser.getDeptName(),
                systemUser.getName(),
                false // 1차 로그인 성공 상태
        );

        return new UsernamePasswordAuthenticationToken(
                userInfo,
                password,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + systemUser.getRole().name()))
        );
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
