package com.example.cap.repository;

import com.example.cap.entity.FindingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FindingHistoryRepository extends JpaRepository<FindingHistory, Long> {
    List<FindingHistory> findAllByFindingIdOrderByCreatedAtAsc(Long findingId);
    List<FindingHistory> findAllByFindingIdOrderByCreatedAtDesc(Long findingId);
}
