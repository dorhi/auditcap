-- =========================================================================
-- CAP Monitoring System - MS SQL Server 스키마 스크립트 (수동 실행용)
-- =========================================================================

-- 1. [기존 테이블 구조 변경] CAPS_USERS 테이블에 enabled(사용안함 상태관리용) 컬럼 추가
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_USERS')
BEGIN
    IF NOT EXISTS (
        SELECT * FROM sys.columns 
        WHERE object_id = OBJECT_ID('CAPS_USERS') AND name = 'enabled'
    )
    BEGIN
        ALTER TABLE CAPS_USERS ADD enabled BIT NOT NULL DEFAULT 1;
        PRINT 'SUCCESS: CAPS_USERS 테이블에 enabled 컬럼이 추가되었습니다.';
    END
    ELSE
    BEGIN
        PRINT 'INFO: CAPS_USERS 테이블에 enabled 컬럼이 이미 존재합니다.';
    END
END

-- 2. CAPS_USERS (임직원 계정) 테이블 생성
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_USERS')
BEGIN
    CREATE TABLE CAPS_USERS (
        user_id BIGINT IDENTITY(1,1) NOT NULL,
        username VARCHAR(50) NOT NULL,
        password VARCHAR(100) NULL,
        name VARCHAR(50) NOT NULL,
        email VARCHAR(100) NULL,
        corp_id VARCHAR(50) NOT NULL,
        dept_name VARCHAR(100) NULL,
        role VARCHAR(30) NOT NULL,
        approval_status VARCHAR(20) NOT NULL CONSTRAINT DF_CAPS_USERS_approval_status DEFAULT 'PENDING',
        otp_secret VARCHAR(100) NULL,
        is_otp_registered BIT NOT NULL CONSTRAINT DF_CAPS_USERS_is_otp DEFAULT 0,
        enabled BIT NOT NULL CONSTRAINT DF_CAPS_USERS_enabled DEFAULT 1,
        created_at DATETIME2 NOT NULL,
        CONSTRAINT PK_CAPS_USERS PRIMARY KEY (user_id),
        CONSTRAINT UQ_CAPS_USERS_username UNIQUE (username)
    );
    PRINT 'SUCCESS: CAPS_USERS 테이블이 생성되었습니다.';
END

-- 3. CAPS_PROJECTS (감사 프로젝트) 테이블 생성
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_PROJECTS')
BEGIN
    CREATE TABLE CAPS_PROJECTS (
        project_id BIGINT IDENTITY(1,1) NOT NULL,
        project_name VARCHAR(100) NOT NULL,
        corp_id VARCHAR(50) NOT NULL,
        assigned_depts NVARCHAR(500) NULL,
        deadline_1st DATETIME2 NULL,
        deadline_2nd DATETIME2 NULL,
        deadline_3rd DATETIME2 NULL,
        project_state VARCHAR(20) NOT NULL CONSTRAINT DF_CAPS_PROJECTS_state DEFAULT 'OPEN',
        created_by VARCHAR(50) NOT NULL,
        created_at DATETIME2 NOT NULL,
        CONSTRAINT PK_CAPS_PROJECTS PRIMARY KEY (project_id)
    );
    PRINT 'SUCCESS: CAPS_PROJECTS 테이블이 생성되었습니다.';
END

-- 4. CAPS_FINDINGS (감사 지적 사항) 테이블 생성
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_FINDINGS')
BEGIN
    CREATE TABLE CAPS_FINDINGS (
        finding_id BIGINT IDENTITY(1,1) NOT NULL,
        project_id BIGINT NOT NULL,
        category VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        finding_text NVARCHAR(MAX) NULL,
        auditors_in_charge NVARCHAR(500) NULL,
        assigned_user_id VARCHAR(50) NULL,
        assigned_dept_name VARCHAR(100) NULL,
        action_text NVARCHAR(MAX) NULL,
        finding_state VARCHAR(30) NOT NULL CONSTRAINT DF_CAPS_FINDINGS_state DEFAULT 'OPEN',
        target_date DATETIME2 NULL,
        target_date_text VARCHAR(100) NULL,
        approval_status VARCHAR(30) NULL CONSTRAINT DF_CAPS_FINDINGS_app_status DEFAULT 'DRAFT',
        lead_approved_by VARCHAR(50) NULL,
        lead_approved_at DATETIME2 NULL,
        lead_comment NVARCHAR(500) NULL,
        head_approved_by VARCHAR(50) NULL,
        head_approved_at DATETIME2 NULL,
        head_comment NVARCHAR(500) NULL,
        rejected_reason NVARCHAR(500) NULL,
        last_submitted_by VARCHAR(50) NULL,
        last_submitted_at DATETIME2 NULL,
        audit_review_comment NVARCHAR(500) NULL,
        audit_reviewed_by VARCHAR(50) NULL,
        audit_reviewed_at DATETIME2 NULL,
        CONSTRAINT PK_CAPS_FINDINGS PRIMARY KEY (finding_id),
        CONSTRAINT FK_CAPS_FINDINGS_PROJECT FOREIGN KEY (project_id) REFERENCES CAPS_PROJECTS (project_id)
    );
    PRINT 'SUCCESS: CAPS_FINDINGS 테이블이 생성되었습니다.';
