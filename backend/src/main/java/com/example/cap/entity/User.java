package com.example.cap.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

@Entity
@Table(name = "CAPS_USERS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    // 사번 또는 로그인 ID
    @Column(name = "username", unique = true, nullable = false, length = 50)
    private String username;

    // 비밀번호 (자체 가입 시 사용, 그룹웨어 연동 시에는 사용하지 않을 수 있음)
    @Column(name = "password", length = 100)
    private String password;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "email", length = 100)
    private String email;

    // 소속 법인 ID (타 법인 데이터 접근 제어를 위해 필수)
    @Column(name = "corp_id", nullable = false, length = 50)
    private String corpId;

    // 소속 부서명
    @Column(name = "dept_name", length = 100)
    private String deptName;

    // 사용자 권한 (Role: 6가지)
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 30)
    private UserRole role;

    // 관리자 승인 대기 워크플로우 상태 (PENDING, APPROVED, REJECTED)
    @Column(name = "approval_status", nullable = false, length = 20)
    private String approvalStatus;

    // 2차 인증(MFA)용 Secret Key
    @Column(name = "otp_secret", length = 100)
    private String otpSecret;

    // OTP 등록 완료 여부
    @Column(name = "is_otp_registered", nullable = false)
    private Boolean isOtpRegistered;

    // 사용 여부 (사용 안함 처리용)
    @Column(name = "enabled", nullable = false)
    private Boolean enabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.approvalStatus == null) {
            this.approvalStatus = "PENDING";
        }
        if (this.isOtpRegistered == null) {
            this.isOtpRegistered = false;
        }
        if (this.enabled == null) {
            this.enabled = true;
        }
    }
}
