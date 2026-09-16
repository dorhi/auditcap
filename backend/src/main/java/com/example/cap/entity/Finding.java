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
@Table(name = "CAPS_FINDINGS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Finding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "finding_id")
    private Long findingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    // 카테고리 (4가지 분류: 예 - 재무, 운영, IT, 컴플라이언스 등)
    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    // Rich Text 기반 발견사항 기술 내용 (NVARCHAR(MAX) 대응)
    @Lob
    @Column(name = "finding_text", columnDefinition = "NVARCHAR(MAX)")
    private String findingText;

    // 담당 감사자 목록 (쉼표 구분 복수 ID, 예: AUDIT01,AUDITOR02)
    @Column(name = "auditors_in_charge", length = 500)
    private String auditorsInCharge;

    // 담당자 ID 목록 (사번 또는 아이디 - CAP 달성 피감법인 복수 담당자 지원, 예: EMP001,EMP002)
    @Column(name = "assigned_user_id", length = 500)
    private String assignedUserId;

    // 담당 부서명 목록 (복수 부서 지원, 예: 회계팀,자금팀)
    @Column(name = "assigned_dept_name", length = 500)
    private String assignedDeptName;

    // 유관부서 목록 (쉼표 구분 복수 부서명, 예: 생산관리팀,품질보증팀)
    @Column(name = "related_depts", length = 500)
    private String relatedDepts;

    // Rich Text 기반 조치내역 기술 (NVARCHAR(MAX) 대응)
    @Lob
    @Column(name = "action_text", columnDefinition = "NVARCHAR(MAX)")
    private String actionText;

    // 발견사항 조치 상태 (예: OPEN, PENDING_REVIEW, APPROVED, REJECTED)
    @Column(name = "finding_state", nullable = false, length = 30)
    private String findingState;

    // 조치 기한 (DATETIME - 하위호환용)
    @Column(name = "target_date")
    private LocalDateTime targetDate;

    // 감사팀 예상 마감일
    @Column(name = "expected_deadline")
    private LocalDateTime expectedDeadline;

    // 법인 조치 마감 기한 (법인담당자가 등록)
    @Column(name = "action_deadline")
    private LocalDateTime actionDeadline;

    // 법인 조치 상태 코드: NOT_WRITTEN(미작성), IN_PROGRESS(개선중), COMPLETED(개선완료), ACTION_IMPOSSIBLE(개선불가), CONTINUOUS_MANAGEMENT(업무개선 후 지속관리)
    @Column(name = "action_status_code", length = 50)
    private String actionStatusCode;

    // 개선완료일자 (COMPLETED 개선완료 시 필수 기입)
    @Column(name = "completion_date")
    private LocalDateTime completionDate;

    // 이전 차수 CAP 연계 ID (완료 프로젝트 승계 시)
    @Column(name = "parent_finding_id")
    private Long parentFindingId;

    // 각 CAP별 1차, 2차, 3차 조치기한 (하위호환용)
    @Column(name = "deadline_1st")
    private LocalDateTime deadline1st;

    @Column(name = "deadline_2nd")
    private LocalDateTime deadline2nd;

    @Column(name = "deadline_3rd")
    private LocalDateTime deadline3rd;

    // 현업 용어가 반영된 텍스트형 조치일정 (예: '2026년 상반기 내', '차기 시스템 오픈 시' 등)
    @Column(name = "target_date_text", length = 100)
    private String targetDateText;

    // 결재(승인) 워크플로우 상태: DRAFT, PENDING_LEAD, REJECTED_LEAD, PENDING_AUDIT, REJECTED_AUDIT, AUDIT_CONFIRMED
    @Column(name = "approval_status", length = 30)
    private String approvalStatus;

    // 대표담당자 승인 정보
    @Column(name = "lead_approved_by", length = 50)
    private String leadApprovedBy;

    @Column(name = "lead_approved_at")
    private LocalDateTime leadApprovedAt;

    @Column(name = "lead_comment", columnDefinition = "NVARCHAR(500)")
    private String leadComment;

    // 법인장 승인 정보
    @Column(name = "head_approved_by", length = 50)
    private String headApprovedBy;

    @Column(name = "head_approved_at")
    private LocalDateTime headApprovedAt;

    @Column(name = "head_comment", columnDefinition = "NVARCHAR(500)")
    private String headComment;

    // 반려 사유 (대표/법인장)
    @Column(name = "rejected_reason", columnDefinition = "NVARCHAR(500)")
    private String rejectedReason;

    // 최종 제출자 정보
    @Column(name = "last_submitted_by", length = 50)
    private String lastSubmittedBy;

    @Column(name = "last_submitted_at")
    private LocalDateTime lastSubmittedAt;

    // 감사팀 검토 및 피드백 정보
    @Column(name = "audit_review_comment", columnDefinition = "NVARCHAR(500)")
    private String auditReviewComment;

    @Column(name = "audit_reviewed_by", length = 50)
    private String auditReviewedBy;

    @Column(name = "audit_reviewed_at")
    private LocalDateTime auditReviewedAt;

    @PrePersist
    protected void onCreate() {
        if (this.findingState == null) {
            this.findingState = "OPEN";
        }
        if (this.approvalStatus == null) {
            this.approvalStatus = "DRAFT";
        }
        if (this.actionStatusCode == null) {
            this.actionStatusCode = "NOT_WRITTEN";
        }
    }
}
