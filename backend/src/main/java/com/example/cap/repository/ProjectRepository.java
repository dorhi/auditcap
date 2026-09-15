package com.example.cap.repository;

import com.example.cap.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    
    // 법인별 프로젝트 조회 (법인 격리용)
    List<Project> findAllByCorpId(String corpId);
}
