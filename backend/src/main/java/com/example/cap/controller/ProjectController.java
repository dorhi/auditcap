package com.example.cap.controller;

import com.example.cap.entity.Project;
import com.example.cap.security.CustomUserInfo;
import com.example.cap.service.ProjectService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    /**
     * 법인 격리 조회가 반영된 프로젝트 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<Project>> getProjects(@AuthenticationPrincipal CustomUserInfo userInfo) {
        List<Project> projects = projectService.getProjects(userInfo);
        return ResponseEntity.ok(projects);
    }

    /**
     * 감사팀(SYSTEM_ADMIN)용 프로젝트 생성
     */
    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody CreateProjectRequest request,
                                           @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            Project project = projectService.createProject(
                    request.getProjectName(),
                    request.getCorpId(),
                    request.getAssignedDepts(),
                    request.getDeadline1st(),
                    request.getDeadline2nd(),
                    request.getDeadline3rd(),
                    userInfo
            );
            return ResponseEntity.ok(project);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "CREATE_PROJECT_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 완료(Completion) 프로젝트 기반 차기 프로젝트 생성
     */
    @PostMapping("/create-from-frozen")
    public ResponseEntity<?> createProjectFromFrozen(@RequestBody Map<String, Object> body,
                                                    @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            if (body == null || body.get("parentProjectId") == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "INVALID_REQUEST", "message", "부모 프로젝트 ID가 필요합니다."));
            }
            Long parentProjectId = Long.valueOf(body.get("parentProjectId").toString());
            String projectName = (String) body.get("projectName");
            String deadline1stStr = (String) body.get("deadline1st");
            LocalDateTime dl1 = deadline1stStr != null ? LocalDateTime.parse(deadline1stStr) : null;

            Project project = projectService.createProjectFromFrozen(parentProjectId, projectName, dl1, userInfo);
            return ResponseEntity.ok(project);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "CREATE_PROJECT_FROM_FROZEN_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 1단계: 법인장(CORP_HEAD) 프로젝트 최종 확정
     */
    @PostMapping("/{projectId}/head-confirm")
    public ResponseEntity<?> headConfirm(@PathVariable Long projectId,
                                         @RequestBody(required = false) Map<String, String> body,
                                         @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            String comment = body != null ? body.get("comment") : null;
            projectService.headConfirmProject(projectId, comment, userInfo);
            return ResponseEntity.ok(Map.of("message", "법인장 최종 확정이 완료되었습니다. (감사 담당자 확인 대기)"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "HEAD_CONFIRM_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 2단계: 감사 담당자(AUDITOR) 조치 내용 확인
     */
    @PostMapping("/{projectId}/auditor-review")
    public ResponseEntity<?> auditorReview(@PathVariable Long projectId,
                                           @RequestBody(required = false) Map<String, String> body,
                                           @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            String comment = body != null ? body.get("comment") : null;
            projectService.auditorReviewProject(projectId, comment, userInfo);
            return ResponseEntity.ok(Map.of("message", "감사 담당자 내용 확인이 완료되었습니다. (감사 책임자 최종 승인 대기)"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "AUDITOR_REVIEW_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 2단계: 감사 책임자(AUDIT_LEADER) 최종 승인 및 Freeze
     */
    @PostMapping("/{projectId}/leader-approve")
    public ResponseEntity<?> leaderApprove(@PathVariable Long projectId,
                                           @RequestBody(required = false) Map<String, String> body,
                                           @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            String comment = body != null ? body.get("comment") : null;
            projectService.auditLeaderApproveProject(projectId, comment, userInfo);
            return ResponseEntity.ok(Map.of("message", "감사 책임자 최종 승인이 완료되어 프로젝트가 완료(Completion)되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "LEADER_APPROVE_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 감사팀 반려 / 보완 요청
     */
    @PostMapping("/{projectId}/audit-reject")
    public ResponseEntity<?> auditReject(@PathVariable Long projectId,
                                         @RequestBody Map<String, String> body,
                                         @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            String reason = body != null ? body.get("reason") : "보완 요청";
            projectService.auditRejectProject(projectId, reason, userInfo);
            return ResponseEntity.ok(Map.of("message", "감사 보완 요청(반려)이 완료되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "AUDIT_REJECT_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 법인장(CORP_HEAD)용 프로젝트 최종 승인 및 완료(Completion)
     */
    @PostMapping("/{projectId}/freeze")
    public ResponseEntity<?> freezeProject(@PathVariable Long projectId,
                                           @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            projectService.freezeProject(projectId, userInfo);
            return ResponseEntity.ok(Map.of("message", "프로젝트 결재 승인 완료. 데이터가 완료(Completion) 처리되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "FREEZE_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 프로젝트 완료(Completion) 해제 및 OPEN 상태로 변경 (감사팀 또는 법인장 권한)
     */
    @PostMapping("/{projectId}/unfreeze")
    public ResponseEntity<?> unfreezeProject(@PathVariable Long projectId,
                                              @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            projectService.unfreezeProject(projectId, userInfo);
            return ResponseEntity.ok(Map.of("message", "프로젝트 완료(Completion)가 해제되고 다시 오픈되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "UNFREEZE_FAILED", "message", e.getMessage()));
        }
    }

    @Data
    public static class CreateProjectRequest {
        private String projectName;
        private String corpId;
        private String assignedDepts;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime deadline1st;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime deadline2nd;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime deadline3rd;
    }
}
