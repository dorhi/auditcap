package com.example.cap.repository;

import com.example.cap.entity.AccessLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AccessLogRepository extends JpaRepository<AccessLog, Long>, JpaSpecificationExecutor<AccessLog> {

    // 최근 N건 조회
    List<AccessLog> findTop100ByOrderByCreatedAtDesc();

    // 기간별 로그 건수 통계
    long countByLogTypeAndCreatedAtBetween(String logType, LocalDateTime start, LocalDateTime end);

    long countByLogTypeAndStatusAndCreatedAtBetween(String logType, String status, LocalDateTime start, LocalDateTime end);

    // 일별/유형별 통계용
    @Query("SELECT l.status, COUNT(l) FROM AccessLog l WHERE l.logType = 'LOGIN' AND l.createdAt >= :since GROUP BY l.status")
    List<Object[]> getLoginStatsSince(LocalDateTime since);
}
