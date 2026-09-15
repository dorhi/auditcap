package com.example.cap.controller;

import com.example.cap.entity.Attachment;
import com.example.cap.entity.Finding;
import com.example.cap.entity.FindingHistory;
import com.example.cap.security.CustomUserInfo;
import com.example.cap.service.FindingService;
import com.example.cap.service.UploadService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/findings")
@RequiredArgsConstructor
public class FindingController {

    private final FindingService findingService;
    private final UploadService uploadService;

    /**
     * 법인 격리 조회가 반영된 발견사항 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<Finding>> getFindings(@AuthenticationPrincipal CustomUserInfo userInfo) {
        List<Finding> findings = findingService.getFindings(userInfo);
        return ResponseEntity.ok(findings);
    }

    /**
     * 감사팀용 발견사항(CAP) 등록 - 예상 마감일 지정
     */
    @PostMapping
    public ResponseEntity<?> createFinding(@RequestBody CreateFindingRequest request,
                                           @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            Finding finding = findingService.createFinding(
                    request.getProjectId(),
                    request.getCategory(),
                    request.getTitle(),
                    request.getFindingText(),
                    request.getAuditorsInCharge(),
                    request.getAssignedUserId(),
                    request.getAssignedDeptName(),
                    request.getRelatedDepts(),
                    request.getExpectedDeadline(),
                    request.getTargetDate(),
                    request.getTargetDateText(),
                    request.getDeadline1st(),
                    request.getDeadline2nd(),
                    request.getDeadline3rd(),
                    userInfo
            );
            return ResponseEntity.ok(finding);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "CREATE_FINDING_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 감사팀용 발견사항(CAP) 수정 (감사담당자/감사책임자는 조건 없이 언제든지 담당자/유관부서 변경 가능)
     */
    @PutMapping("/{findingId}")
    public ResponseEntity<?> updateFinding(@PathVariable Long findingId,
                                           @RequestBody UpdateFindingRequest request,
                                           @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            Finding finding = findingService.updateFinding(
                    findingId,
                    request.getCategory(),
                    request.getTitle(),
                    request.getFindingText(),
                    request.getAuditorsInCharge(),
                    request.getAssignedUserId(),
                    request.getAssignedDeptName(),
                    request.getRelatedDepts(),
                    request.getExpectedDeadline(),
                    request.getTargetDate(),
                    request.getTargetDateText(),
                    request.getDeadline1st(),
                    request.getDeadline2nd(),
                    request.getDeadline3rd(),
                    userInfo
            );
            return ResponseEntity.ok(Map.of(
                    "message", "발견사항(CAP)이 성공적으로 수정되었습니다.",
                    "finding", finding
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "UPDATE_FINDING_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 법인담당자: 조치내역, 법인 조치 마감기한, 조치상태코드 임시저장
     */
    @PutMapping("/{findingId}/action")
    public ResponseEntity<?> updateFindingAction(@PathVariable Long findingId,
                                                 @RequestBody UpdateActionRequest request,
                                                 @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            Finding finding = findingService.updateFindingAction(
                    findingId,
                    request.getActionText(),
                    request.getActionDeadline(),
                    request.getCompletionDate(),
                    request.getActionStatusCode(),
                    userInfo
            );
            return ResponseEntity.ok(Map.of(
                    "message", "조치 내역이 성공적으로 저장되었습니다.",
                    "finding", finding
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "UPDATE_ACTION_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * [결재선 1단계] 법인담당자 CONFIRM (대표담당자 확인 요청)
     */
    @PostMapping("/{findingId}/confirm-member")
    public ResponseEntity<?> confirmMember(@PathVariable Long findingId,
                                          @RequestBody(required = false) ApprovalActionRequest request,
                                          @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            String comment = request != null ? request.getComment() : null;
            Finding finding = findingService.confirmMember(findingId, comment, userInfo);
            return ResponseEntity.ok(Map.of(
                    "message", "법인 대표담당자에게 확인 요청(CONFIRM)되었습니다.",
                    "finding", finding
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "CONFIRM_MEMBER_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * [결재선 2단계-1] 법인 대표담당자 CONFIRM (감사실 검증 요청)
     */
    @PostMapping("/{findingId}/lead-confirm")
    public ResponseEntity<?> confirmLead(@PathVariable Long findingId,
                                        @RequestBody(required = false) ApprovalActionRequest request,
                                        @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            String comment = request != null ? request.getComment() : null;
            Finding finding = findingService.confirmLead(findingId, comment, userInfo);
            return ResponseEntity.ok(Map.of(
                    "message", "법인 대표담당자 확인이 완료되어 감사실로 검증 요청되었습니다.",
                    "finding", finding
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "CONFIRM_LEAD_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * [결재선 2단계-2] 법인 대표담당자 재수정 요청 (반려)
     */
    @PostMapping("/{findingId}/lead-reject")
    public ResponseEntity<?> rejectLead(@PathVariable Long findingId,
                                       @RequestBody ApprovalActionRequest request,
                                       @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            String reason = request != null ? request.getReason() : null;
            Finding finding = findingService.rejectLead(findingId, reason, userInfo);
            return ResponseEntity.ok(Map.of(
                    "message", "법인담당자에게 재수정 요청되었습니다.",
                    "finding", finding
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "REJECT_LEAD_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * [결재선 3단계-1] 감사담당자 CONFIRM (해당 CAP 종료)
     */
    @PostMapping("/{findingId}/audit-confirm")
    public ResponseEntity<?> confirmAudit(@PathVariable Long findingId,
                                         @RequestBody(required = false) ApprovalActionRequest request,
                                         @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            String comment = request != null ? request.getComment() : null;
            Finding finding = findingService.confirmAudit(findingId, comment, userInfo);
            return ResponseEntity.ok(Map.of(
                    "message", "감사담당자 검증이 완료되어 해당 CAP이 최종 종료(조치승인)되었습니다.",
                    "finding", finding
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "CONFIRM_AUDIT_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * [결재선 3단계-2] 감사담당자 재작성 요청 (보완/반려)
     */
    @PostMapping("/{findingId}/audit-reject")
    public ResponseEntity<?> rejectAudit(@PathVariable Long findingId,
                                        @RequestBody ApprovalActionRequest request,
                                        @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            String reason = request != null ? request.getReason() : null;
            Finding finding = findingService.rejectAudit(findingId, reason, userInfo);
            return ResponseEntity.ok(Map.of(
                    "message", "법인담당자에게 재작성(보완) 요청되었습니다.",
                    "finding", finding
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "REJECT_AUDIT_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 유관부서(DEPT_MEMBER) 협조 내용/의견 추가
     */
    @PostMapping("/{findingId}/dept-content")
    public ResponseEntity<?> addDeptContent(@PathVariable Long findingId,
                                           @RequestBody DeptContentRequest request,
                                           @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            Finding finding = findingService.addDeptContent(findingId, request.getContent(), userInfo);
            return ResponseEntity.ok(Map.of(
                    "message", "유관부서 내용이 성공적으로 추가되었습니다.",
                    "finding", finding
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "ADD_DEPT_CONTENT_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 특정 CAP의 조치 및 검토 이력 타임라인 조회
     */
    @GetMapping("/{findingId}/histories")
    public ResponseEntity<List<FindingHistory>> getHistories(@PathVariable Long findingId) {
        List<FindingHistory> histories = findingService.getFindingHistories(findingId);
        return ResponseEntity.ok(histories);
    }

    /**
     * 공통 조치상태 코드 목록 조회 (5단계)
     */
    @GetMapping("/action-status-codes")
    public ResponseEntity<?> getActionStatusCodes() {
        return ResponseEntity.ok(List.of(
                Map.of("code", "NOT_WRITTEN", "label", "미작성", "description", "담당자가 지정되었으나 조치 답변이 작성되지 않은 상태", "color", "#64748b", "bgColor", "#f1f5f9"),
                Map.of("code", "IN_PROGRESS", "label", "개선중", "description", "조치 진행 중 상태. '개선 예상 시기' 날짜 필수", "color", "#b45309", "bgColor", "#fef3c7"),
                Map.of("code", "COMPLETED", "label", "개선완료", "description", "조치가 완료되어 증빙 및 개선내용이 최종 작성된 상태. 개선완료일자 필수", "color", "#15803d", "bgColor", "#dcfce7"),
                Map.of("code", "ACTION_IMPOSSIBLE", "label", "개선불가", "description", "개선이 불가능한 항목이며 리스크 수용 필요 (완료일 입력 불가)", "color", "#b91c1c", "bgColor", "#fee2e2"),
                Map.of("code", "CONTINUOUS_MANAGEMENT", "label", "업무개선 후 지속관리", "description", "지속적으로 모니터링이 수행되어야 함 (완료일 기재 불필요)", "color", "#2563eb", "bgColor", "#eff6ff")
        ));
    }

    /**
     * 하위 호환 결재 API (기존 호출 지원)
     */
    @PostMapping("/{findingId}/request-approval")
    public ResponseEntity<?> legacyRequestApproval(@PathVariable Long findingId,
                                                  @RequestBody(required = false) ApprovalActionRequest request,
                                                  @AuthenticationPrincipal CustomUserInfo userInfo) {
        return confirmMember(findingId, request, userInfo);
    }

    @PostMapping("/{findingId}/approve")
    public ResponseEntity<?> legacyApprove(@PathVariable Long findingId,
                                          @RequestBody(required = false) ApprovalActionRequest request,
                                          @AuthenticationPrincipal CustomUserInfo userInfo) {
        if ("LEAD_REP".equals(userInfo.getRole())) {
            return confirmLead(findingId, request, userInfo);
        }
        return confirmAudit(findingId, request, userInfo);
    }

    @PostMapping("/{findingId}/reject")
    public ResponseEntity<?> legacyReject(@PathVariable Long findingId,
                                         @RequestBody ApprovalActionRequest request,
                                         @AuthenticationPrincipal CustomUserInfo userInfo) {
        if ("LEAD_REP".equals(userInfo.getRole())) {
            return rejectLead(findingId, request, userInfo);
        }
        return rejectAudit(findingId, request, userInfo);
    }

    /**
     * 발견사항 삭제
     */
    @DeleteMapping("/{findingId}")
    public ResponseEntity<?> deleteFinding(@PathVariable Long findingId,
                                           @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            findingService.deleteFinding(findingId, userInfo);
            return ResponseEntity.ok(Map.of("message", "발견사항이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "DELETE_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * Windows 로컬 스토리지 업로드를 통한 증빙 파일 직접 I/O 처리 (단일 및 다중 파일 업로드 동시 지원)
     */
    @PostMapping("/{findingId}/upload")
    public ResponseEntity<?> uploadFiles(@PathVariable Long findingId,
                                         @RequestParam(value = "files", required = false) List<MultipartFile> files,
                                         @RequestParam(value = "file", required = false) MultipartFile singleFile,
                                         @RequestParam("uploadType") String uploadType,
                                         @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            java.util.List<MultipartFile> uploadList = new java.util.ArrayList<>();
            if (files != null && !files.isEmpty()) {
                uploadList.addAll(files);
            }
            if (singleFile != null && !singleFile.isEmpty()) {
                uploadList.add(singleFile);
            }

            if (uploadList.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "NO_FILES", "message", "업로드할 파일을 1개 이상 선택해 주세요."));
            }

            List<Attachment> attachments = uploadService.uploadFiles(findingId, uploadList, uploadType, userInfo);
            return ResponseEntity.ok(Map.of(
                    "message", attachments.size() + "개의 증빙 파일 업로드가 완료되었습니다.",
                    "count", attachments.size(),
                    "attachments", attachments
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "UPLOAD_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 특정 발견사항(CAP)의 첨부파일 목록 조회
     */
    @GetMapping("/{findingId}/attachments")
    public ResponseEntity<?> getAttachments(@PathVariable Long findingId) {
        try {
            List<Attachment> attachments = uploadService.getAttachments(findingId);
            return ResponseEntity.ok(attachments);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "FETCH_ATTACHMENTS_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 첨부파일 다운로드
     */
    @GetMapping("/attachments/{fileId}/download")
    public ResponseEntity<?> downloadAttachment(@PathVariable Long fileId) {
        try {
            Attachment attachment = uploadService.getAttachment(fileId);
            File file = new File(attachment.getFilePath());
            if (!file.exists()) {
                return ResponseEntity.notFound().build();
            }

            org.springframework.core.io.Resource resource = new org.springframework.core.io.FileSystemResource(file);
            String encodedFileName = java.net.URLEncoder.encode(attachment.getFileName(), java.nio.charset.StandardCharsets.UTF_8).replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFileName + "\"; filename*=UTF-8''" + encodedFileName)
                    .header(org.springframework.http.HttpHeaders.CONTENT_LENGTH, String.valueOf(file.length()))
                    .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "DOWNLOAD_FAILED", "message", e.getMessage()));
        }
    }

    /**
     * 첨부파일 삭제
     */
    @DeleteMapping("/attachments/{fileId}")
    public ResponseEntity<?> deleteAttachment(@PathVariable Long fileId,
                                              @AuthenticationPrincipal CustomUserInfo userInfo) {
        try {
            uploadService.deleteAttachment(fileId, userInfo);
            return ResponseEntity.ok(Map.of("message", "첨부파일이 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "DELETE_ATTACHMENT_FAILED", "message", e.getMessage()));
        }
    }

    @Data
    public static class CreateFindingRequest {
        private Long projectId;
        private String category;
        private String title;
        private String findingText;
        private String auditorsInCharge;
        private String assignedUserId;
        private String assignedDeptName;
        private String relatedDepts;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime expectedDeadline;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime targetDate;
        private String targetDateText;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime deadline1st;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime deadline2nd;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime deadline3rd;
    }

    @Data
    public static class UpdateFindingRequest {
        private String category;
        private String title;
        private String findingText;
        private String auditorsInCharge;
        private String assignedUserId;
        private String assignedDeptName;
        private String relatedDepts;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime expectedDeadline;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime targetDate;
        private String targetDateText;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime deadline1st;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime deadline2nd;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime deadline3rd;
    }

    @Data
    public static class UpdateActionRequest {
        private String actionText;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime actionDeadline;
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
        private LocalDateTime completionDate;
        private String actionStatusCode;
    }

    @Data
    public static class ApprovalActionRequest {
        private String comment;
        private String reason;
    }

    @Data
    public static class DeptContentRequest {
        private String content;
    }
}
