package com.example.cap.repository;

import com.example.cap.entity.Finding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FindingRepository extends JpaRepository<Finding, Long> {

    // 특정 프로젝트에 속한 발견사항 목록 조회
    List<Finding> findAllByProjectProjectId(Long projectId);
    List<Finding> findByProject_ProjectId(Long projectId);

    // 타 법인 데이터 격리 조회 (프로젝트 법인 ID와 매칭)
    @Query("SELECT f FROM Finding f JOIN f.project p WHERE p.corpId = :corpId")
    List<Finding> findAllByCorpId(@Param("corpId") String corpId);
}