END

-- 5. CAPS_ATTACHMENTS (증빙 파일 첨부) 테이블 생성
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_ATTACHMENTS')
BEGIN
    CREATE TABLE CAPS_ATTACHMENTS (
        file_id BIGINT IDENTITY(1,1) NOT NULL,
        reference_id BIGINT NOT NULL,
        upload_type VARCHAR(50) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(1000) NOT NULL,
        file_size BIGINT NOT NULL,
        uploaded_by VARCHAR(50) NOT NULL,
        uploaded_at DATETIME2 NOT NULL,
        CONSTRAINT PK_CAPS_ATTACHMENTS PRIMARY KEY (file_id),
        CONSTRAINT FK_CAPS_ATTACHMENTS_FINDING FOREIGN KEY (reference_id) REFERENCES CAPS_FINDINGS (finding_id)
    );
    PRINT 'SUCCESS: CAPS_ATTACHMENTS 테이블이 생성되었습니다.';
END

-- 6. CAPS_COMMENTS (댓글 및 피드백) 테이블 생성
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_COMMENTS')
BEGIN
    CREATE TABLE CAPS_COMMENTS (
        comment_id BIGINT IDENTITY(1,1) NOT NULL,
        finding_id BIGINT NOT NULL,
        comment_text VARCHAR(1000) NOT NULL,
        created_by VARCHAR(50) NOT NULL,
        created_at DATETIME2 NOT NULL,
        is_deleted BIT NOT NULL CONSTRAINT DF_CAPS_COMMENTS_is_deleted DEFAULT 0,
        CONSTRAINT PK_CAPS_COMMENTS PRIMARY KEY (comment_id),
        CONSTRAINT FK_CAPS_COMMENTS_FINDING FOREIGN KEY (finding_id) REFERENCES CAPS_FINDINGS (finding_id)
    );
    PRINT 'SUCCESS: CAPS_COMMENTS 테이블이 생성되었습니다.';
END

-- 7. CAPS_REPORT_HISTORY (진행률 보고서 이력) 테이블 생성
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_REPORT_HISTORY')
BEGIN
    CREATE TABLE CAPS_REPORT_HISTORY (
        report_id BIGINT IDENTITY(1,1) NOT NULL,
        project_id BIGINT NOT NULL,
        generation_type VARCHAR(50) NOT NULL,
        report_version VARCHAR(20) NOT NULL,
        file_path VARCHAR(1000) NOT NULL,
        created_by VARCHAR(50) NOT NULL,
        created_at DATETIME2 NOT NULL,
        CONSTRAINT PK_CAPS_REPORT_HISTORY PRIMARY KEY (report_id),
        CONSTRAINT FK_CAPS_REPORT_HISTORY_PROJECT FOREIGN KEY (project_id) REFERENCES CAPS_PROJECTS (project_id)
    );
    PRINT 'SUCCESS: CAPS_REPORT_HISTORY 테이블이 생성되었습니다.';
END

