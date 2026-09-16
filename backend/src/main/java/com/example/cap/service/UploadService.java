package com.example.cap.service;

import com.example.cap.entity.Attachment;
import com.example.cap.entity.Finding;
import com.example.cap.repository.AttachmentRepository;
import com.example.cap.repository.FindingRepository;
import com.example.cap.security.CustomUserInfo;
import jakarta.persistence.EntityManager;
import jakarta.persistence.ParameterMode;
import jakarta.persistence.StoredProcedureQuery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UploadService {

    private final EntityManager entityManager;
    private final FindingRepository findingRepository;
    private final AttachmentRepository attachmentRepository;

    @Value("${app.upload.local-path:e:/Vibe/Audit/cap_uploads}")
    private String localPath;

    @Value("${app.upload.blocked-extensions:exe,bat}")
    private List<String> blockedExtensions;

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    /**
     * 특정 발견사항(CAP)에 대한 다중 증빙 파일 업로드
     * - 프로젝트 FREEZE 상태 체크
     * - 조치완료(AUDIT_CONFIRMED, COMPLETED) 상태 체크
     * - 각 파일 크기 및 차단 확장자 검증
     * - 복수 파일 로컬 스토리지 I/O 및 DB 저장
     */
    @Transactional
    public List<Attachment> uploadFiles(Long findingId, List<MultipartFile> files, String uploadType, CustomUserInfo userInfo) throws IOException {
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("업로드할 파일이 없습니다.");
        }

        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 감사 지적(발견사항) ID입니다: " + findingId));

        // 1. 프로젝트 완료(Completion) 상태 체크
        if (finding.getProject() != null && "FREEZE".equalsIgnoreCase(finding.getProject().getProjectState())) {
            throw new IllegalStateException("완료(Completion) 상태인 프로젝트에는 증빙 파일을 업로드할 수 없습니다.");
        }

        // 2. 조치 완료 및 감사 검증 진행 상태 체크 (감사실 제출 또는 최종 검증 완료 시 업로드 차단)
        boolean isAuditConfirmed = "AUDIT_CONFIRMED".equalsIgnoreCase(finding.getApprovalStatus());
        boolean isPendingAudit = "PENDING_AUDIT".equalsIgnoreCase(finding.getApprovalStatus());
        if (isAuditConfirmed || isPendingAudit) {
            throw new IllegalStateException("감사실에 제출되어 검증 중이거나 이미 최종 완료된 항목에는 증빙 파일을 업로드할 수 없습니다.");
        }

        // 3. 디렉토리 확인 및 생성
        Path uploadDirectory = Paths.get(localPath);
        if (!Files.exists(uploadDirectory)) {
            Files.createDirectories(uploadDirectory);
        }

        List<Attachment> savedAttachments = new java.util.ArrayList<>();

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;

            // 파일 크기 검증
            if (file.getSize() > MAX_FILE_SIZE) {
                throw new IllegalArgumentException("파일 [" + file.getOriginalFilename() + "]의 용량은 최대 50MB를 초과할 수 없습니다.");
            }

            // 파일 확장자 검증
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null || originalFilename.isEmpty()) {
                throw new IllegalArgumentException("올바르지 않은 파일명입니다.");
            }

            String fileExtension = getFileExtension(originalFilename);
            if (blockedExtensions != null && blockedExtensions.stream().anyMatch(ext -> ext.equalsIgnoreCase(fileExtension))) {
                throw new IllegalArgumentException(fileExtension + " 형식의 실행 파일은 업로드가 차단됩니다.");
            }

            // 물리 파일명 고유화 및 저장
            String savedFileName = UUID.randomUUID() + "_" + originalFilename;
            Path targetPath = uploadDirectory.resolve(savedFileName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            // DB 저장 (SP 시도 후 JPA Fallback)
            Attachment saved = null;
            try {
                StoredProcedureQuery query = entityManager.createStoredProcedureQuery("sp_caps_create_attachment", Attachment.class);
                query.registerStoredProcedureParameter("findingId", Long.class, ParameterMode.IN);
                query.registerStoredProcedureParameter("uploadType", String.class, ParameterMode.IN);
                query.registerStoredProcedureParameter("fileName", String.class, ParameterMode.IN);
                query.registerStoredProcedureParameter("filePath", String.class, ParameterMode.IN);
                query.registerStoredProcedureParameter("fileSize", Long.class, ParameterMode.IN);
                query.registerStoredProcedureParameter("uploadedBy", String.class, ParameterMode.IN);

                query.setParameter("findingId", findingId);
                query.setParameter("uploadType", uploadType != null ? uploadType : "ACTION_EVIDENCE");
                query.setParameter("fileName", originalFilename);
                query.setParameter("filePath", targetPath.toAbsolutePath().toString());
                query.setParameter("fileSize", file.getSize());
                query.setParameter("uploadedBy", userInfo != null ? userInfo.getUsername() : "SYSTEM");

                List<?> result = query.getResultList();
                if (!result.isEmpty() && result.get(0) instanceof Attachment) {
                    saved = (Attachment) result.get(0);
                }
            } catch (Exception ignored) {}

            if (saved == null) {
                try {
                    Attachment attachment = Attachment.builder()
                            .finding(finding)
                            .uploadType(uploadType != null ? uploadType : "ACTION_EVIDENCE")
                            .fileName(originalFilename)
                            .filePath(targetPath.toAbsolutePath().toString())
                            .fileSize(file.getSize())
                            .uploadedBy(userInfo != null ? userInfo.getUsername() : "SYSTEM")
                            .build();
                    saved = attachmentRepository.save(attachment);
                } catch (Exception e) {
                    try { Files.deleteIfExists(targetPath); } catch (IOException ignored) {}
                    throw new RuntimeException("증빙 파일 DB 등록 실패: " + e.getMessage(), e);
                }
            }

            savedAttachments.add(saved);
        }

        log.info("다중 증빙 파일 업로드 완료: findingId={}, 파일 수={}", findingId, savedAttachments.size());
        return savedAttachments;
    }

    /**
     * 단일 파일 업로드 (하위호환용)
     */
    @Transactional
    public Attachment uploadFile(Long findingId, MultipartFile file, String uploadType, CustomUserInfo userInfo) throws IOException {
        List<Attachment> list = uploadFiles(findingId, List.of(file), uploadType, userInfo);
        if (list.isEmpty()) {
            throw new RuntimeException("증빙 파일 업로드에 실패했습니다.");
        }
        return list.get(0);
    }

    /**
     * 특정 발견사항(CAP)에 등록된 모든 첨부파일 목록 조회
     */
    @Transactional(readOnly = true)
    public List<Attachment> getAttachments(Long findingId) {
        return attachmentRepository.findAllByFindingFindingId(findingId);
    }

    /**
     * 첨부파일 단건 상세 조회 (다운로드용)
     */
    @Transactional(readOnly = true)
    public Attachment getAttachment(Long fileId) {
        return attachmentRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 파일 ID입니다: " + fileId));
    }

    /**
     * 첨부파일 삭제
     */
    @Transactional
    public void deleteAttachment(Long fileId, CustomUserInfo userInfo) {
        Attachment attachment = attachmentRepository.findById(fileId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 파일 ID입니다: " + fileId));

        Finding finding = attachment.getFinding();
        if (finding != null) {
            if (finding.getProject() != null && "FREEZE".equalsIgnoreCase(finding.getProject().getProjectState())) {
                throw new IllegalStateException("완료(Completion) 상태인 프로젝트의 첨부파일은 삭제할 수 없습니다.");
            }
            if ("AUDIT_CONFIRMED".equalsIgnoreCase(finding.getApprovalStatus()) || "PENDING_AUDIT".equalsIgnoreCase(finding.getApprovalStatus())) {
                throw new IllegalStateException("감사실에 제출되어 검증 중이거나 이미 최종 완료된 항목의 증빙 파일은 삭제할 수 없습니다.");
            }
        }

        // 물리 파일 삭제
        if (attachment.getFilePath() != null) {
            try {
                Path path = Paths.get(attachment.getFilePath());
                Files.deleteIfExists(path);
            } catch (Exception e) {
                log.warn("물리 파일 삭제 실패: path={}, error={}", attachment.getFilePath(), e.getMessage());
            }
        }

        attachmentRepository.delete(attachment);
        log.info("첨부파일 삭제 완료: fileId={}, fileName={}", fileId, attachment.getFileName());
    }

    /**
     * 파일 이름에서 확장자 추출
     */
    private String getFileExtension(String fileName) {
        int lastIndexOf = fileName.lastIndexOf(".");
        if (lastIndexOf == -1) {
            return ""; // 확장자 없음
        }
        return fileName.substring(lastIndexOf + 1);
    }
}
