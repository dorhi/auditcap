package com.example.cap.service;

import com.example.cap.entity.Finding;
import com.example.cap.entity.FindingHistory;
import com.example.cap.entity.Project;
import com.example.cap.entity.UserRole;
import com.example.cap.repository.FindingHistoryRepository;
import com.example.cap.repository.FindingRepository;
import com.example.cap.repository.ProjectRepository;
import com.example.cap.security.CustomUserInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FindingService {

    private final FindingRepository findingRepository;
    private final FindingHistoryRepository findingHistoryRepository;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;

    /**
     * 감사팀(시스템관리자, 감사책임자, 감사담당자) 여부 확인
     */
    private boolean isAuditTeam(String roleStr) {
        return projectService.isAuditTeam(roleStr);
    }

    /**
     * 감사팀 또는 경영진 여부 확인 (전체 조회 가능)
     */
    private boolean isAuditTeamOrExec(String roleStr) {
        return projectService.isAuditTeamOrExec(roleStr);
    }

    /**
     * 히스토리 기록 헬퍼
     */
    private void recordHistory(Finding finding, String actionType, String comment, CustomUserInfo userInfo) {
        try {
            FindingHistory history = FindingHistory.builder()
                    .findingId(finding.getFindingId())
                    .actionType(actionType)
                    .actorId(userInfo != null ? userInfo.getUsername() : "SYSTEM")
                    .actorName(userInfo != null ? userInfo.getName() : "시스템")
                    .actorRole(userInfo != null ? userInfo.getRole() : "SYSTEM")
                    .actionStatusCode(finding.getActionStatusCode())
                    .actionDeadline(finding.getActionDeadline())
                    .actionText(finding.getActionText())
                    .comment(comment)
                    .createdAt(LocalDateTime.now())
                    .build();
            findingHistoryRepository.save(history);
        } catch (Exception e) {
            log.error("Failed to record finding history: {}", e.getMessage());
        }
    }

    /**
     * 조치상태 코드 -> 한글명 변환
     */
    public String getActionStatusKoreanName(String code) {
        if (code == null || code.trim().isEmpty()) return "미작성";
        switch (code.trim().toUpperCase()) {
            case "NOT_WRITTEN": return "미작성";
            case "IN_PROGRESS": return "개선중";
            case "COMPLETED": return "개선완료";
            case "ACTION_IMPOSSIBLE": return "개선불가";
            case "CONTINUOUS_MANAGEMENT": return "지속관리";
            default: return code;
        }
    }

    /**
     * 발견사항(지적사항) 목록 조회 (권한별 법인 및 유관부서 격리)
     */
    @Transactional(readOnly = true)
    public List<Finding> getFindings(CustomUserInfo userInfo) {
        if (userInfo == null) return List.of();
        String role = userInfo.getRole();

        if (isAuditTeamOrExec(role)) {
            return findingRepository.findAll();
        }

        List<Finding> all = findingRepository.findAll();
        return all.stream()
                .filter(f -> projectService.isUserAccessibleProject(f.getProject(), userInfo))
                .collect(Collectors.toList());
    }

    /**
     * 발견사항 생성 (감사팀 전용) - 감사팀 예상 마감일 등록
     */
    @Transactional
    public Finding createFinding(Long projectId, String category, String title, String findingText, 
                                 String auditorsInCharge, String assignedUserId, String assignedDeptName, 
                                 String relatedDepts,
                                 LocalDateTime expectedDeadline, LocalDateTime targetDate, String targetDateText, 
                                 LocalDateTime deadline1st, LocalDateTime deadline2nd, LocalDateTime deadline3rd, 
                                 CustomUserInfo userInfo) {
        
        if (!isAuditTeam(userInfo.getRole())) {
            throw new AccessDeniedException("감사팀(시스템 관리자, 감사 책임자, 감사 담당자)만 발견사항을 등록할 수 있습니다.");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 프로젝트입니다. ID: " + projectId));

        if ("FREEZE".equals(project.getProjectState())) {
            throw new IllegalStateException("해당 프로젝트는 이미 최종 승인(완료)되어 신규 지적사항을 등록할 수 없습니다.");
        }

        // 감사팀 예상 마감일 동기화 (expectedDeadline 또는 targetDate 또는 deadline1st)
        LocalDateTime expDeadline = expectedDeadline != null ? expectedDeadline 
                : (deadline1st != null ? deadline1st : targetDate);

        Finding finding = Finding.builder()
                .project(project)
                .category(category)
                .title(title)
                .findingText(findingText)
                .auditorsInCharge(auditorsInCharge)
                .assignedUserId(assignedUserId)
                .assignedDeptName(assignedDeptName)
                .relatedDepts(relatedDepts)
                .expectedDeadline(expDeadline)
                .targetDate(expDeadline)
                .targetDateText(targetDateText)
                .deadline1st(expDeadline)
                .deadline2nd(deadline2nd)
                .deadline3rd(deadline3rd)
                .actionStatusCode("IN_PROGRESS")
                .findingState("OPEN")
                .approvalStatus("DRAFT")
                .build();

        Finding saved = findingRepository.save(finding);
        recordHistory(saved, "CREATE_CAP", "감사팀에 의한 CAP 등록 완료 (예상 마감일: " + (expDeadline != null ? expDeadline.toLocalDate() : "미지정") + ")", userInfo);
        return saved;
    }

    /**
     * 감사팀용 발견사항(CAP) 정보 수정
     * - 감사담당자/감사책임자는 조건(조치 작성 여부, 결재 진행 상태, 프로젝트 완료 여부 등)에 관계없이
     *   언제든지 유관부서 및 법인 담당자를 추가/변경할 수 있음.
     */
    @Transactional
    public Finding updateFinding(Long findingId, String category, String title, String findingText,
                                 String auditorsInCharge, String assignedUserId, String assignedDeptName,
                                 String relatedDepts,
                                 LocalDateTime expectedDeadline, LocalDateTime targetDate, String targetDateText,
                                 LocalDateTime deadline1st, LocalDateTime deadline2nd, LocalDateTime deadline3rd,
                                 CustomUserInfo userInfo) {
        if (!isAuditTeam(userInfo.getRole())) {
            throw new AccessDeniedException("감사팀(시스템 관리자, 감사 책임자, 감사 담당자)만 발견사항을 수정할 수 있습니다.");
        }

        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지적사항입니다. ID: " + findingId));

        LocalDateTime expDeadline = expectedDeadline != null ? expectedDeadline 
                : (deadline1st != null ? deadline1st : targetDate);

        boolean isAssignmentChanged = (assignedUserId != null && !assignedUserId.equals(finding.getAssignedUserId()))
                || (assignedDeptName != null && !assignedDeptName.equals(finding.getAssignedDeptName()))
                || (relatedDepts != null && !relatedDepts.equals(finding.getRelatedDepts()));

        // 감사팀의 법인 담당자 및 유관부서 변경은 조건 없이 언제든지 반영
        finding.setAssignedUserId(assignedUserId);
        finding.setAssignedDeptName(assignedDeptName);
        finding.setRelatedDepts(relatedDepts);

        // 기본 정보(카테고리, 제목, 내용 등) 업데이트
        if (category != null && !category.isEmpty()) finding.setCategory(category);
        if (title != null && !title.isEmpty()) finding.setTitle(title);
        if (findingText != null) finding.setFindingText(findingText);
        if (auditorsInCharge != null) finding.setAuditorsInCharge(auditorsInCharge);
        if (expDeadline != null) {
            finding.setExpectedDeadline(expDeadline);
            finding.setTargetDate(expDeadline);
            finding.setDeadline1st(expDeadline);
        }
        if (targetDateText != null) finding.setTargetDateText(targetDateText);
        if (deadline2nd != null) finding.setDeadline2nd(deadline2nd);
        if (deadline3rd != null) finding.setDeadline3rd(deadline3rd);

        Finding saved = findingRepository.save(finding);
        
        String historyComment = isAssignmentChanged
                ? "감사팀에 의한 담당자/유관부서 변경 (담당자: " + assignedUserId + ", 부서: " + assignedDeptName + (relatedDepts != null ? ", 유관부서: " + relatedDepts : "") + ")"
                : "감사팀에 의한 CAP 정보 수정";
        recordHistory(saved, "UPDATE_CAP", historyComment, userInfo);
        return saved;
    }

    /**
     * 법인담당자: 조치내역 및 마감기한, 개선완료일자, 조치상태 코드 작성/임시저장
     */
    @Transactional
    public Finding updateFindingAction(Long findingId, String actionText, LocalDateTime actionDeadline, 
                                       LocalDateTime completionDate, String actionStatusCode, CustomUserInfo userInfo) {
        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지적사항입니다. ID: " + findingId));

        Project project = finding.getProject();
        if ("FREEZE".equals(project.getProjectState())) {
            throw new IllegalStateException("완료(Completion)된 프로젝트의 지적사항은 수정할 수 없습니다.");
        }

        // 권한 검증
        if (!isAuditTeam(userInfo.getRole())) {
            if (!projectService.isUserAccessibleProject(project, userInfo)) {
                throw new AccessDeniedException("접근 권한이 없는 프로젝트의 지적사항입니다.");
            }
            if ("PENDING_AUDIT".equals(finding.getApprovalStatus())) {
                throw new IllegalStateException("감사실에 제출되어 검증이 진행 중인 지적사항은 수정할 수 없습니다.");
            }
            if ("AUDIT_CONFIRMED".equals(finding.getApprovalStatus())) {
                throw new IllegalStateException("이미 감사실 검증이 최종 완료된 지적사항은 수정할 수 없습니다.");
            }
        }

        String targetStatus = (actionStatusCode != null && !actionStatusCode.trim().isEmpty()) 
                ? actionStatusCode.trim() : finding.getActionStatusCode();

        // 상태별 필수값 및 제약조건 비즈니스 룰 검증
        if ("IN_PROGRESS".equalsIgnoreCase(targetStatus)) {
            if (actionDeadline == null && finding.getActionDeadline() == null) {
                throw new IllegalArgumentException("'개선중' 상태는 '개선 예상 시기' 날짜가 반드시 입력되어야 합니다.");
            }
        } else if ("COMPLETED".equalsIgnoreCase(targetStatus)) {
            if (completionDate == null && finding.getCompletionDate() == null) {
                throw new IllegalArgumentException("'개선완료' 상태는 '개선완료일자'가 반드시 입력되어야 합니다.");
            }
            if ((actionText == null || actionText.trim().isEmpty()) && (finding.getActionText() == null || finding.getActionText().trim().isEmpty())) {
                throw new IllegalArgumentException("'개선완료' 상태는 개선내용(답변)이 반드시 작성되어야 합니다.");
            }
            finding.setCompletionDate(completionDate != null ? completionDate : finding.getCompletionDate());
        } else if ("ACTION_IMPOSSIBLE".equalsIgnoreCase(targetStatus) || "CONTINUOUS_MANAGEMENT".equalsIgnoreCase(targetStatus)) {
            // 개선불가 / 업무개선 후 지속관리는 완료일 입력 불가 (null 처리)
            finding.setCompletionDate(null);
        }

        finding.setActionText(actionText);
        if (actionDeadline != null) {
            finding.setActionDeadline(actionDeadline);
        }
        if (targetStatus != null) {
            finding.setActionStatusCode(targetStatus);
        }

        // 반려(재수정 요청) 상태에서 수정 시 DRAFT(작성중)로 상태 복귀
        if ("REJECTED_LEAD".equals(finding.getApprovalStatus()) || "REJECTED_AUDIT".equals(finding.getApprovalStatus())) {
            finding.setApprovalStatus("DRAFT");
        }

        Finding saved = findingRepository.save(finding);
        recordHistory(saved, "SAVE_DRAFT", "조치내역 임시저장 (상태: " + getActionStatusKoreanName(saved.getActionStatusCode()) + ")", userInfo);
        return saved;
    }

    // 하위 호환용 오버로딩 (기존 호출 지원)
    @Transactional
    public Finding updateFindingAction(Long findingId, String actionText, LocalDateTime actionDeadline, 
                                       String actionStatusCode, CustomUserInfo userInfo) {
        return updateFindingAction(findingId, actionText, actionDeadline, null, actionStatusCode, userInfo);
    }

    /**
     * [결재선 1단계] 법인담당자 CONFIRM (상신)
     * - DRAFT 상태의 건을 대표담당자에게 승인 요청 (PENDING_LEAD)
     */
    @Transactional
    public Finding confirmMember(Long findingId, String comment, CustomUserInfo userInfo) {
        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지적사항입니다. ID: " + findingId));

        if ("FREEZE".equals(finding.getProject().getProjectState())) {
            throw new IllegalStateException("완료(Completion)된 프로젝트입니다.");
        }

        if (finding.getActionText() == null || finding.getActionText().trim().isEmpty()) {
            throw new IllegalArgumentException("조치내역을 먼저 작성해야 CONFIRM(상신)할 수 있습니다.");
        }

        if ("NOT_WRITTEN".equalsIgnoreCase(finding.getActionStatusCode())) {
            throw new IllegalArgumentException("'미작성' 상태에서는 상신할 수 없습니다. 조치 상태(개선중/개선완료 등)를 선택하고 입력해 주세요.");
        }
        if ("IN_PROGRESS".equalsIgnoreCase(finding.getActionStatusCode()) && finding.getActionDeadline() == null) {
            throw new IllegalArgumentException("'개선중' 상태는 '개선 예상 시기' 날짜가 필수입니다.");
        }
        if ("COMPLETED".equalsIgnoreCase(finding.getActionStatusCode()) && finding.getCompletionDate() == null) {
            throw new IllegalArgumentException("'개선완료' 상태는 '개선완료일자'가 필수입니다.");
        }

        LocalDateTime now = LocalDateTime.now();
        finding.setApprovalStatus("PENDING_LEAD");
        finding.setLastSubmittedBy(userInfo.getUsername() + " (" + userInfo.getName() + ")");
        finding.setLastSubmittedAt(now);
        finding.setRejectedReason(null);

        Finding saved = findingRepository.save(finding);
        recordHistory(saved, "CONFIRM_MEMBER", comment != null && !comment.trim().isEmpty() ? comment.trim() : "법인담당자 조치 완료 및 대표담당자 확인 요청 (CONFIRM)", userInfo);
        return saved;
    }

    /**
     * [결재선 2단계-1] 법인 대표담당자 CONFIRM (승인)
     * - PENDING_LEAD 상태 건을 감사실 검증 요청 (PENDING_AUDIT)
     */
    @Transactional
    public Finding confirmLead(Long findingId, String comment, CustomUserInfo userInfo) {
        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지적사항입니다. ID: " + findingId));

        if ("FREEZE".equals(finding.getProject().getProjectState())) {
            throw new IllegalStateException("완료(Completion)된 프로젝트입니다.");
        }

        String role = userInfo.getRole();
        boolean canConfirm = UserRole.LEAD_REP.name().equals(role) || isAuditTeam(role);
        if (!canConfirm) {
            throw new AccessDeniedException("법인 대표담당자(LEAD_REP)만 CONFIRM 처리할 수 있습니다.");
        }

        if ("AUDIT_CONFIRMED".equals(finding.getApprovalStatus())) {
            throw new IllegalStateException("이미 감사실 검증이 최종 완료된 지적사항입니다.");
        }
        if ("PENDING_AUDIT".equals(finding.getApprovalStatus()) && !isAuditTeam(role)) {
            throw new IllegalStateException("이미 감사실 검증 대기 상태입니다.");
        }
        if (finding.getActionStatusCode() == null || "UNWRITTEN".equalsIgnoreCase(finding.getActionStatusCode())) {
            throw new IllegalStateException("조치 상태가 입력되지 않은 건은 제출할 수 없습니다. 조치 상태 및 내용을 먼저 입력해 주세요.");
        }

        LocalDateTime now = LocalDateTime.now();
        finding.setApprovalStatus("PENDING_AUDIT");
        finding.setLeadApprovedBy(userInfo.getUsername() + " (" + userInfo.getName() + ")");
        finding.setLeadApprovedAt(now);
        finding.setLeadComment(comment);
        finding.setRejectedReason(null);

        Finding saved = findingRepository.save(finding);
        recordHistory(saved, "CONFIRM_LEAD", comment != null && !comment.trim().isEmpty() ? comment.trim() : "법인 대표담당자 CONFIRM (감사팀 제출)", userInfo);
        return saved;
    }

    /**
     * [결재선 2단계-2] 법인 대표담당자 재수정 요청 (반려)
     * - PENDING_LEAD 상태 건을 법인담당자에게 재수정 요청 (REJECTED_LEAD)
     */
    @Transactional
    public Finding rejectLead(Long findingId, String reason, CustomUserInfo userInfo) {
        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지적사항입니다. ID: " + findingId));

        if ("FREEZE".equals(finding.getProject().getProjectState())) {
            throw new IllegalStateException("완료(Completion)된 프로젝트입니다.");
        }

        String role = userInfo.getRole();
        boolean canReject = UserRole.LEAD_REP.name().equals(role) || isAuditTeam(role);
        if (!canReject) {
            throw new AccessDeniedException("법인 대표담당자만 재수정 요청을 할 수 있습니다.");
        }

        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("재수정 요청 사유를 반드시 입력해야 합니다.");
        }

        finding.setApprovalStatus("REJECTED_LEAD");
        finding.setRejectedReason("[대표담당자 재수정 요청] " + reason.trim());

        Finding saved = findingRepository.save(finding);
        recordHistory(saved, "REJECT_LEAD", reason.trim(), userInfo);
        return saved;
    }

    /**
     * [결재선 3단계-1] 감사담당자 CONFIRM (해당 CAP 종료)
     * - PENDING_AUDIT 상태 건에 대해 조치 완료 승인 (AUDIT_CONFIRMED)
     */
    @Transactional
    public Finding confirmAudit(Long findingId, String comment, CustomUserInfo userInfo) {
        if (!isAuditTeam(userInfo.getRole())) {
            throw new AccessDeniedException("감사팀(시스템 관리자, 감사 책임자, 감사 담당자)만 CONFIRM을 처리할 수 있습니다.");
        }

        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지적사항입니다. ID: " + findingId));

        LocalDateTime now = LocalDateTime.now();
        finding.setApprovalStatus("AUDIT_CONFIRMED");
        finding.setFindingState("APPROVED");
        finding.setActionStatusCode("COMPLETED");
        finding.setAuditReviewedBy(userInfo.getUsername() + " (" + userInfo.getName() + ")");
        finding.setAuditReviewedAt(now);
        finding.setAuditReviewComment(comment);
        finding.setRejectedReason(null);

        Finding saved = findingRepository.save(finding);
        recordHistory(saved, "CONFIRM_AUDIT", comment != null && !comment.trim().isEmpty() ? comment.trim() : "감사담당자 조치 검증 완료 (해당 CAP 종료)", userInfo);
        return saved;
    }

    /**
     * [결재선 3단계-2] 감사담당자 재작성 요청 (보완 요청/반려)
     * - PENDING_AUDIT 상태 건에 대해 내용 불충분 판단 시 다시 작성을 요청 (REJECTED_AUDIT)
     */
    @Transactional
    public Finding rejectAudit(Long findingId, String reason, CustomUserInfo userInfo) {
        if (!isAuditTeam(userInfo.getRole())) {
            throw new AccessDeniedException("감사팀만 재작성 요청(보완)을 할 수 있습니다.");
        }

        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지적사항입니다. ID: " + findingId));

        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("재작성 요청(보완) 사유를 반드시 입력해야 합니다.");
        }

        finding.setApprovalStatus("REJECTED_AUDIT");
        finding.setRejectedReason("[감사담당자 재작성 요청] " + reason.trim());

        Finding saved = findingRepository.save(finding);
        recordHistory(saved, "REJECT_AUDIT", reason.trim(), userInfo);
        return saved;
    }

    /**
     * 유관부서(DEPT_MEMBER) 내용 추가 기능
     */
    @Transactional
    public Finding addDeptContent(Long findingId, String additionalContent, CustomUserInfo userInfo) {
        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지적사항입니다. ID: " + findingId));

        Project project = finding.getProject();
        if ("FREEZE".equals(project.getProjectState())) {
            throw new IllegalStateException("완료(Completion)된 프로젝트에는 내용을 추가할 수 없습니다.");
        }

        if (additionalContent == null || additionalContent.trim().isEmpty()) {
            throw new IllegalArgumentException("추가할 내용을 입력해 주세요.");
        }

        String deptTag = userInfo.getDeptName() != null ? userInfo.getDeptName() : "유관부서";
        String userName = userInfo.getName() != null ? userInfo.getName() : userInfo.getUsername();
        String currentText = finding.getActionText() != null ? finding.getActionText() : "";

        // 기존 조치내역에 형식화하여 추가 첨언
        String appendBlock = String.format(
                "<br/><p style='color: #1e40af; background: #eff6ff; padding: 8px 12px; border-left: 4px solid #3b82f6; border-radius: 4px;'>" +
                "<strong>[유관부서 협조 의견 - %s (%s)]</strong><br/>%s</p>",
                userName, deptTag, additionalContent.trim()
        );

        finding.setActionText(currentText + appendBlock);
        Finding saved = findingRepository.save(finding);
        recordHistory(saved, "ADD_DEPT_CONTENT", additionalContent.trim(), userInfo);
        return saved;
    }

    /**
     * 특정 CAP의 조치 및 검토 이력 타임라인 조회
     */
    @Transactional(readOnly = true)
    public List<FindingHistory> getFindingHistories(Long findingId) {
        return findingHistoryRepository.findAllByFindingIdOrderByCreatedAtAsc(findingId);
    }

    /**
     * 하위 호환용 requestApproval
     */
    @Transactional
    public Finding requestApproval(Long findingId, String comment, CustomUserInfo userInfo) {
        String role = userInfo.getRole();
        if (UserRole.MEMBER.name().equals(role) || UserRole.DEPT_MEMBER.name().equals(role)) {
            return confirmMember(findingId, comment, userInfo);
        } else if (UserRole.LEAD_REP.name().equals(role)) {
            return confirmLead(findingId, comment, userInfo);
        } else if (isAuditTeam(role)) {
            return confirmAudit(findingId, comment, userInfo);
        }
        return confirmMember(findingId, comment, userInfo);
    }

    /**
     * 하위 호환용 approveFinding
     */
    @Transactional
    public Finding approveFinding(Long findingId, String comment, CustomUserInfo userInfo) {
        String role = userInfo.getRole();
        if (UserRole.LEAD_REP.name().equals(role)) {
            return confirmLead(findingId, comment, userInfo);
        } else if (isAuditTeam(role)) {
            return confirmAudit(findingId, comment, userInfo);
        }
        return confirmLead(findingId, comment, userInfo);
    }

    /**
     * 하위 호환용 rejectFinding
     */
    @Transactional
    public Finding rejectFinding(Long findingId, String reason, CustomUserInfo userInfo) {
        String role = userInfo.getRole();
        if (UserRole.LEAD_REP.name().equals(role)) {
            return rejectLead(findingId, reason, userInfo);
        } else if (isAuditTeam(role)) {
            return rejectAudit(findingId, reason, userInfo);
        }
        return rejectLead(findingId, reason, userInfo);
    }

    /**
     * 발견사항 삭제 (감사팀 전용)
     */
    @Transactional
    public void deleteFinding(Long findingId, CustomUserInfo userInfo) {
        if (!isAuditTeam(userInfo.getRole())) {
            throw new AccessDeniedException("감사팀만 발견사항을 삭제할 수 있습니다.");
        }

        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 지적사항입니다. ID: " + findingId));

        if ("FREEZE".equals(finding.getProject().getProjectState())) {
            throw new IllegalStateException("완료(Completion)된 프로젝트의 발견사항은 삭제할 수 없습니다.");
        }

        findingRepository.delete(finding);
    }
}
