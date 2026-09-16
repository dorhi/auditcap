package com.example.cap.controller;

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
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/manual")
public class ManualController {

    private static final String PPT_FILENAME = "SAE-A_CAP_Integrated_Manual.pptx";

    /**
     * 통합 사용자 매뉴얼 (PPTX) 다운로드 API
     */
    @GetMapping("/download")
    public ResponseEntity<Resource> downloadIntegratedManual() {
        byte[] fileBytes = null;

        // 1. 파일시스템 탐색 (오피스 열림 등 파일 잠금에 안전하도록 개별 try-catch 및 FileInputStream 사용)
        String[] candidatePaths = {
            "backend/src/main/resources/manuals/" + PPT_FILENAME,
            "frontend/public/manuals/" + PPT_FILENAME,
            "e:/Vibe/Audit/manuals_ppt/" + PPT_FILENAME,
            "manuals_ppt/" + PPT_FILENAME,
            "../manuals_ppt/" + PPT_FILENAME
        };

        for (String p : candidatePaths) {
            try {
                File file = new File(p);
                if (file.exists() && file.isFile() && file.length() > 0) {
                    try (FileInputStream fis = new FileInputStream(file)) {
                        fileBytes = fis.readAllBytes();
                        if (fileBytes != null && fileBytes.length > 0) {
                            break;
                        }
                    }
                }
            } catch (Exception ex) {
                // 특정 파일이 잠겨있거나 접근 불가할 경우 다음 후보 탐색
            }
        }

        // 2. 클래스패스 탐색 (jar 배포 환경 대비)
        if (fileBytes == null) {
            try {
                ClassPathResource cpr = new ClassPathResource("manuals/" + PPT_FILENAME);
                if (cpr.exists()) {
                    try (InputStream is = cpr.getInputStream()) {
                        fileBytes = is.readAllBytes();
                    }
                }
            } catch (Exception ex) {
                // ignore
            }
        }

        if (fileBytes == null) {
            return ResponseEntity.notFound().build();
        }

        try {
            ByteArrayResource resource = new ByteArrayResource(fileBytes);
            String koreanFilename = "글로벌세아_CAP관리시스템_통합사용자매뉴얼.pptx";
            String encodedFilename = URLEncoder.encode(koreanFilename, StandardCharsets.UTF_8).replaceAll("\\+", "%20");

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.presentationml.presentation"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + PPT_FILENAME + "\"; filename*=UTF-8''" + encodedFilename)
                    .contentLength(fileBytes.length)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
