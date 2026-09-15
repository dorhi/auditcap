package com.example.cap.controller;

import com.example.cap.dto.MenuRequestDto;
import com.example.cap.dto.RolePermissionDto;
import com.example.cap.entity.Menu;
import com.example.cap.entity.UserRole;
import com.example.cap.security.CustomUserInfo;
import com.example.cap.service.MenuService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/menus")
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    /**
     * 로그인한 사용자의 Role에 허용된 접근 가능 활성 메뉴 목록 조회
     */
    @GetMapping("/my-menus")
    public ResponseEntity<List<Menu>> getMyMenus(@AuthenticationPrincipal CustomUserInfo userInfo) {
        if (userInfo == null || userInfo.getRole() == null) {
            return ResponseEntity.ok(List.of());
        }
        try {
            UserRole userRole = UserRole.valueOf(userInfo.getRole());
            List<Menu> menus = menuService.getMyMenus(userRole);
            return ResponseEntity.ok(menus);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.ok(List.of());
        }
    }

    /**
     * 전체 메뉴 목록 조회 (시스템 관리자 전용)
     */
    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<List<Menu>> getAllMenus() {
        return ResponseEntity.ok(menuService.getAllMenus());
    }

    /**
     * 단일 메뉴 상세 조회 (시스템 관리자 전용)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<?> getMenuById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(menuService.getMenuById(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 신규 메뉴/화면 생성 (시스템 관리자 전용)
     */
    @PostMapping
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<?> createMenu(@RequestBody MenuRequestDto requestDto) {
        try {
            Menu created = menuService.createMenu(requestDto);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 메뉴/화면 정보 수정 (시스템 관리자 전용)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<?> updateMenu(@PathVariable Long id, @RequestBody MenuRequestDto requestDto) {
        try {
            Menu updated = menuService.updateMenu(id, requestDto);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 메뉴 삭제 (시스템 관리자 전용)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<?> deleteMenu(@PathVariable Long id) {
        try {
            menuService.deleteMenu(id);
            return ResponseEntity.ok(Map.of("message", "메뉴가 성공적으로 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * 역할별 화면 접근 권한 매트릭스 전체 조회 (시스템 관리자 전용)
     */
    @GetMapping("/permissions")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<?> getPermissionMatrix() {
        try {
            return ResponseEntity.ok(menuService.getPermissionMatrix());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "권한 매트릭스 조회 실패: " + e.getMessage()));
        }
    }

    /**
     * 역할별 화면 접근 권한 일괄 저장 (시스템 관리자 전용)
     */
    @PutMapping("/permissions")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<?> updatePermissions(@RequestBody RolePermissionDto.BatchUpdateRequest request) {
        try {
            menuService.updatePermissions(request);
            return ResponseEntity.ok(Map.of("message", "역할별 화면 접근 권한이 성공적으로 저장되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
