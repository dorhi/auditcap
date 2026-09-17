package com.example.cap.service;

import com.example.cap.entity.AccessLog;
import com.example.cap.repository.AccessLogRepository;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccessLogService {

    private final AccessLogRepository logRepository;
    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
        ensureTableExists();
    }

    /**
     * MS SQL Server 기준 CAPS_ACCESS_LOGS 테이블 자동 생성 보장
     */
    public void ensureTableExists() {
        try {
            String ddl = """
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_ACCESS_LOGS')
                BEGIN
                    CREATE TABLE CAPS_ACCESS_LOGS (
                        log_id BIGINT IDENTITY(1,1) NOT NULL,
                        log_type VARCHAR(30) NOT NULL,
                        username VARCHAR(50) NULL,
                        user_name NVARCHAR(50) NULL,
                        corp_id VARCHAR(50) NULL,
                        dept_name NVARCHAR(100) NULL,
                        role VARCHAR(30) NULL,
                        target_menu_code VARCHAR(50) NULL,
                        target_menu_name NVARCHAR(100) NULL,
                        action_details NVARCHAR(500) NULL,
                        status VARCHAR(20) NOT NULL CONSTRAINT DF_CAPS_ACCESS_LOGS_status DEFAULT 'SUCCESS',
                        failure_reason NVARCHAR(500) NULL,
                        client_ip VARCHAR(50) NULL,
                        user_agent NVARCHAR(300) NULL,
                        created_at DATETIME2 NOT NULL,
                        CONSTRAINT PK_CAPS_ACCESS_LOGS PRIMARY KEY (log_id)
                    );

                    CREATE INDEX IDX_ACCESS_LOGS_CREATED_AT ON CAPS_ACCESS_LOGS (created_at DESC);
                    CREATE INDEX IDX_ACCESS_LOGS_TYPE ON CAPS_ACCESS_LOGS (log_type);
                    CREATE INDEX IDX_ACCESS_LOGS_USERNAME ON CAPS_ACCESS_LOGS (username);
                    CREATE INDEX IDX_ACCESS_LOGS_STATUS ON CAPS_ACCESS_LOGS (status);
                END
            """;
            jdbcTemplate.execute(ddl);
            log.info("CAPS_ACCESS_LOGS table and indexes verified/created successfully.");
        } catch (Exception e) {
            log.warn("Notice checking CAPS_ACCESS_LOGS table: {}", e.getMessage());
        }
    }

    /**
     * 로그인 성공 감사 로그 기록
     */
    @Transactional
    public void recordLoginSuccess(String username, String name, String corpId, String deptName, String role, String ip, String userAgent) {
        try {
            AccessLog logEntry = AccessLog.builder()
                    .logType("LOGIN")
                    .username(username)
                    .userName(name)
                    .corpId(corpId)
                    .deptName(deptName)
                    .role(role)
                    .actionDetails("시스템 로그인 성공")
                    .status("SUCCESS")
                    .failureReason(null)
                    .clientIp(ip)
                    .userAgent(userAgent)
                    .createdAt(LocalDateTime.now())
                    .build();
            logRepository.save(logEntry);
            log.info("로그인 성공 로그 저장: username={}, ip={}", username, ip);
        } catch (Exception ex) {
            log.error("로그인 성공 로그 저장 실패: {}", ex.getMessage());
        }
    }

    /**
     * 로그인 실패 감사 로그 기록 (구체적 실패 사유 포함)
     */
    @Transactional
    public void recordLoginFailure(String username, String failureReason, String ip, String userAgent) {
        try {
            AccessLog logEntry = AccessLog.builder()
                    .logType("LOGIN")
                    .username(username)
                    .userName(null)
                    .corpId(null)
                    .deptName(null)
                    .role(null)
                    .actionDetails("시스템 로그인 실패")
                    .status("FAILED")
                    .failureReason(failureReason)
                    .clientIp(ip)
                    .userAgent(userAgent)
                    .createdAt(LocalDateTime.now())
                    .build();
            logRepository.save(logEntry);
            log.warn("로그인 실패 로그 저장: username={}, reason={}, ip={}", username, failureReason, ip);
        } catch (Exception ex) {
            log.error("로그인 실패 로그 저장 실패: {}", ex.getMessage());
        }
    }

    /**
     * 화면/메뉴 접속 감사 로그 기록
     */
    @Transactional
    public void recordPageAccess(String username, String name, String corpId, String deptName, String role,
                                 String menuCode, String menuName, String ip, String userAgent) {
        try {
            String details = (menuName != null ? menuName : menuCode) + " 화면 접속";
            AccessLog logEntry = AccessLog.builder()
                    .logType("PAGE_ACCESS")
                    .username(username)
                    .userName(name)
                    .corpId(corpId)
                    .deptName(deptName)
                    .role(role)
                    .targetMenuCode(menuCode)
                    .targetMenuName(menuName)
                    .actionDetails(details)
                    .status("SUCCESS")
                    .failureReason(null)
                    .clientIp(ip)
                    .userAgent(userAgent)
                    .createdAt(LocalDateTime.now())
                    .build();
            logRepository.save(logEntry);
        } catch (Exception ex) {
            log.error("화면 접속 로그 저장 실패: {}", ex.getMessage());
        }
    }

    /**
     * 감사 로그 다이나믹 조건 검색 및 페이징
     */
    @Transactional(readOnly = true)
    public Page<AccessLog> searchLogs(String logType, String status, String keyword,
                                      String startDateStr, String endDateStr,
                                      int page, int size) {
        Specification<AccessLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. 로그 유형 필터 (LOGIN, PAGE_ACCESS, ALL)
            if (logType != null && !logType.trim().isEmpty() && !"ALL".equalsIgnoreCase(logType)) {
                predicates.add(cb.equal(root.get("logType"), logType.trim()));
            }

            // 2. 상태 필터 (SUCCESS, FAILED, ALL)
            if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("status"), status.trim()));
            }

            // 3. 날짜 범위 필터 (startDate ~ endDate)
            if (startDateStr != null && !startDateStr.trim().isEmpty()) {
                try {
                    LocalDate sDate = LocalDate.parse(startDateStr.trim());
                    predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), sDate.atStartOfDay()));
                } catch (Exception ignored) {}
            }
            if (endDateStr != null && !endDateStr.trim().isEmpty()) {
                try {
                    LocalDate eDate = LocalDate.parse(endDateStr.trim());
                    predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), eDate.atTime(LocalTime.MAX)));
                } catch (Exception ignored) {}
            }

            // 4. 통합 키워드 검색 (username, userName, corpId, deptName, targetMenuName, failureReason, clientIp)
            if (keyword != null && !keyword.trim().isEmpty()) {
                String likePattern = "%" + keyword.trim().toLowerCase() + "%";
                Predicate keywordPredicate = cb.or(
                        cb.like(cb.lower(root.get("username")), likePattern),
                        cb.like(cb.lower(root.get("userName")), likePattern),
                        cb.like(cb.lower(root.get("corpId")), likePattern),
                        cb.like(cb.lower(root.get("deptName")), likePattern),
                        cb.like(cb.lower(root.get("targetMenuName")), likePattern),
                        cb.like(cb.lower(root.get("actionDetails")), likePattern),
                        cb.like(cb.lower(root.get("failureReason")), likePattern),
                        cb.like(cb.lower(root.get("clientIp")), likePattern)
                );
                predicates.add(keywordPredicate);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size), Sort.by(Sort.Direction.DESC, "createdAt"));
        return logRepository.findAll(spec, pageable);
    }

    /**
     * 대시보드 요약 통계 (오늘 기준)
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getLogStats() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);

        long todayLoginSuccess = logRepository.countByLogTypeAndStatusAndCreatedAtBetween("LOGIN", "SUCCESS", todayStart, todayEnd);
        long todayLoginFailed = logRepository.countByLogTypeAndStatusAndCreatedAtBetween("LOGIN", "FAILED", todayStart, todayEnd);
        long todayPageAccess = logRepository.countByLogTypeAndCreatedAtBetween("PAGE_ACCESS", todayStart, todayEnd);

        LocalDateTime weekStart = LocalDate.now().minusDays(7).atStartOfDay();
        long weekLoginSuccess = logRepository.countByLogTypeAndStatusAndCreatedAtBetween("LOGIN", "SUCCESS", weekStart, todayEnd);
        long weekLoginFailed = logRepository.countByLogTypeAndStatusAndCreatedAtBetween("LOGIN", "FAILED", weekStart, todayEnd);

        Map<String, Object> stats = new HashMap<>();
        stats.put("todayLoginSuccess", todayLoginSuccess);
        stats.put("todayLoginFailed", todayLoginFailed);
        stats.put("todayPageAccess", todayPageAccess);
        stats.put("weekLoginSuccess", weekLoginSuccess);
        stats.put("weekLoginFailed", weekLoginFailed);

        return stats;
    }
}
