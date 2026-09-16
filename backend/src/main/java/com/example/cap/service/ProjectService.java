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
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final FindingRepository findingRepository;
    private final FindingHistoryRepository findingHistoryRepository;

    /**
     * 감사팀(시스템관리자, 감사책임자, 감사담당자) 여부 확인
     */
    public boolean isAuditTeam(String roleStr) {
        if (roleStr == null) return false;
        return UserRole.SYSTEM_ADMIN.name().equals(roleStr) ||
               UserRole.AUDIT_LEADER.name().equals(roleStr) ||
               UserRole.AUDITOR.name().equals(roleStr);
    }

    /**
     * 감사팀 또는 경영진(모든 법인 조회 가능) 여부 확인
     */
    public boolean isAuditTeamOrExec(String roleStr) {
        if (roleStr == null) return false;
        return isAuditTeam(roleStr) || UserRole.EXEC.name().equals(roleStr);
    }

    /**
     * 프로젝트 목록 조회 (권한별 법인 및 유관부서 격리)
     * 1. 시스템관리자, 감사책임자, 감사담당자, 경영진 -> 모든 법인 프로젝트 조회
     * 2. 법인장, 대표담당자, 일반담당자 -> 본인 법인(corpId) 프로젝트만 조회
     * 3. 유관부서(DEPT_MEMBER) -> 감사팀이 지정(assignedDepts)한 프로젝트만 조회
     */
    /**
     * 사용자가 해당 프로젝트에 접근(조회 및 조치) 가능한지 통합 검증
     * 1. 감사팀(시스템관리자, 감사책임자, 감사담당자) 및 경영진: 모든 프로젝트 접근 가능
     * 2. 접근 허용 사용자/부서(assignedDepts)가 지정된 경우: 지정된 사용자 ID 또는 부서만 접근 허용
     * 3. 접근 허용 사용자가 미지정된 경우: 기본 정책대로 동일 법인(corpId) 사용자에게 접근 허용 (유관부서는 미지정 시 접근 불가)
     */
    public boolean isUserAccessibleProject(Project project, CustomUserInfo userInfo) {
        if (project == null || userInfo == null) return false;
        String role = userInfo.getRole();
        if (isAuditTeamOrExec(role)) {
            return true;
        }

        String assigned = project.getAssignedDepts();
        // 1. 프로젝트에 접근 허용 사용자/부서가 지정되어 있는 경우:
        if (assigned != null && !assigned.trim().isEmpty()) {
            return isDeptAssignedToProject(project, userInfo.getDeptName(), userInfo.getUsername());
        }

        // 2. 접근 허용 사용자가 미지정된 경우 (미지정 기본 모드):
        if (UserRole.DEPT_MEMBER.name().equals(role)) {
            return false;
        }

        // 소속 법인 일치 여부 확인
        String userCorpId = userInfo.getCorpId();
        return userCorpId != null && userCorpId.equalsIgnoreCase(project.getCorpId());
    }

    /**
     * 프로젝트 목록 조회 (권한별 법인 및 접근 허용 사용자 격리)
     */
    @Transactional(readOnly = true)
    public List<Project> getProjects(CustomUserInfo userInfo) {
        if (userInfo == null) return List.of();
        String role = userInfo.getRole();

        if (isAuditTeamOrExec(role)) {
            return projectRepository.findAll();
        }

        List<Project> allProjects = projectRepository.findAll();
        return allProjects.stream()
                .filter(p -> isUserAccessibleProject(p, userInfo))
                .collect(Collectors.toList());
    }

    /**
     * 유관부서가 해당 프로젝트에 할당되었는지 검증
     */
    public boolean isDeptAssignedToProject(Project project, String deptName, String username) {
        if (project == null || project.getAssignedDepts() == null || project.getAssignedDepts().trim().isEmpty()) {
            return false;
        }
        String depts = project.getAssignedDepts();
        // 쉼표로 분리하여 확인 (대소문자/공백 무시)
        String[] assignedArray = depts.split(",");
        for (String assigned : assignedArray) {
            String trimmed = assigned.trim();
            if (!trimmed.isEmpty()) {
                if (deptName != null && deptName.trim().equalsIgnoreCase(trimmed)) {
                    return true;
                }
                if (username != null && username.trim().equalsIgnoreCase(trimmed)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 감사팀(SYSTEM_ADMIN, AUDIT_LEADER, AUDITOR)용 프로젝트 생성
     */
    @Transactional
    public Project createProject(String projectName, String corpId, String assignedDepts,
                                 LocalDateTime dl1, LocalDateTime dl2, LocalDateTime dl3, 
                                 CustomUserInfo userInfo) {
        
        // 감사팀 권한 검증
        if (!isAuditTeam(userInfo.getRole())) {
            throw new AccessDeniedException("감사팀(시스템 관리자, 감사 책임자, 감사 담당자)만 프로젝트를 생성할 수 있습니다.");
        }

        // 네이밍 규칙 강제 (연도_법인명)
        if (projectName == null || !projectName.matches("^\\d{4}_.+$")) {
            throw new IllegalArgumentException("프로젝트 네이밍 규칙 '연도_법인명' 형식을 준수해야 합니다. (예: 2026_법인명)");
        }

        // 1. 소속법인 접근 허용 사용자 필수 검증
        if (assignedDepts == null || assignedDepts.trim().isEmpty()) {
            throw new IllegalArgumentException("소속법인 접근 허용 사용자를 최소 1명 이상 필수로 지정해야 합니다.");
        }

        // 2. 마감일 검증 (1차 마감일은 필수, 2차/3차는 선택)
        if (dl1 == null) {
            throw new IllegalArgumentException("마감일을 필수로 입력해야 합니다.");
        }
        if (dl2 != null && dl1.isAfter(dl2)) {
            throw new IllegalArgumentException("마감일은 1차 ≤ 2차 순서여야 합니다.");
        }
        if (dl2 != null && dl3 != null && dl2.isAfter(dl3)) {
            throw new IllegalArgumentException("마감일은 2차 ≤ 3차 순서여야 합니다.");
        }

        Project project = Project.builder()
                .projectName(projectName.trim())
                .corpId(corpId != null ? corpId.trim() : "CORP_DEFAULT")
                .assignedDepts(assignedDepts.trim())
                .deadline1st(dl1)
                .deadline2nd(dl2)
                .deadline3rd(dl3)
                .projectState("OPEN")
                .createdBy(userInfo.getUsername())
                .build();

        return projectRepository.save(project);
    }

    /**
     * 동결(FREEZE)된 프로젝트 기반으로 차기 프로젝트 생성
     * - 부모 프로젝트가 FREEZE 상태인지 검증
     * - 부모 프로젝트 정보(법인, 접근권한 등) 승계 및 차수(round) 증가
     * - 부모 프로젝트의 CAP 중 'COMPLETED'(개선완료) 항목은 기본 제외하고, 미완료 건만 신규 프로젝트로 승계(복제)
     * - 승계된 CAP은 DRAFT 상태로 초기화되어 차기 프로젝트에서 이터레이션 진행 가능
     */
    @Transactional
    public Project createProjectFromFrozen(Long parentProjectId, String projectName, LocalDateTime dl1, CustomUserInfo userInfo) {
        if (!isAuditTeam(userInfo.getRole())) {
            throw new AccessDeniedException("감사팀만 프로젝트를 생성할 수 있습니다.");
        }

        Project parent = projectRepository.findById(parentProjectId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 부모 프로젝트입니다. ID: " + parentProjectId));

        if (!"FREEZE".equals(parent.getProjectState())) {
            throw new IllegalStateException("동결(FREEZE) 상태인 프로젝트만 기반으로 차기 프로젝트를 생성할 수 있습니다.");
        }

        if (projectName == null || !projectName.matches("^\\d{4}_.+$")) {
            throw new IllegalArgumentException("프로젝트 네이밍 규칙 '연도_법인명' 형식을 준수해야 합니다. (예: 2026_법인명_2차)");
        }

        if (dl1 == null) {
            throw new IllegalArgumentException("마감일을 필수로 입력해야 합니다.");
        }

        int nextRound = (parent.getRound() != null ? parent.getRound() : 1) + 1;

        Project newProject = Project.builder()
                .projectName(projectName.trim())
                .corpId(parent.getCorpId())
                .assignedDepts(parent.getAssignedDepts())
                .deadline1st(dl1)
                .projectState("OPEN")
                .parentProjectId(parent.getProjectId())
                .parentProjectName(parent.getProjectName())
                .round(nextRound)
                .createdBy(userInfo.getUsername())
                .build();

        Project savedProject = projectRepository.save(newProject);

        // 부모 프로젝트의 CAP 조회 및 'COMPLETED'(개선완료) 항목 제외하고 복제 승계
        List<Finding> parentFindings = findingRepository.findByProject_ProjectId(parent.getProjectId());
        LocalDateTime now = LocalDateTime.now();

        for (Finding pf : parentFindings) {
            // 요구사항 3: "상태값이 개선 완료이면 다음에는 기본적으로 제외 해 줘"
            if ("COMPLETED".equalsIgnoreCase(pf.getActionStatusCode())) {
                continue;
            }

            Finding newFinding = Finding.builder()
                    .project(savedProject)
                    .category(pf.getCategory())
                    .title(pf.getTitle())
                    .findingText(pf.getFindingText())
                    .auditorsInCharge(pf.getAuditorsInCharge())
                    .assignedUserId(pf.getAssignedUserId())
                    .assignedDeptName(pf.getAssignedDeptName())
                    .actionText(pf.getActionText()) // 이전 차수 조치내역 승계
                    .findingState("OPEN")
                    .approvalStatus("DRAFT") // 새 프로젝트에서 이터레이션 시작
                    .expectedDeadline(dl1) // 차기 마감일 반영
                    .actionDeadline(pf.getActionDeadline())
                    .actionStatusCode(pf.getActionStatusCode() != null ? pf.getActionStatusCode() : "NOT_WRITTEN")
                    .parentFindingId(pf.getFindingId()) // 이전 CAP 연계
                    .build();

            Finding savedFinding = findingRepository.save(newFinding);

            // 이력 적재
            FindingHistory history = FindingHistory.builder()
                    .findingId(savedFinding.getFindingId())
                    .actionType("COPIED_FROM_PARENT")
                    .actorId(userInfo.getUsername())
                    .actorName(userInfo.getName())
                    .actorRole(userInfo.getRole())
                    .actionStatusCode(savedFinding.getActionStatusCode())
                    .actionDeadline(savedFinding.getActionDeadline())
                    .actionText(savedFinding.getActionText())
                    .comment("동결 프로젝트 [" + parent.getProjectName() + "] (원천 CAP #" + pf.getFindingId() + ")로부터 승계되어 " + nextRound + "차수 이터레이션 시작")
                    .createdAt(now)
                    .build();
            findingHistoryRepository.save(history);
        }

        return savedProject;
    }

    /**
     * 1단계: 법인장(CORP_HEAD) 프로젝트 최종 확정
     * - 프로젝트 내 모든 지적사항(CAP)이 감사담당자 CONFIRM(AUDIT_CONFIRMED) 완료된 후 가능
     */
    @Transactional
    public void headConfirmProject(Long projectId, String comment, CustomUserInfo userInfo) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 프로젝트입니다. ID: " + projectId));

        boolean isCorpHead = UserRole.CORP_HEAD.name().equals(userInfo.getRole()) ||
                             UserRole.SYSTEM_ADMIN.name().equals(userInfo.getRole());

        if (!isCorpHead) {
            throw new AccessDeniedException("법인장(CORP_HEAD) 또는 시스템 관리자만 프로젝트 최종 확정을 진행할 수 있습니다.");
        }

        // 해당 법인 일치 여부 확인 (SYSTEM_ADMIN 제외)
        if (!UserRole.SYSTEM_ADMIN.name().equals(userInfo.getRole())) {
            if (userInfo.getCorpId() == null || !userInfo.getCorpId().equalsIgnoreCase(project.getCorpId())) {
                throw new AccessDeniedException("소속 법인의 프로젝트만 최종 확정할 수 있습니다.");
            }
        }

        // 지적사항들의 감사담당자 CONFIRM 완료 여부 검증
        List<com.example.cap.entity.Finding> findings = findingRepository.findAllByProjectProjectId(projectId);
        if (findings.isEmpty()) {
            throw new IllegalStateException("해당 프로젝트에 등록된 지적사항(CAP)이 없습니다.");
        }
        boolean hasUnconfirmed = findings.stream().anyMatch(f -> !"AUDIT_CONFIRMED".equals(f.getApprovalStatus()));
        if (hasUnconfirmed) {
            throw new IllegalStateException("프로젝트 내 모든 지적사항(CAP)이 감사담당자 CONFIRM(종료) 완료되어야 법인장 최종 확정이 가능합니다.");
        }

        project.setAuditApprovalStatus("HEAD_CONFIRMED");
        project.setHeadConfirmedBy(userInfo.getName() != null && !userInfo.getName().isEmpty() ? userInfo.getName() : userInfo.getUsername());
        project.setHeadConfirmedAt(LocalDateTime.now());
        project.setHeadComment(comment != null ? comment : "법인장 최종 확정 완료");
        project.setAuditRejectedReason(null);
        projectRepository.save(project);
    }

    /**
     * 2단계: 감사 담당자(AUDITOR) 조치 내용 확인 CONFIRM
     * - 법인장 최종 확정(HEAD_CONFIRMED) 선행 필수
     */
    @Transactional
    public void auditorReviewProject(Long projectId, String comment, CustomUserInfo userInfo) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 프로젝트입니다. ID: " + projectId));

        boolean isAuditor = UserRole.AUDITOR.name().equals(userInfo.getRole()) ||
                            UserRole.AUDIT_LEADER.name().equals(userInfo.getRole()) ||
                            UserRole.SYSTEM_ADMIN.name().equals(userInfo.getRole());

        if (!isAuditor) {
            throw new AccessDeniedException("감사 담당자(AUDITOR) 또는 시스템 관리자만 내용 확인을 진행할 수 있습니다.");
        }

        // 법인장 최종 확정 선행 여부 검증 (AUDIT_LEADER, SYSTEM_ADMIN 제외)
        boolean canSkipHeadConfirm = UserRole.AUDIT_LEADER.name().equals(userInfo.getRole()) ||
                                     UserRole.SYSTEM_ADMIN.name().equals(userInfo.getRole());
        if (!canSkipHeadConfirm && !"HEAD_CONFIRMED".equals(project.getAuditApprovalStatus())) {
            throw new IllegalStateException("법인장의 최종 확정(HEAD_CONFIRMED)이 먼저 완료되어야 감사담당자 확인이 가능합니다.");
        }

        project.setAuditApprovalStatus("AUDITOR_CONFIRMED");
        project.setAuditorReviewedBy(userInfo.getName() != null && !userInfo.getName().isEmpty() ? userInfo.getName() : userInfo.getUsername());
        project.setAuditorReviewedAt(LocalDateTime.now());
        project.setAuditorComment(comment != null ? comment : "감사 담당자 조치내용 확인 완료");
        project.setAuditRejectedReason(null);
        projectRepository.save(project);
    }

    /**
     * 3단계: 감사 책임자(AUDIT_LEADER) 최종 CONFIRM 및 프로젝트 동결(Freeze)
     */
    @Transactional
    public void auditLeaderApproveProject(Long projectId, String comment, CustomUserInfo userInfo) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 프로젝트입니다. ID: " + projectId));

        boolean isAuditLeader = isAuditTeam(userInfo.getRole()) ||
                                UserRole.SYSTEM_ADMIN.name().equals(userInfo.getRole());

        if (!isAuditLeader) {
            throw new AccessDeniedException("감사팀(AUDITOR, AUDIT_LEADER) 또는 시스템 관리자만 최종 승인을 진행할 수 있습니다.");
        }

        // 법인장 최종 확정 선행 여부 검증 (AUDIT_LEADER 및 SYSTEM_ADMIN은 즉시 최종 승인 및 동결 가능)
        boolean canDirectFreeze = UserRole.AUDIT_LEADER.name().equals(userInfo.getRole()) ||
                                  UserRole.SYSTEM_ADMIN.name().equals(userInfo.getRole());
        if (!canDirectFreeze) {
            boolean isConfirmedByHeadOrAuditor = "HEAD_CONFIRMED".equals(project.getAuditApprovalStatus()) || "AUDITOR_CONFIRMED".equals(project.getAuditApprovalStatus());
            if (!isConfirmedByHeadOrAuditor) {
                throw new IllegalStateException("법인장의 최종 확정(HEAD_CONFIRMED)이 완료된 프로젝트에 한하여 감사팀 최종 승인 및 동결(FREEZE)이 가능합니다.");
            }
        }

        project.setAuditApprovalStatus("LEADER_APPROVED");
        project.setProjectState("FREEZE");
        project.setAuditLeaderApprovedBy(userInfo.getName() != null && !userInfo.getName().isEmpty() ? userInfo.getName() : userInfo.getUsername());
        project.setAuditLeaderApprovedAt(LocalDateTime.now());
        project.setAuditLeaderComment(comment != null ? comment : "감사팀 최종 승인 및 동결(FREEZE) 완료");
        project.setAuditRejectedReason(null);
        projectRepository.save(project);
    }

    /**
     * 감사팀 반려 / 보완 요청
     */
    @Transactional
    public void auditRejectProject(Long projectId, String reason, CustomUserInfo userInfo) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 프로젝트입니다. ID: " + projectId));

        if (!isAuditTeam(userInfo.getRole())) {
            throw new AccessDeniedException("감사팀만 반려 또는 보완 요청을 할 수 있습니다.");
        }

        project.setAuditApprovalStatus("AUDIT_REJECTED");
        project.setAuditRejectedReason(reason);
        project.setProjectState("OPEN");
        projectRepository.save(project);
    }

    /**
     * 법인장 또는 감사팀의 프로젝트 Freeze (동결)
     */
    @Transactional
    public void freezeProject(Long projectId, CustomUserInfo userInfo) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 프로젝트입니다. ID: " + projectId));

        boolean isAudit = isAuditTeam(userInfo.getRole());
        boolean isHead = UserRole.CORP_HEAD.name().equals(userInfo.getRole()) && project.getCorpId().equals(userInfo.getCorpId());

        if (!isAudit && !isHead) {
            throw new AccessDeniedException("해당 법인의 법인장(CORP_HEAD) 또는 감사팀만 프로젝트 최종 승인(동결) 처리를 할 수 있습니다.");
        }

        // 지적사항들의 법인장 결재 완료 여부 검증 (AUDIT_LEADER, SYSTEM_ADMIN은 즉시 동결 가능)
        boolean isLeaderOrAdmin = UserRole.AUDIT_LEADER.name().equals(userInfo.getRole()) ||
                                  UserRole.SYSTEM_ADMIN.name().equals(userInfo.getRole());
        if (!isLeaderOrAdmin) {
            List<com.example.cap.entity.Finding> findings = findingRepository.findAllByProjectProjectId(projectId);
            boolean hasUnapproved = findings.stream().anyMatch(f -> {
                String status = f.getApprovalStatus();
                return status == null || (!"SUBMITTED".equals(status) && !"AUDIT_CONFIRMED".equals(status));
            });

            if (hasUnapproved) {
                throw new IllegalStateException("해당 프로젝트 내에 법인장 결재가 완료되지 않은 지적사항이 존재하여 동결(Freeze)할 수 없습니다.");
            }
        }

        project.setProjectState("FREEZE");
        projectRepository.save(project);
    }

    /**
     * 프로젝트 Freeze 해제 및 OPEN 상태로 변경
     */
    @Transactional
    public void unfreezeProject(Long projectId, CustomUserInfo userInfo) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 프로젝트입니다. ID: " + projectId));

        boolean isAudit = isAuditTeam(userInfo.getRole());
        boolean isHead = UserRole.CORP_HEAD.name().equals(userInfo.getRole()) && project.getCorpId().equals(userInfo.getCorpId());

        if (!isAudit && !isHead) {
            throw new AccessDeniedException("해당 법인의 법인장(CORP_HEAD) 또는 감사팀만 동결 해제가 가능합니다.");
        }

        if (!"FREEZE".equals(project.getProjectState())) {
            throw new IllegalStateException("동결(FREEZE) 상태의 프로젝트만 오픈할 수 있습니다.");
        }

        // 지적사항들의 법인장 결재 완료 여부 검증
        List<com.example.cap.entity.Finding> findings = findingRepository.findAllByProjectProjectId(projectId);
        boolean hasUnapproved = findings.stream().anyMatch(f -> {
            String status = f.getApprovalStatus();
            return status == null || (!"SUBMITTED".equals(status) && !"AUDIT_CONFIRMED".equals(status));
        });

        if (hasUnapproved) {
            throw new IllegalStateException("해당 프로젝트 내에 법인장 결재가 완료되지 않은 지적사항이 존재하여 오픈(Open)할 수 없습니다.");
        }

        project.setProjectState("OPEN");
        projectRepository.save(project);
    }
}
