package com.example.cap.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "CAPS_ACCESS_LOGS", indexes = {
        @Index(name = "IDX_ACCESS_LOGS_CREATED_AT", columnList = "created_at"),
        @Index(name = "IDX_ACCESS_LOGS_TYPE", columnList = "log_type"),
        @Index(name = "IDX_ACCESS_LOGS_USERNAME", columnList = "username"),
        @Index(name = "IDX_ACCESS_LOGS_STATUS", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;

    // 로그 유형: LOGIN (로그인 시도), PAGE_ACCESS (화면 접속), LOGOUT (로그아웃)
    @Column(name = "log_type", nullable = false, length = 30)
    private String logType;

    // 시도 또는 접속한 사용자 ID
    @Column(name = "username", length = 50)
    private String username;

    // 사용자 성명
    @Column(name = "user_name", columnDefinition = "NVARCHAR(50)")
    private String userName;

    // 소속 법인
    @Column(name = "corp_id", length = 50)
    private String corpId;

    // 담당 부서명
    @Column(name = "dept_name", columnDefinition = "NVARCHAR(100)")
    private String deptName;

    // 권한/역할 (SYSTEM_ADMIN, AUDIT_LEADER, MEMBER 등)
    @Column(name = "role", length = 30)
    private String role;

    // 접근 대상 메뉴/화면 코드 (예: ACTION_PLAN_INPUT, FINDING_MANAGEMENT 등)
    @Column(name = "target_menu_code", length = 50)
    private String targetMenuCode;

    // 접근 대상 메뉴/화면명 (예: "감사 조치계획 & 필수 정보 입력")
    @Column(name = "target_menu_name", columnDefinition = "NVARCHAR(100)")
    private String targetMenuName;

    // 상세 작업 내용
    @Column(name = "action_details", columnDefinition = "NVARCHAR(500)")
    private String actionDetails;

    // 결과 상태: SUCCESS (성공), FAILED (실패)
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    // 실패 사유 (비밀번호 불일치, 등록되지 않은 ID, 미승인 계정 등)
    @Column(name = "failure_reason", columnDefinition = "NVARCHAR(500)")
    private String failureReason;

    // 접속 IP 주소
    @Column(name = "client_ip", length = 50)
    private String clientIp;

    // 브라우저 및 클라이언트 기기 정보
    @Column(name = "user_agent", columnDefinition = "NVARCHAR(300)")
    private String userAgent;

    // 발생 일시
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = "SUCCESS";
        }
    }

    public Long getLogId() { return logId; }
    public String getLogType() { return logType; }
    public String getUsername() { return username; }
    public String getUserName() { return userName; }
    public String getCorpId() { return corpId; }
    public String getDeptName() { return deptName; }
    public String getRole() { return role; }
    public String getTargetMenuCode() { return targetMenuCode; }
    public String getTargetMenuName() { return targetMenuName; }
    public String getActionDetails() { return actionDetails; }
    public String getStatus() { return status; }
    public String getFailureReason() { return failureReason; }
    public String getClientIp() { return clientIp; }
    public String getUserAgent() { return userAgent; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
