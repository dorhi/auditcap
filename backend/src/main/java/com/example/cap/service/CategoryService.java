package com.example.cap.service;

import com.example.cap.entity.Category;
import com.example.cap.repository.CategoryRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @PostConstruct
    @Transactional
    public void seedInitialCategories() {
        try {
            // 1. CAPS_CATEGORIES 테이블 생성 (없는 경우)
            jdbcTemplate.execute("""
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_CATEGORIES')
                BEGIN
                    CREATE TABLE CAPS_CATEGORIES (
                        category_id BIGINT IDENTITY(1,1) NOT NULL,
                        category_name VARCHAR(100) NOT NULL,
                        sort_order INT NULL DEFAULT 1,
                        enabled BIT NOT NULL DEFAULT 1,
                        created_at DATETIME2 NOT NULL,
                        CONSTRAINT PK_CAPS_CATEGORIES PRIMARY KEY (category_id),
                        CONSTRAINT UQ_CAPS_CATEGORIES_name UNIQUE (category_name)
                    );
                END
                """);

            // 2. CAPS_FINDINGS 테이블에 deadline_1st, deadline_2nd, deadline_3rd 컬럼 추가 (없는 경우)
            jdbcTemplate.execute("""
                IF EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_FINDINGS')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'deadline_1st')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD deadline_1st DATETIME2 NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'deadline_2nd')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD deadline_2nd DATETIME2 NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'deadline_3rd')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD deadline_3rd DATETIME2 NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'auditors_in_charge')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD auditors_in_charge NVARCHAR(500) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'expected_deadline')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD expected_deadline DATETIME2 NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'action_deadline')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD action_deadline DATETIME2 NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'action_status_code')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD action_status_code VARCHAR(50) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'completion_date')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD completion_date DATETIME2 NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'parent_finding_id')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD parent_finding_id BIGINT NULL;
                    END
                END
                """);

            // CAPS_PROJECTS 테이블에 법인장 최종 확정 컬럼 및 연계 프로젝트 컬럼 추가
            jdbcTemplate.execute("""
                IF EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_PROJECTS')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_PROJECTS') AND name = 'head_confirmed_by')
                    BEGIN
                        ALTER TABLE CAPS_PROJECTS ADD head_confirmed_by VARCHAR(50) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_PROJECTS') AND name = 'head_confirmed_at')
                    BEGIN
                        ALTER TABLE CAPS_PROJECTS ADD head_confirmed_at DATETIME2 NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_PROJECTS') AND name = 'head_comment')
                    BEGIN
                        ALTER TABLE CAPS_PROJECTS ADD head_comment NVARCHAR(500) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_PROJECTS') AND name = 'parent_project_id')
                    BEGIN
                        ALTER TABLE CAPS_PROJECTS ADD parent_project_id BIGINT NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_PROJECTS') AND name = 'parent_project_name')
                    BEGIN
                        ALTER TABLE CAPS_PROJECTS ADD parent_project_name NVARCHAR(100) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_PROJECTS') AND name = 'round')
                    BEGIN
                        ALTER TABLE CAPS_PROJECTS ADD round INT NULL DEFAULT 1;
                    END
                END
                """);

            // 3. CAPS_FINDING_HISTORIES 테이블 생성 (없는 경우)
            jdbcTemplate.execute("""
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_FINDING_HISTORIES')
                BEGIN
                    CREATE TABLE CAPS_FINDING_HISTORIES (
                        history_id BIGINT IDENTITY(1,1) NOT NULL,
                        finding_id BIGINT NOT NULL,
                        action_type VARCHAR(50) NOT NULL,
                        actor_id VARCHAR(50) NOT NULL,
                        actor_name NVARCHAR(50) NULL,
                        actor_role VARCHAR(50) NULL,
                        action_status_code VARCHAR(50) NULL,
                        action_deadline DATETIME2 NULL,
                        action_text NVARCHAR(MAX) NULL,
                        comment NVARCHAR(1000) NULL,
                        created_at DATETIME2 NOT NULL,
                        CONSTRAINT PK_CAPS_FINDING_HISTORIES PRIMARY KEY (history_id),
                        CONSTRAINT FK_CAPS_HISTORIES_FINDING FOREIGN KEY (finding_id) REFERENCES CAPS_FINDINGS (finding_id) ON DELETE CASCADE
                    );
                END
                """);
        } catch (Exception e) {
            System.err.println("Database auto-patch error: " + e.getMessage());
        }

        try {
            if (categoryRepository.count() == 0) {
                String[] initial = {"재무", "IT보안", "운영", "컴플라이언스"};
                for (int i = 0; i < initial.length; i++) {
                    categoryRepository.save(Category.builder()
                            .categoryName(initial[i])
                            .sortOrder(i + 1)
                            .enabled(true)
                            .build());
                }
            }
        } catch (Exception e) {
            System.err.println("Category seeding error: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<Category> getActiveCategories() {
        return categoryRepository.findAllByEnabledTrueOrderBySortOrderAsc();
    }

    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findAllByOrderBySortOrderAsc();
    }

    @Transactional
    public Category createCategory(String categoryName, Integer sortOrder) {
        String trimmed = categoryName != null ? categoryName.trim() : "";
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("카테고리 명칭을 입력해 주세요.");
        }
        if (categoryRepository.findByCategoryName(trimmed).isPresent()) {
            throw new IllegalArgumentException("이미 존재하는 카테고리입니다.");
        }

        Category category = Category.builder()
                .categoryName(trimmed)
                .sortOrder(sortOrder != null ? sortOrder : 1)
                .enabled(true)
                .build();
        return categoryRepository.save(category);
    }

    @Transactional
    public Category updateCategory(Long categoryId, String categoryName, Integer sortOrder, Boolean enabled) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다. ID: " + categoryId));

        if (categoryName != null && !categoryName.trim().isEmpty()) {
            String trimmed = categoryName.trim();
            if (!trimmed.equalsIgnoreCase(category.getCategoryName()) &&
                    categoryRepository.findByCategoryName(trimmed).isPresent()) {
                throw new IllegalArgumentException("이미 존재하는 카테고리 명칭입니다.");
            }
            category.setCategoryName(trimmed);
        }

        if (sortOrder != null) {
            category.setSortOrder(sortOrder);
        }
        if (enabled != null) {
            category.setEnabled(enabled);
        }

        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(Long categoryId) {
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 카테고리입니다. ID: " + categoryId));
        categoryRepository.delete(category);
    }
}
