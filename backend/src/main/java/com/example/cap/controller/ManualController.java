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
        try {
            byte[] fileBytes = null;

            // 1. 파일시스템 우선 탐색
            String[] candidatePaths = {
                "e:/Vibe/Audit/manuals_ppt/" + PPT_FILENAME,
                "manuals_ppt/" + PPT_FILENAME,
                "../manuals_ppt/" + PPT_FILENAME,
                "backend/src/main/resources/manuals/" + PPT_FILENAME
            };

            for (String p : candidatePaths) {
                Path path = Paths.get(p);
                if (Files.exists(path)) {
                    fileBytes = Files.readAllBytes(path);
                    break;
                }
            }

            // 2. 클래스패스 탐색
            if (fileBytes == null) {
                ClassPathResource cpr = new ClassPathResource("manuals/" + PPT_FILENAME);
                if (cpr.exists()) {
                    try (InputStream is = cpr.getInputStream()) {
                        fileBytes = is.readAllBytes();
                    }
                }
            }

            if (fileBytes == null) {
                return ResponseEntity.notFound().build();
            }

            ByteArrayResource resource = new ByteArrayResource(fileBytes);
            String encodedFilename = URLEncoder.encode("글로벌세아_CAP관리시스템_통합사용자매뉴얼.pptx", StandardCharsets.UTF_8)
                    .replaceAll("\\+", "%20");

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