-- 8. CAPS_MENUS (화면 및 메뉴 관리) 테이블 생성
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_MENUS')
BEGIN
    CREATE TABLE CAPS_MENUS (
        menu_id BIGINT IDENTITY(1,1) NOT NULL,
        menu_code VARCHAR(50) NOT NULL,
        menu_name NVARCHAR(100) NOT NULL,
        group_name NVARCHAR(100) NULL,
        group_order INT NOT NULL CONSTRAINT DF_CAPS_MENUS_gorder DEFAULT 1,
        menu_path VARCHAR(200) NULL,
        icon NVARCHAR(50) NULL,
        sort_order INT NOT NULL CONSTRAINT DF_CAPS_MENUS_sort DEFAULT 0,
        description NVARCHAR(500) NULL,
        screen_type VARCHAR(30) NOT NULL CONSTRAINT DF_CAPS_MENUS_screen_type DEFAULT 'INTERNAL',
        custom_content NVARCHAR(MAX) NULL,
        enabled BIT NOT NULL CONSTRAINT DF_CAPS_MENUS_enabled DEFAULT 1,
        created_at DATETIME2 NOT NULL,
        updated_at DATETIME2 NULL,
        CONSTRAINT PK_CAPS_MENUS PRIMARY KEY (menu_id),
        CONSTRAINT UQ_CAPS_MENUS_menu_code UNIQUE (menu_code)
    );
    PRINT 'SUCCESS: CAPS_MENUS 테이블이 생성되었습니다.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_MENUS') AND name = 'group_name')
    BEGIN
        ALTER TABLE CAPS_MENUS ADD group_name NVARCHAR(100) NULL;
    END
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_MENUS') AND name = 'group_order')
    BEGIN
        ALTER TABLE CAPS_MENUS ADD group_order INT NOT NULL CONSTRAINT DF_CAPS_MENUS_gorder_alt DEFAULT 1;
    END
END

-- 9. CAPS_ROLE_MENU_PERMISSIONS (역할별 화면 접근 권한) 테이블 생성
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_ROLE_MENU_PERMISSIONS')
BEGIN
    CREATE TABLE CAPS_ROLE_MENU_PERMISSIONS (
        permission_id BIGINT IDENTITY(1,1) NOT NULL,
        role VARCHAR(30) NOT NULL,
        menu_id BIGINT NOT NULL,
        has_access BIT NOT NULL CONSTRAINT DF_CAPS_ROLE_PERM_access DEFAULT 1,
        updated_at DATETIME2 NULL,
        CONSTRAINT PK_CAPS_ROLE_MENU_PERMISSIONS PRIMARY KEY (permission_id),
        CONSTRAINT FK_CAPS_ROLE_PERM_MENU FOREIGN KEY (menu_id) REFERENCES CAPS_MENUS (menu_id) ON DELETE CASCADE,
        CONSTRAINT UQ_CAPS_ROLE_MENU UNIQUE (role, menu_id)
    );
    PRINT 'SUCCESS: CAPS_ROLE_MENU_PERMISSIONS 테이블이 생성되었습니다.';
END

-- 10. CAPS_CATEGORIES (지적사항 분류 카테고리 관리) 테이블 생성
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_CATEGORIES')
BEGIN
    CREATE TABLE CAPS_CATEGORIES (
        category_id BIGINT IDENTITY(1,1) NOT NULL,
        category_name VARCHAR(100) NOT NULL,
        sort_order INT NULL CONSTRAINT DF_CAPS_CAT_order DEFAULT 1,
        enabled BIT NOT NULL CONSTRAINT DF_CAPS_CAT_enabled DEFAULT 1,
        created_at DATETIME2 NOT NULL,
        CONSTRAINT PK_CAPS_CATEGORIES PRIMARY KEY (category_id),
        CONSTRAINT UQ_CAPS_CATEGORIES_name UNIQUE (category_name)
    );
    PRINT 'SUCCESS: CAPS_CATEGORIES 테이블이 생성되었습니다.';
END

-- 11. CAPS_FINDINGS 1차, 2차, 3차 조치기한 컬럼 추가
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
END

-- 12. CAPS_FINDINGS 감사팀 예상 마감일, 법인 조치 마감기한, 조치상태코드 컬럼 추가
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_FINDINGS')
BEGIN
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
END

-- 13. CAPS_FINDING_HISTORIES (지적사항 조치 및 검토 이력 타임라인) 테이블 생성
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
    PRINT 'SUCCESS: CAPS_FINDING_HISTORIES 테이블이 생성되었습니다.';
END

-- 14. CAPS_FINDINGS 개선완료일자 및 부모 CAP ID 추가
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_FINDINGS')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'completion_date')
    BEGIN
        ALTER TABLE CAPS_FINDINGS ADD completion_date DATETIME2 NULL;
    END
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'parent_finding_id')
    BEGIN
        ALTER TABLE CAPS_FINDINGS ADD parent_finding_id BIGINT NULL;
    END
END

-- 15. CAPS_PROJECTS 부모 프로젝트 ID 및 차수 추가
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_PROJECTS')
BEGIN
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
