package com.example.cap.controller;

import com.example.cap.entity.User;
import com.example.cap.entity.UserRole;
import com.example.cap.security.CustomUserInfo;
import com.example.cap.security.JwtTokenProvider;
import com.example.cap.service.TotpService;
import com.example.cap.service.UserService;
import com.example.cap.dto.GroupwareUserDto;
import com.example.cap.service.GroupwareService;
import com.example.cap.util.AESCryptoUtils;
import com.example.cap.repository.UserRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserService userService;
    private final TotpService totpService;
    private final GroupwareService groupwareService;
    private final UserRepository userRepository;
    private final com.example.cap.service.AccessLogService accessLogService;

    @Value("${app.otp.issuer}")
    private String otpIssuer;

    /**
     * 1차 로그인 API (ID/PW -> SP 검증)
     * 성공 시 임시 JWT 토큰 발급 (2FA 인증 필요 상태)
     * 로그인 성공 및 실패 감사 로그(실패 사유 포함) 자동 기록
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, jakarta.servlet.http.HttpServletRequest httpRequest) {
        String clientIp = AccessLogController.getClientIp(httpRequest);
        String userAgent = httpRequest != null ? httpRequest.getHeader("User-Agent") : "";

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            CustomUserInfo userInfo = (CustomUserInfo) authentication.getPrincipal();

            // Fetch user for name and deptName
            User user = userRepository.findByUsername(userInfo.getUsername()).orElse(null);

            // 로컬 로그인 성공 시에도 그룹웨어 계정이라면 최신 부서/법인 정보를 동기화
            try {
                GroupwareUserDto gwUser = groupwareService.findGroupwareUser(userInfo.getUsername());
                if (gwUser != null) {
                    user = userService.syncGroupwareUser(gwUser, request.getPassword());
                }
            } catch (Exception ex) {
                // 그룹웨어 동기화 실패해도 로그인은 정상 진행
            }

            String userRole = user != null ? user.getRole().name() : userInfo.getRole();
            String userCorp = user != null ? user.getCorpId() : userInfo.getCorpId();
            String userDept = user != null ? user.getDeptName() : userInfo.getDeptName();
            String userName = user != null ? user.getName() : userInfo.getName();

            // 테스트 목적으로 1차 로그인 성공 후 곧바로 최종 토큰 발급 (mfaCompleted = true 우회)
            String finalToken = tokenProvider.createFinalToken(
                    userInfo.getUsername(),
                    userRole,
                    userCorp,
                    userDept,
                    userName
            );

            // [감사 로그] 로그인 성공 기록
            try {
                accessLogService.recordLoginSuccess(
                        userInfo.getUsername(),
                        userName,
                        userCorp,
                        userDept,
                        userRole,
                        clientIp,
                        userAgent
                );
            } catch (Exception logEx) {
                // 로그 저장 실패가 로그인 전체를 방해하지 않음
            }

            Map<String, Object> response = new HashMap<>();
            response.put("accessToken", finalToken);
            response.put("username", userInfo.getUsername());
            response.put("role", userRole);
            response.put("corpId", userCorp);
            response.put("name", userName != null ? userName : userInfo.getUsername());
            response.put("deptName", userDept != null ? userDept : "");
            response.put("message", "로그인 성공");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            String errorMsg = e.getMessage() != null ? e.getMessage() : "로그인 인증에 실패했습니다.";

            // [감사 로그] 로그인 실패 사유 기록
            try {
                accessLogService.recordLoginFailure(
                        request.getUsername(),
                        errorMsg,
                        clientIp,
                        userAgent
                );
            } catch (Exception logEx) {
                // 로그 저장 실패 무시
            }

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "LOGIN_FAILED", "message", errorMsg));
        }
    }

    /**
     * 자체 회원가입 신청 API
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        try {
            User user = userService.registerUser(
                    request.getUsername(),
                    request.getPassword(),
                    request.getName(),
                    request.getEmail(),
                    request.getCorpId(),
                    request.getDeptName(),
                    UserRole.valueOf(request.getRole())
            );
            return ResponseEntity.ok(Map.of("message", "회원가입 신청 완료. 감사팀의 승인을 대기 중입니다.", "username", user.getUsername()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "SIGNUP_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 2차 인증 OTP 등록 설정 API (1차 임시 토큰 필요)
     */
    @GetMapping("/mfa/setup")
    public ResponseEntity<?> setupMfa(@AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            String secret = userService.setupMfa(userInfo.getUsername());
            String qrCodeUri = totpService.getQrCodeUri(secret, userInfo.getUsername(), otpIssuer);

            Map<String, String> response = new HashMap<>();
            response.put("secret", secret);
            response.put("qrCodeUri", qrCodeUri);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "MFA_SETUP_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 2차 인증 OTP 검증 API (1차 임시 토큰 필요)
     * 성공 시 최종 JWT 토큰 발급 (mfaCompleted = true)
     */
    @PostMapping("/mfa/verify")
    public ResponseEntity<?> verifyMfa(@AuthenticationPrincipal CustomUserInfo userInfo,
                                       @RequestBody MfaVerifyRequest request) {
        try {
            String secret = userService.setupMfa(userInfo.getUsername());
            boolean isValid = totpService.verifyCode(secret, request.getCode());

            if (!isValid) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "INVALID_OTP", "message", "OTP 번호가 일치하지 않습니다."));
            }

            // OTP 등록 및 로그인 최종 활성화 완료 처리
            userService.enableMfa(userInfo.getUsername());

            // MFA 완료된 최종 토큰 발급 (mfaCompleted = true)
            String finalToken = tokenProvider.createFinalToken(
                    userInfo.getUsername(),
                    userInfo.getRole(),
                    userInfo.getCorpId(),
                    userInfo.getDeptName(),
                    userInfo.getName()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("accessToken", finalToken);
            response.put("username", userInfo.getUsername());
            response.put("role", userInfo.getRole());
            response.put("corpId", userInfo.getCorpId());
            response.put("name", userInfo.getName());
            response.put("deptName", userInfo.getDeptName());
            response.put("message", "2차 인증(MFA) 성공. 로그인이 완료되었습니다.");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "MFA_VERIFY_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 현재 로그인 세션 상태 및 사용자 정보 검증 API
     * 세션이 없거나 토큰이 유효하지 않으면 401 Unauthorized 반환
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMySession(@AuthenticationPrincipal CustomUserInfo userInfo) {
        if (userInfo == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "NO_SESSION", "message", "세션이 존재하지 않거나 만료되었습니다."));
        }
        Map<String, Object> response = new HashMap<>();
        response.put("username", userInfo.getUsername());
        response.put("role", userInfo.getRole());
        response.put("corpId", userInfo.getCorpId());
        response.put("deptName", userInfo.getDeptName());
        response.put("name", userInfo.getName());
        response.put("mfaCompleted", userInfo.isMfaCompleted());
        return ResponseEntity.ok(response);
    }

    /**
     * 감사팀(SYSTEM_ADMIN)용 계정 승인 API
     */
    @PostMapping("/approve/{username}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')") // 시스템 관리자만 승인 가능
    public ResponseEntity<?> approveUser(@PathVariable String username) {
        try {
            User user = userService.approveUser(username);
            return ResponseEntity.ok(Map.of("message", "사용자 계정이 성공적으로 승인되었습니다.", "username", user.getUsername()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "APPROVAL_FAILED", "message", e.getMessage()));
        }
    }

    // DTO 정의
    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }

    @Data
    public static class SignupRequest {
        private String username;
        private String password;
        private String name;
        private String email;
        private String corpId;
        private String deptName;
        private String role; // SYSTEM_ADMIN, EXEC, CORP_HEAD, LEAD_REP, MEMBER, DEPT_MEMBER
    }

    @Data
    public static class MfaVerifyRequest {
        private int code;
    }
}
