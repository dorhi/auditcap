package com.example.cap.controller;

import com.example.cap.entity.AccessLog;
import com.example.cap.security.CustomUserInfo;
import com.example.cap.service.AccessLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.PrintWriter;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class AccessLogController {

    private final AccessLogService accessLogService;

    /**
     * 화면/메뉴 접속 로그 적재 API (모든 인증 사용자 허용)
     */
    @PostMapping("/page-access")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> recordPageAccess(@RequestBody PageAccessRequest request, HttpServletRequest httpRequest) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = "ANONYMOUS";
            String name = "";
            String corpId = "";
            String deptName = "";
            String role = "";

            if (auth != null && auth.getPrincipal() instanceof CustomUserInfo userInfo) {
                username = userInfo.getUsername();
                name = userInfo.getName();
                corpId = userInfo.getCorpId();
                deptName = userInfo.getDeptName();
                role = userInfo.getRole();
            }

            String clientIp = getClientIp(httpRequest);
            String userAgent = httpRequest.getHeader("User-Agent");

            accessLogService.recordPageAccess(
                    username, name, corpId, deptName, role,
                    request.getResolvedMenuCode(), request.getResolvedMenuName(),
                    clientIp, userAgent
            );

            return ResponseEntity.ok(Map.of("status", "SUCCESS"));
        } catch (Exception e) {
            log.warn("화면 접속 로그 기록 중 오류 (무시): {}", e.getMessage());
            return ResponseEntity.ok(Map.of("status", "IGNORED"));
        }
    }

    /**
     * 감사 로그 페이징 검색 API (시스템 관리자 및 감사 책임자 전용)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER')")
    public ResponseEntity<Page<AccessLog>> getAccessLogs(
            @RequestParam(required = false, defaultValue = "ALL") String logType,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<AccessLog> result = accessLogService.searchLogs(logType, status, keyword, startDate, endDate, page, size);
        return ResponseEntity.ok(result);
    }

    /**
     * 대시보드 통계 요약 (시스템 관리자 및 감사 책임자 전용)
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER')")
    public ResponseEntity<Map<String, Object>> getLogStats() {
        return ResponseEntity.ok(accessLogService.getLogStats());
    }

    /**
     * 로그 CSV 내보내기 (최대 2,000건)
     */
    @GetMapping("/export-csv")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER')")
    public void exportLogsCsv(
            @RequestParam(required = false, defaultValue = "ALL") String logType,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            HttpServletResponse response
    ) {
        try {
            Page<AccessLog> result = accessLogService.searchLogs(logType, status, keyword, startDate, endDate, 0, 2000);

            String filename = "시스템_접속_감사로그_" + System.currentTimeMillis() + ".csv";
            String encodedFilename = URLEncoder.encode(filename, StandardCharsets.UTF_8).replaceAll("\\+", "%20");

            response.setContentType("text/csv; charset=UTF-8");
            response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + encodedFilename + "\"");

            PrintWriter writer = response.getWriter();
            // UTF-8 BOM 쓰기 (Excel 한글 깨짐 방지)
            writer.write('\ufeff');

            // CSV 헤더
            writer.println("로그ID,로그유형,발생일시,사용자ID,성명,소속법인,부서명,역할,대상화면코드,대상화면명,작업내용,상태,실패사유,접속IP,기기정보");

            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            for (AccessLog log : result.getContent()) {
                String row = String.format("\"%d\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"",
                        log.getLogId() != null ? log.getLogId() : 0,
                        escapeCsv(log.getLogType()),
                        log.getCreatedAt() != null ? log.getCreatedAt().format(dtf) : "",
                        escapeCsv(log.getUsername()),
                        escapeCsv(log.getUserName()),
                        escapeCsv(log.getCorpId()),
                        escapeCsv(log.getDeptName()),
                        escapeCsv(log.getRole()),
                        escapeCsv(log.getTargetMenuCode()),
                        escapeCsv(log.getTargetMenuName()),
                        escapeCsv(log.getActionDetails()),
                        escapeCsv(log.getStatus()),
                        escapeCsv(log.getFailureReason()),
                        escapeCsv(log.getClientIp()),
                        escapeCsv(log.getUserAgent())
                );
                writer.println(row);
            }
            writer.flush();
        } catch (Exception e) {
            log.error("CSV 내보내기 실패: {}", e.getMessage(), e);
        }
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        return value.replace("\"", "\"\"").replace("\r", "").replace("\n", " ");
    }

    public static String getClientIp(HttpServletRequest request) {
        if (request == null) return "UNKNOWN";
        String[] headers = {
                "X-Forwarded-For",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP",
                "HTTP_CLIENT_IP",
                "HTTP_X_FORWARDED_FOR"
        };
        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                // X-Forwarded-For의 경우 프록시 체인 중 첫 번째 IP가 원본 클라이언트 IP
                return ip.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    @Data
    public static class PageAccessRequest {
        private String menuCode;
        private String menuName;
        private String targetMenuCode;
        private String targetMenuName;

        public String getResolvedMenuCode() {
            if (menuCode != null && !menuCode.isBlank()) return menuCode;
            return targetMenuCode;
        }

        public String getResolvedMenuName() {
            if (menuName != null && !menuName.isBlank()) return menuName;
            return targetMenuName;
        }
    }
}
