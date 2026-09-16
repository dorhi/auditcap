package com.example.cap.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/manual")
public class ManualController {

    private static final Logger log = LoggerFactory.getLogger(ManualController.class);
    private static final String PPT_FILENAME = "SAE-A_CAP_Integrated_Manual.pptx";
    private static final String KOREAN_FILENAME = "글로벌세아_CAP관리시스템_통합사용자매뉴얼.pptx";

    @Value("${app.manual.path:/data/auditcap/SAE-A_CAP_Integrated_Manual.pptx}")
    private String configuredManualPath;

    /**
     * 통합 사용자 매뉴얼 (PPTX) 다운로드 API
     * 우분투 서버 /data/auditcap 경로를 최우선으로 탐색
     */
    @GetMapping("/download")
    public ResponseEntity<Resource> downloadIntegratedManual() {
        byte[] fileBytes = null;

        // 1. 파일시스템 탐색 (우분투 서버 /data/auditcap 경로 최우선)
        String[] candidatePaths = {
            configuredManualPath,
            "/data/auditcap/" + PPT_FILENAME,
            "/data/auditcap/" + KOREAN_FILENAME,
            "/data/auditcap/manuals/" + PPT_FILENAME,
            "/data/auditcap/manuals/" + KOREAN_FILENAME,
            "/app/uploads/" + PPT_FILENAME,
            "/app/uploads/" + KOREAN_FILENAME,
            "/app/uploads/manuals/" + PPT_FILENAME,
            // 로컬 개발 환경 후보
            "e:/Vibe/Audit/manuals_ppt/" + PPT_FILENAME,
            "backend/src/main/resources/manuals/" + PPT_FILENAME,
            "frontend/public/manuals/" + PPT_FILENAME,
            "manuals_ppt/" + PPT_FILENAME,
            "../manuals_ppt/" + PPT_FILENAME
        };

        for (String p : candidatePaths) {
            if (p == null || p.trim().isEmpty()) continue;
            try {
                File file = new File(p);
                if (file.exists() && file.isFile() && file.length() > 0) {
                    try (FileInputStream fis = new FileInputStream(file)) {
                        fileBytes = fis.readAllBytes();
                        if (fileBytes != null && fileBytes.length > 0) {
                            log.info("통합 매뉴얼 파일 로드 성공 (경로: {}, 크기: {} bytes)", p, fileBytes.length);
                            break;
                        }
                    }
                }
            } catch (Exception ex) {
                log.debug("후보 경로 탐색 건너뜀 ({}): {}", p, ex.getMessage());
            }
        }

        // 2. 클래스패스 탐색 (JAR 패키징 내부 fallback)
        if (fileBytes == null) {
            try {
                ClassPathResource cpr = new ClassPathResource("manuals/" + PPT_FILENAME);
                if (cpr.exists()) {
                    try (InputStream is = cpr.getInputStream()) {
                        fileBytes = is.readAllBytes();
                        log.info("통합 매뉴얼 파일 클래스패스에서 로드 성공 (크기: {} bytes)", fileBytes.length);
                    }
                }
            } catch (Exception ex) {
                log.warn("클래스패스 매뉴얼 로드 실패: {}", ex.getMessage());
            }
        }

        if (fileBytes == null) {
            log.error("통합 매뉴얼 파일을 모든 경로(/data/auditcap 등)에서 찾을 수 없습니다.");
            return ResponseEntity.notFound().build();
        }

        // 3. 우분투 서버 /data/auditcap 폴더가 존재하고 파일이 비어있는 경우 자동 보존(동기화) 시도
        try {
            File dataAuditcapDir = new File("/data/auditcap");
            if (dataAuditcapDir.exists() && dataAuditcapDir.isDirectory() && dataAuditcapDir.canWrite()) {
                File targetPpt = new File(dataAuditcapDir, PPT_FILENAME);
                if (!targetPpt.exists() || targetPpt.length() == 0) {
                    try (FileOutputStream fos = new FileOutputStream(targetPpt)) {
                        fos.write(fileBytes);
                        targetPpt.setReadable(true, false);
                        log.info("우분투 서버 /data/auditcap/ 에 매뉴얼 파일 자동 동기화 완료: {}", targetPpt.getAbsolutePath());
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("/data/auditcap 자동 복사 무시: {}", ex.getMessage());
        }

        try {
            ByteArrayResource resource = new ByteArrayResource(fileBytes);
            String encodedFilename = URLEncoder.encode(KOREAN_FILENAME, StandardCharsets.UTF_8).replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + PPT_FILENAME + "\"; filename*=UTF-8''" + encodedFilename)
                    .contentLength(fileBytes.length)
                    .body(resource);
        } catch (Exception e) {
            log.error("매뉴얼 응답 생성 실패", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
