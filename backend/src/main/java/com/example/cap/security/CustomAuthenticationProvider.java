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
import java.nio.charset.Charset;
import java.security.MessageDigest;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Types;
import java.util.Base64;
import java.util.Collections;
import java.util.HexFormat;

@Slf4j
@Component
public class CustomAuthenticationProvider implements AuthenticationProvider {

    private final DataSource dataSource;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.example.cap.service.GroupwareService groupwareService;

    public CustomAuthenticationProvider(DataSource dataSource, UserRepository userRepository, PasswordEncoder passwordEncoder, com.example.cap.service.GroupwareService groupwareService) {
        this.dataSource = dataSource;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.groupwareService = groupwareService;
    }

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String username = authentication.getName();
        String password = authentication.getCredentials() != null ? authentication.getCredentials().toString() : "";

        if (username == null || username.trim().isEmpty() || password.trim().isEmpty()) {
            throw new BadCredentialsException("아이디와 비밀번호를 모두 입력해 주세요.");
        }

        username = username.trim();

        // 1. 사내 그룹웨어 실시간 비밀번호 대조 (웹 포털 LOGIN_PWD 및 ERP Passwd)
        boolean isGroupwareValid = false;
        boolean isGroupwareEmployee = false;
        String gwCorpId = "";
        String gwDeptName = "";
        String gwName = "";
        String gwEmail = "";

        try {
            com.example.cap.dto.GroupwareUserDto gwUser = groupwareService.findGroupwareUser(username);
            boolean hasGwPw = (gwUser != null) && (
                (gwUser.getPasswd() != null && !gwUser.getPasswd().trim().isEmpty()) ||
                (gwUser.getGwLoginPwd() != null && !gwUser.getGwLoginPwd().trim().isEmpty())
            );

            if (gwUser != null && hasGwPw) {
                isGroupwareEmployee = true; // 사내 그룹웨어에 등록된 사원임!

                // 실제 사내 웹 그룹웨어 포털 비밀번호(ORG_EMPLOYEE.LOGIN_PWD) 또는 ERP 비밀번호(CD_MEMBER_V_GW.Passwd) 매칭 검증
                boolean matchWebGw = gwUser.getGwLoginPwd() != null && !gwUser.getGwLoginPwd().isEmpty()
                        && matchesGroupwarePassword(password, gwUser.getGwLoginPwd());
                boolean matchErpGw = gwUser.getPasswd() != null && !gwUser.getPasswd().isEmpty()
                        && matchesGroupwarePassword(password, gwUser.getPasswd());

                if (matchWebGw || matchErpGw) {
                    isGroupwareValid = true;
                    gwCorpId = gwUser.getCorpName() != null ? gwUser.getCorpName() : "글로벌세아";
                    gwDeptName = gwUser.getGroupName() != null ? gwUser.getGroupName() : "현업부서";
                    gwName = gwUser.getMemberName() != null ? gwUser.getMemberName() : username;
                    gwEmail = gwUser.getEmail() != null ? gwUser.getEmail() : (username + "@sae-a.com");
                    log.info("그룹웨어 실시간 사내 비밀번호 인증 성공: 사용자={} (웹GW매칭={}, ERP매칭={})", username, matchWebGw, matchErpGw);
                } else {
                    log.warn("그룹웨어 사내 비밀번호 불일치: 사용자={}", username);
                }
            }
        } catch (Exception gwEx) {
            log.warn("그룹웨어 인증 확인 중 오류: {}", gwEx.getMessage(), gwEx);
        }


        // 사내 그룹웨어에 등록된 임직원은 오직 실제 사내 비밀번호로만 로그인 가능 (임시번호/아이디동일/로컬비밀번호 우회 원천 차단)
        if (isGroupwareEmployee && !isGroupwareValid) {
            throw new BadCredentialsException("비밀번호가 일치하지 않습니다.");
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
                systemUser.setPassword(passwordEncoder.encode(password)); // 사내 비밀번호로 로컬 비밀번호도 동기화!
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
                        .role(UserRole.MEMBER) // 기본 권한: 법인 담당 (MEMBER)
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
                    .orElseThrow(() -> new BadCredentialsException("등록되지 않은 사용자 ID (존재하지 않는 계정)"));

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

    /**
     * 그룹웨어 뷰(CD_MEMBER_V_GW)의 비밀번호 해시(MD5/SHA-256 Base64 등) 일치 여부 검증
     * - 레거시 쿨웨어 표준: MD5 해시 바이너리의 Base64 인코딩 (24자리)
     * - 신규 표준: SHA-256 해시 바이너리의 Base64 인코딩 (44자리)
     * - 문자셋: UTF-8, EUC-KR, MS949, ISO-8859-1 모두 지원
     * - Hex 및 평문 하위호환 지원
     */
    public static boolean matchesGroupwarePassword(String rawPassword, String groupwareHash) {
        if (rawPassword == null || groupwareHash == null || groupwareHash.trim().isEmpty()) {
            return false;
        }

        String target = groupwareHash.replaceAll("\\s+", "");

        // 1. 평문 일치
        if (rawPassword.equals(target)) {
            return true;
        }

        try {
            Base64.Encoder b64 = Base64.getEncoder();
            String[] charsets = {"UTF-8", "EUC-KR", "MS949", "ISO-8859-1"};

            for (String csName : charsets) {
                Charset cs = Charset.forName(csName);
                byte[] bytes = rawPassword.getBytes(cs);

                // A. Base64(MD5) - 24자리 (사내 쿨웨어 표준)
                MessageDigest md5 = MessageDigest.getInstance("MD5");
                byte[] md5Bytes = md5.digest(bytes);
                String md5B64 = b64.encodeToString(md5Bytes);
                if (target.equals(md5B64)) return true;

                // B. Base64(SHA-256) - 44자리 (신규 표준)
                MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
                byte[] sha256Bytes = sha256.digest(bytes);
                String sha256B64 = b64.encodeToString(sha256Bytes);
                if (target.equals(sha256B64)) return true;

                // C. Base64(SHA-1) - 28자리
                MessageDigest sha1 = MessageDigest.getInstance("SHA-1");
                byte[] sha1Bytes = sha1.digest(bytes);
                String sha1B64 = b64.encodeToString(sha1Bytes);
                if (target.equals(sha1B64)) return true;

                // D. Hex(MD5) - 32자리
                String md5Hex = HexFormat.of().formatHex(md5Bytes);
                if (target.equalsIgnoreCase(md5Hex)) return true;

                // E. Hex(SHA-256) - 64자리
                String sha256Hex = HexFormat.of().formatHex(sha256Bytes);
                if (target.equalsIgnoreCase(sha256Hex)) return true;

                // F. Hex(MD5) 문자열을 다시 MD5한 Base64
                MessageDigest md5Second = MessageDigest.getInstance("MD5");
                String md5HexB64 = b64.encodeToString(md5Second.digest(md5Hex.getBytes(cs)));
                if (target.equals(md5HexB64)) return true;
            }
        } catch (Exception e) {
            log.warn("그룹웨어 비밀번호 매칭 계산 중 예외: {}", e.getMessage());
        }

        return false;
    }
}
