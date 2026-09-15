package com.example.cap.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "CAPS_FINDING_HISTORIES")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FindingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Long historyId;

    @Column(name = "finding_id", nullable = false)
    private Long findingId;

    // 작업 유형: SAVE_DRAFT, CONFIRM_MEMBER, REJECT_LEAD, CONFIRM_LEAD, REJECT_AUDIT, CONFIRM_AUDIT, ADD_DEPT_CONTENT
    @Column(name = "action_type", nullable = false, length = 50)
    private String actionType;

    // 작업자 ID (username)
    @Column(name = "actor_id", nullable = false, length = 50)
    private String actorId;

    // 작업자 성명
    @Column(name = "actor_name", length = 50)
    private String actorName;

    // 작업자 역할 (MEMBER, LEAD_REP, AUDITOR, DEPT_MEMBER, etc)
    @Column(name = "actor_role", length = 50)
    private String actorRole;

    // 당시 조치 상태 코드: IN_PROGRESS, COMPLETED, ACTION_IMPOSSIBLE
    @Column(name = "action_status_code", length = 50)
    private String actionStatusCode;

    // 당시 조치 마감 기한
    @Column(name = "action_deadline")
    private LocalDateTime actionDeadline;

    // 당시 조치 내용 (Rich Text)
    @Lob
    @Column(name = "action_text", columnDefinition = "NVARCHAR(MAX)")
    private String actionText;

    // 의견, 반려 사유, 보완 요청 내용, 유관부서 추가 의견 등
    @Column(name = "comment", columnDefinition = "NVARCHAR(1000)")
    private String comment;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
