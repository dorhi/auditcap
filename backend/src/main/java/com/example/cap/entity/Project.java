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
@Table(name = "CAPS_PROJECTS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "project_id")
    private Long projectId;

    // 네이밍 규칙: 연도_법인명 (예: 2026_법인명)
    @Column(name = "project_name", nullable = false, length = 100)
    private String projectName;

    // 법인 격리용 법인 ID
    @Column(name = "corp_id", nullable = false, length = 50)
    private String corpId;

    @Column(name = "deadline_1st")
    private LocalDateTime deadline1st;

    @Column(name = "deadline_2nd")
    private LocalDateTime deadline2nd;

    @Column(name = "deadline_3rd")
    private LocalDateTime deadline3rd;

    // 접근 허용 유관부서 목록 (쉼표 구분, 예: 'IT지원부,인사팀,구매팀')
    @Column(name = "assigned_depts", columnDefinition = "NVARCHAR(500)")
    private String assignedDepts;

    // 프로젝트 상태 (예: OPEN, FREEZE, CLOSED)
    @Column(name = "project_state", nullable = false, length = 20)
    private String projectState;

    @Column(name = "created_by", nullable = false, length = 50)
    private String createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 감사팀 승인 진행 상태: PENDING_AUDIT (대기), HEAD_CONFIRMED (법인장 최종확정), AUDITOR_CONFIRMED (감사담당자 확인), LEADER_APPROVED (감사책임자 최종승인), AUDIT_REJECTED (반려/보완)
    @Column(name = "audit_approval_status", length = 30)
    private String auditApprovalStatus;

    // 법인장 최종 확정 정보
    @Column(name = "head_confirmed_by", length = 50)
    private String headConfirmedBy;

    @Column(name = "head_confirmed_at")
    private LocalDateTime headConfirmedAt;

    @Column(name = "head_comment", columnDefinition = "NVARCHAR(500)")
    private String headComment;

    // 감사 담당자 확인 정보
    @Column(name = "auditor_reviewed_by", length = 50)
    private String auditorReviewedBy;

    @Column(name = "auditor_reviewed_at")
    private LocalDateTime auditorReviewedAt;

    @Column(name = "auditor_comment", columnDefinition = "NVARCHAR(500)")
    private String auditorComment;

    // 감사 책임자 최종 승인 정보
    @Column(name = "audit_leader_approved_by", length = 50)
    private String auditLeaderApprovedBy;

    @Column(name = "audit_leader_approved_at")
    private LocalDateTime auditLeaderApprovedAt;

    @Column(name = "audit_leader_comment", columnDefinition = "NVARCHAR(500)")
    private String auditLeaderComment;

    // 감사팀 반려/보완요청 사유
    @Column(name = "audit_rejected_reason", columnDefinition = "NVARCHAR(500)")
    private String auditRejectedReason;

    // 동결(FREEZE) 프로젝트 기반 차기 프로젝트 연계 필드
    @Column(name = "parent_project_id")
    private Long parentProjectId;

    @Column(name = "parent_project_name", length = 100)
    private String parentProjectName;

    // 프로젝트 차수 (기본 1)
    @Column(name = "round")
    private Integer round;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.projectState == null) {
            this.projectState = "OPEN";
        }
        if (this.auditApprovalStatus == null) {
            this.auditApprovalStatus = "PENDING_AUDIT";
        }
        if (this.round == null) {
            this.round = 1;
        }
    }
}
