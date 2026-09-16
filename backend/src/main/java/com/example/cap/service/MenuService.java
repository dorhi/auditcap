package com.example.cap.service;

import com.example.cap.dto.MenuRequestDto;
import com.example.cap.dto.RolePermissionDto;
import com.example.cap.entity.Menu;
import com.example.cap.entity.RoleMenuPermission;
import com.example.cap.entity.UserRole;
import com.example.cap.repository.MenuRepository;
import com.example.cap.repository.RoleMenuPermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MenuService implements CommandLineRunner {

    private final MenuRepository menuRepository;
    private final RoleMenuPermissionRepository permissionRepository;
    private final JdbcTemplate jdbcTemplate;
    private final com.example.cap.repository.UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        try {
            ensureTablesExist();
            seedDefaultMenusAndPermissions();
            seedDefaultAdminUser();
        } catch (Exception e) {
            log.error("Failed to initialize menu and permission default data on startup: {}", e.getMessage(), e);
        }
    }

    private void seedDefaultAdminUser() {
        try {
            if (userRepository.findByUsername("admin").isEmpty()) {
                com.example.cap.entity.User adminUser = com.example.cap.entity.User.builder()
                        .username("admin")
                        .password(passwordEncoder.encode("admin"))
                        .name("시스템관리자")
                        .corpId("글로벌세아")
                        .deptName("감사팀")
                        .email("admin@sae-a.com")
                        .role(com.example.cap.entity.UserRole.SYSTEM_ADMIN)
                        .approvalStatus("APPROVED")
                        .isOtpRegistered(false)
                        .enabled(true)
                        .build();
                userRepository.save(adminUser);
                log.info("Default admin user created successfully (username: admin, role: SYSTEM_ADMIN)");
            }
        } catch (Exception e) {
            log.warn("Notice seeding default admin user: {}", e.getMessage());
        }
    }

    public synchronized void ensureTablesAndSeed() {
        try {
            ensureTablesExist();
            seedDefaultMenusAndPermissions();
            seedDefaultAdminUser();
        } catch (Exception e) {
            log.error("Error checking or seeding menu data: {}", e.getMessage(), e);
        }
    }

    private void ensureTablesExist() {
        try {
            // CAPS_MENUS 테이블 생성 및 유니코드(NVARCHAR) 지원 확인 (MS SQL Server 기준)
            String createMenuTableSql = """
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
                END
                ELSE
                BEGIN
                    -- 기존 테이블 컬럼을 유니코드(NVARCHAR)로 변경하여 이모지 깨짐 방지
                    ALTER TABLE CAPS_MENUS ALTER COLUMN icon NVARCHAR(50) NULL;
                    ALTER TABLE CAPS_MENUS ALTER COLUMN menu_name NVARCHAR(100) NOT NULL;
                    ALTER TABLE CAPS_MENUS ALTER COLUMN description NVARCHAR(500) NULL;

                    -- group_name, group_order 컬럼 추가 확인
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_MENUS') AND name = 'group_name')
                    BEGIN
                        ALTER TABLE CAPS_MENUS ADD group_name NVARCHAR(100) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_MENUS') AND name = 'group_order')
                    BEGIN
                        ALTER TABLE CAPS_MENUS ADD group_order INT NOT NULL CONSTRAINT DF_CAPS_MENUS_gorder_alter DEFAULT 1;
                    END
                END
            """;
            jdbcTemplate.execute(createMenuTableSql);

            // CAPS_ROLE_MENU_PERMISSIONS 테이블 생성
            String createPermissionTableSql = """
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
                END
            """;
            jdbcTemplate.execute(createPermissionTableSql);

            // CAPS_PROJECTS 및 CAPS_FINDINGS 테이블 컬럼 자동 마이그레이션 (assigned_depts 및 결재선 컬럼)
            String alterOtherTablesSql = """
                IF EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_PROJECTS')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_PROJECTS') AND name = 'assigned_depts')
                    BEGIN
                        ALTER TABLE CAPS_PROJECTS ADD assigned_depts NVARCHAR(500) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_PROJECTS') AND name = 'audit_approval_status')
                    BEGIN
                        ALTER TABLE CAPS_PROJECTS ADD audit_approval_status VARCHAR(30) NULL,
                                                      auditor_reviewed_by VARCHAR(50) NULL,
                                                      auditor_reviewed_at DATETIME2 NULL,
                                                      auditor_comment NVARCHAR(500) NULL,
                                                      audit_leader_approved_by VARCHAR(50) NULL,
                                                      audit_leader_approved_at DATETIME2 NULL,
                                                      audit_leader_comment NVARCHAR(500) NULL,
                                                      audit_rejected_reason NVARCHAR(500) NULL;
                    END
                END

                IF EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPS_FINDINGS')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'approval_status')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD approval_status VARCHAR(30) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'lead_approved_by')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD lead_approved_by VARCHAR(50) NULL,
                                                      lead_approved_at DATETIME2 NULL,
                                                      lead_comment NVARCHAR(500) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'head_approved_by')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD head_approved_by VARCHAR(50) NULL,
                                                      head_approved_at DATETIME2 NULL,
                                                      head_comment NVARCHAR(500) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'rejected_reason')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD rejected_reason NVARCHAR(500) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'last_submitted_by')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD last_submitted_by VARCHAR(50) NULL,
                                                      last_submitted_at DATETIME2 NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'audit_review_comment')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD audit_review_comment NVARCHAR(500) NULL,
                                                      audit_reviewed_by VARCHAR(50) NULL,
                                                      audit_reviewed_at DATETIME2 NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CAPS_FINDINGS') AND name = 'related_depts')
                    BEGIN
                        ALTER TABLE CAPS_FINDINGS ADD related_depts NVARCHAR(500) NULL;
                    END

                    -- 복수 대상자 및 복수 부서 저장을 위한 컬럼 길이 확장
                    ALTER TABLE CAPS_FINDINGS ALTER COLUMN assigned_user_id NVARCHAR(500) NULL;
                    ALTER TABLE CAPS_FINDINGS ALTER COLUMN assigned_dept_name NVARCHAR(500) NULL;
                END
            """;
            jdbcTemplate.execute(alterOtherTablesSql);

            log.info("CAPS_MENUS, CAPS_PROJECTS, CAPS_FINDINGS tables checked/updated successfully.");
        } catch (Exception e) {
            log.warn("Table auto-creation/alter notice: {}", e.getMessage());
        }
    }

    @Transactional
    public void seedDefaultMenusAndPermissions() {
        // 기본 8개 메뉴 정의 (그룹핑: 감사 업무 관리, 시스템 관리)
        List<DefaultMenuDef> defaults = List.of(
            // 1. 감사 업무 관리 그룹
            new DefaultMenuDef("PROJECT_REGISTER", "프로젝트 신규 등록", "감사 업무 관리", 1, "/projects", "📊", 1, "새로운 감사 프로젝트를 생성하고 마감 기한을 정의합니다.", "INTERNAL", null, List.of(UserRole.SYSTEM_ADMIN, UserRole.AUDIT_LEADER, UserRole.AUDITOR)),
            new DefaultMenuDef("ACTION_PLAN_INPUT", "감사 조치계획 & 필수 정보 입력", "감사 업무 관리", 1, "/action-plans", "✏️", 2, "감사 지적 사항에 대한 개선 조치계획 및 증빙을 등록합니다.", "INTERNAL", null, Arrays.asList(UserRole.values())),
            new DefaultMenuDef("FINDING_MANAGEMENT", "감사 지적사항 (CAP) 관리", "감사 업무 관리", 1, "/findings", "🔍", 3, "감사 지적사항 등록 및 부서별 조치내역을 검토/피드백합니다.", "INTERNAL", null, List.of(UserRole.SYSTEM_ADMIN, UserRole.AUDIT_LEADER, UserRole.AUDITOR)),
            new DefaultMenuDef("HEAD_FINAL_APPROVAL", "법인장 프로젝트 최종 검증 및 확정", "감사 업무 관리", 1, "/head-final-approval", "🏛️", 4, "법인장 및 감사팀이 감사 프로젝트의 모든 CAP 조치 결과를 검증하고 최종 확정(CONFIRM) 및 동결(FREEZE)을 진행하는 전용 화면입니다.", "INTERNAL", null, List.of(UserRole.SYSTEM_ADMIN, UserRole.CORP_HEAD, UserRole.AUDIT_LEADER, UserRole.AUDITOR)),
            new DefaultMenuDef("REPORT_MONITORING", "법인별 전체 감사 조치율 보고", "감사 업무 관리", 1, "/reports", "📋", 5, "전체 법인 및 부서별 감사 이행률과 진행 상태를 모니터링합니다.", "INTERNAL", null, Arrays.asList(UserRole.values())),
            
            // 2. 시스템 관리 그룹
            new DefaultMenuDef("USER_MANAGEMENT", "사용자 계정 관리", "시스템 관리", 2, "/users", "👤", 1, "임직원 계정 승인 및 역할/사용상태를 관리합니다.", "INTERNAL", null, List.of(UserRole.SYSTEM_ADMIN, UserRole.AUDIT_LEADER)),
            new DefaultMenuDef("MENU_MANAGEMENT", "화면 / 메뉴 관리", "시스템 관리", 2, "/menus", "🖥️", 2, "시스템 내 화면 및 메뉴 목록을 등록/수정/삭제합니다.", "INTERNAL", null, List.of(UserRole.SYSTEM_ADMIN)),
            new DefaultMenuDef("ROLE_PERMISSION_MANAGEMENT", "역할별 화면 접근 관리", "시스템 관리", 2, "/permissions", "🔐", 3, "사용자 역할(Role)별 접근 가능한 화면을 매트릭스로 제어합니다.", "INTERNAL", null, List.of(UserRole.SYSTEM_ADMIN))
        );

        for (DefaultMenuDef def : defaults) {
            Menu menu = menuRepository.findByMenuCode(def.menuCode).orElse(null);
            if (menu == null) {
                menu = Menu.builder()
                        .menuCode(def.menuCode)
                        .menuName(def.menuName)
                        .groupName(def.groupName)
                        .groupOrder(def.groupOrder)
                        .menuPath(def.menuPath)
                        .icon(def.icon)
                        .sortOrder(def.sortOrder)
                        .description(def.description)
                        .screenType(def.screenType)
                        .customContent(def.customContent)
                        .enabled(true)
                        .build();
                menu = menuRepository.save(menu);
                log.info("Default menu created: {}", def.menuCode);
            } else {
                boolean needUpdate = false;
                // 아이콘 깨짐 복구
                if (menu.getIcon() == null || menu.getIcon().contains("?") || !menu.getIcon().equals(def.icon)) {
                    menu.setIcon(def.icon);
                    needUpdate = true;
                }
                // 그룹명 및 그룹순서가 비어있을 때 복구
                if (menu.getGroupName() == null || menu.getGroupName().trim().isEmpty() || "기타 메뉴".equals(menu.getGroupName())) {
                    menu.setGroupName(def.groupName);
                    menu.setGroupOrder(def.groupOrder);
                    needUpdate = true;
                }
                if (needUpdate) {
                    menuRepository.save(menu);
                    log.info("Synced default menu properties for: {}", def.menuCode);
                }
            }

            // 권한 시딩
            for (UserRole role : UserRole.values()) {
                boolean defaultHasAccess = def.allowedRoles.contains(role);
                Optional<RoleMenuPermission> existingPerm = permissionRepository.findByRoleAndMenu(role, menu);
                if (existingPerm.isEmpty()) {
                    RoleMenuPermission perm = RoleMenuPermission.builder()
                            .role(role)
                            .menu(menu)
                            .hasAccess(defaultHasAccess)
                            .build();
                    permissionRepository.save(perm);
                }
            }
        }
    }

    private record DefaultMenuDef(
        String menuCode,
        String menuName,
        String groupName,
        Integer groupOrder,
        String menuPath,
        String icon,
        Integer sortOrder,
        String description,
        String screenType,
        String customContent,
        List<UserRole> allowedRoles
    ) {}

    /**
     * 현재 로그인 사용자의 Role에 허용된 활성 메뉴 목록 조회 (그룹순서, 화면순서 정렬)
     */
    @Transactional
    public List<Menu> getMyMenus(UserRole role) {
        if (role == null) {
            return Collections.emptyList();
        }
        ensureTablesAndSeed();
        return permissionRepository.findAccessibleMenusByRole(role);
    }

    /**
     * 전체 메뉴 목록 조회 (그룹순서, 화면순서 기준 정렬)
     */
    @Transactional
    public List<Menu> getAllMenus() {
        ensureTablesAndSeed();
        return menuRepository.findAllByOrderByGroupOrderAscSortOrderAsc();
    }

    /**
     * 단일 메뉴 조회
     */
    @Transactional(readOnly = true)
    public Menu getMenuById(Long id) {
        return menuRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 메뉴 ID입니다: " + id));
    }

    /**
     * 메뉴 신규 등록
     */
    @Transactional
    public Menu createMenu(MenuRequestDto dto) {
        ensureTablesAndSeed();
        String code = dto.getMenuCode();
        if (code == null || code.trim().isEmpty()) {
            code = "MENU_" + System.currentTimeMillis();
        } else {
            code = code.trim().toUpperCase();
        }

        if (menuRepository.existsByMenuCode(code)) {
            throw new IllegalArgumentException("이미 존재하는 메뉴 코드입니다: " + code);
        }

        int groupOrder = dto.getGroupOrder() != null ? dto.getGroupOrder() : 99;
        int sortOrder = dto.getSortOrder() != null ? dto.getSortOrder() : 
                (int) menuRepository.count() + 1;

        String groupName = dto.getGroupName() != null && !dto.getGroupName().trim().isEmpty() 
                ? dto.getGroupName().trim() : "일반 메뉴";

        Menu menu = Menu.builder()
                .menuCode(code)
                .menuName(dto.getMenuName() != null ? dto.getMenuName().trim() : "새 화면")
                .groupName(groupName)
                .groupOrder(groupOrder)
                .menuPath(dto.getMenuPath() != null ? dto.getMenuPath().trim() : "/" + code.toLowerCase())
                .icon(dto.getIcon() != null ? dto.getIcon().trim() : "📄")
                .sortOrder(sortOrder)
                .description(dto.getDescription())
                .screenType(dto.getScreenType() != null ? dto.getScreenType() : "CUSTOM_HTML")
                .customContent(dto.getCustomContent())
                .enabled(dto.getEnabled() != null ? dto.getEnabled() : true)
                .build();

        Menu savedMenu = menuRepository.save(menu);

        // 모든 역할에 대해 초기 권한 레코드 생성 (기본적으로 SYSTEM_ADMIN에게만 true, 나머지는 false)
        for (UserRole role : UserRole.values()) {
            RoleMenuPermission perm = RoleMenuPermission.builder()
                    .role(role)
                    .menu(savedMenu)
                    .hasAccess(role == UserRole.SYSTEM_ADMIN)
                    .build();
            permissionRepository.save(perm);
        }

        return savedMenu;
    }

    /**
     * 메뉴 정보 수정 (화면 이름, 소속 그룹, 순서, 아이콘 등 모든 정보 자유 수정)
     */
    @Transactional
    public Menu updateMenu(Long id, MenuRequestDto dto) {
        Menu menu = getMenuById(id);

        if (dto.getMenuName() != null) menu.setMenuName(dto.getMenuName().trim());
        if (dto.getGroupName() != null) menu.setGroupName(dto.getGroupName().trim());
        if (dto.getGroupOrder() != null) menu.setGroupOrder(dto.getGroupOrder());
        if (dto.getMenuPath() != null) menu.setMenuPath(dto.getMenuPath().trim());
        if (dto.getIcon() != null) menu.setIcon(dto.getIcon().trim());
        if (dto.getSortOrder() != null) menu.setSortOrder(dto.getSortOrder());
        if (dto.getDescription() != null) menu.setDescription(dto.getDescription());
        if (dto.getScreenType() != null) menu.setScreenType(dto.getScreenType());
        if (dto.getCustomContent() != null) menu.setCustomContent(dto.getCustomContent());
        if (dto.getEnabled() != null) menu.setEnabled(dto.getEnabled());

        return menuRepository.save(menu);
    }

    /**
     * 메뉴 삭제
     */
    @Transactional
    public void deleteMenu(Long id) {
        Menu menu = getMenuById(id);
        permissionRepository.deleteByMenu(menu);
        menuRepository.delete(menu);
    }

    /**
     * 역할별 화면 접근 권한 매트릭스 데이터 조회
     */
    @Transactional
    public RolePermissionDto.MatrixResponse getPermissionMatrix() {
        ensureTablesAndSeed();
        List<UserRole> roles = Arrays.asList(UserRole.values());
        List<Menu> allMenus = menuRepository.findAllByOrderByGroupOrderAscSortOrderAsc();

        List<RolePermissionDto.MenuSummary> menuSummaries = allMenus.stream()
                .map(m -> RolePermissionDto.MenuSummary.builder()
                        .id(m.getId())
                        .menuCode(m.getMenuCode())
                        .menuName(m.getMenuName())
                        .groupName(m.getGroupName() != null ? m.getGroupName() : "기타 메뉴")
                        .groupOrder(m.getGroupOrder() != null ? m.getGroupOrder() : 1)
                        .icon(m.getIcon())
                        .sortOrder(m.getSortOrder())
                        .enabled(m.getEnabled())
                        .screenType(m.getScreenType())
                        .build())
                .collect(Collectors.toList());

        // role -> Map<menuCode, Boolean hasAccess>
        Map<String, Map<String, Boolean>> permissionsMap = new HashMap<>();

        for (UserRole role : roles) {
            Map<String, Boolean> rolePermMap = new HashMap<>();
            List<RoleMenuPermission> perms = permissionRepository.findByRole(role);
            Map<Long, Boolean> menuPermMap = perms.stream()
                    .collect(Collectors.toMap(p -> p.getMenu().getId(), RoleMenuPermission::getHasAccess, (k1, k2) -> k1));

            for (Menu menu : allMenus) {
                Boolean hasAccess = menuPermMap.getOrDefault(menu.getId(), false);
                rolePermMap.put(menu.getMenuCode(), hasAccess);
            }
            permissionsMap.put(role.name(), rolePermMap);
        }

        return RolePermissionDto.MatrixResponse.builder()
                .roles(roles)
                .menus(menuSummaries)
                .permissions(permissionsMap)
                .build();
    }

    /**
     * 역할별 화면 접근 권한 일괄 업데이트
     */
    @Transactional
    public void updatePermissions(RolePermissionDto.BatchUpdateRequest request) {
        if (request == null || request.getPermissions() == null) {
            return;
        }

        for (RolePermissionDto.PermissionItem item : request.getPermissions()) {
            if (item.getRole() == null || item.getMenuId() == null) continue;

            Menu menu = menuRepository.findById(item.getMenuId()).orElse(null);
            if (menu == null) continue;

            RoleMenuPermission perm = permissionRepository.findByRoleAndMenu(item.getRole(), menu)
                    .orElse(RoleMenuPermission.builder()
                            .role(item.getRole())
                            .menu(menu)
                            .build());

            perm.setHasAccess(item.getHasAccess() != null ? item.getHasAccess() : false);
            permissionRepository.save(perm);
        }
    }
}
