package com.example.cap.controller;

import com.example.cap.entity.User;
import com.example.cap.entity.UserRole;
import com.example.cap.dto.GroupwareUserDto;
import com.example.cap.service.GroupwareService;
import com.example.cap.service.UserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final GroupwareService groupwareService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    /**
     * 화면 성명/부서 표기를 위한 기본 사용자 매핑 정보 (모든 로그인 사용자 접근 허용)
     */
    @GetMapping("/display-map")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> getUserDisplayMap() {
        List<User> users = userService.getAllUsers();
        List<Map<String, Object>> responseList = new java.util.ArrayList<>();
        for (User u : users) {
            Map<String, Object> map = new HashMap<>();
            map.put("userId", u.getId() != null ? u.getId().toString() : "");
            map.put("username", u.getUsername());
            map.put("name", u.getName() != null ? u.getName() : u.getUsername());
            map.put("deptName", u.getDeptName());
            map.put("corpId", u.getCorpId());
            map.put("role", u.getRole() != null ? u.getRole().name() : "");
            map.put("enabled", u.getEnabled() != null ? u.getEnabled() : true);
            map.put("email", u.getEmail());
            map.put("approvalStatus", u.getApprovalStatus());
            responseList.add(map);
        }
        return ResponseEntity.ok(responseList);
    }

    /**
     * 회원가입 승인 대기자 목록 조회 API
     */
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER')")
    public ResponseEntity<?> getPendingUsers() {
        List<User> users = userService.getAllUsers();
        List<Map<String, Object>> responseList = new java.util.ArrayList<>();
        for (User u : users) {
            if (!"PENDING".equalsIgnoreCase(u.getApprovalStatus())) {
                continue;
            }
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("username", u.getUsername());
            map.put("name", u.getName());
            map.put("email", u.getEmail());
            map.put("corpId", u.getCorpId());
            map.put("deptName", u.getDeptName());
            map.put("approvalStatus", u.getApprovalStatus());
            map.put("role", u.getRole() != null ? u.getRole().name() : "");
            map.put("enabled", u.getEnabled());
            responseList.add(map);
        }
        return ResponseEntity.ok(responseList);
    }

    /**
     * 성명으로 글로벌세아 / 세아상역 사원 검색 API (동명이인 구분 지원)
     */
    @GetMapping("/search-employee")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR')")
    public ResponseEntity<?> searchEmployee(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String corp) {
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "검색할 사원 이름을 입력해 주세요."));
        }

        try {
            List<GroupwareUserDto> employees = groupwareService.searchGroupwareUsers(name.trim(), corp);

            // 각 직원이 이미 시스템(CAPS_USERS)에 등록되었는지 여부 플래그 포함
            List<Map<String, Object>> responseList = new java.util.ArrayList<>();
            for (GroupwareUserDto emp : employees) {
                if (emp == null || emp.getMemberId() == null || emp.getMemberId().trim().isEmpty()) {
                    continue;
                }
                boolean alreadyRegistered = false;
                try {
                    alreadyRegistered = userService.existsByUsername(emp.getMemberId().trim());
                } catch (Exception ex) {
                    log.warn("사용자 기등록 여부 조회 예외 (무시): {}", ex.getMessage());
                }

                Map<String, Object> map = new HashMap<>();
                map.put("username", emp.getMemberId().trim());
                map.put("name", emp.getMemberName() != null ? emp.getMemberName() : emp.getMemberId());
                map.put("nameKor", emp.getMemberNameKor() != null ? emp.getMemberNameKor() : emp.getMemberName());
                map.put("nameEng", emp.getMemberNameEng() != null ? emp.getMemberNameEng() : "");
                map.put("deptName", emp.getGroupName() != null ? emp.getGroupName() : "현업부서");
                map.put("email", emp.getEmail() != null ? emp.getEmail() : (emp.getMemberId() + "@sae-a.com"));
                map.put("corpId", emp.getCorpName() != null ? emp.getCorpName() : "글로벌세아");
                map.put("alreadyRegistered", alreadyRegistered);
                responseList.add(map);
            }

            return ResponseEntity.ok(responseList);
        } catch (Exception e) {
            log.error("사원 검색 처리 중 오류 발생: ", e);
            return ResponseEntity.status(500).body(Map.of(
                    "message", "사원 검색 중 서버 오류가 발생했습니다: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/check-username")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR')")
    public ResponseEntity<?> checkUsername(@RequestParam String username) {
        if (username == null || username.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "확인할 ID를 입력해야 합니다."));
        }
        boolean exists = userService.existsByUsername(username.trim());
        return ResponseEntity.ok(Map.of(
                "username", username.trim(),
                "exists", exists,
                "available", !exists,
                "message", exists ? "이미 등록된 ID입니다." : "사용 가능한 ID입니다."
        ));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER')")
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request) {
        try {
            if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "ID를 입력해야 합니다."));
            }
            if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "비밀번호를 입력해야 합니다."));
            }
            if (request.getName() == null || request.getName().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "이름을 입력해야 합니다."));
            }

            UserRole role = UserRole.MEMBER;
            if (request.getRole() != null && !request.getRole().trim().isEmpty()) {
                try {
                    role = UserRole.valueOf(request.getRole().trim());
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(Map.of("message", "유효하지 않은 권한입니다: " + request.getRole()));
                }
            }

            User newUser = userService.createUserByAdmin(
                    request.getUsername().trim(),
                    request.getPassword().trim(),
                    request.getName().trim(),
                    request.getEmail(),
                    request.getCorpId(),
                    request.getDeptName(),
                    role
            );

            return ResponseEntity.ok(Map.of(
                    "message", "사용자 계정이 성공적으로 등록되었습니다.",
                    "username", newUser.getUsername(),
                    "name", newUser.getName(),
                    "role", newUser.getRole().name()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "사용자 등록 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @PutMapping("/{username}/role")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER')")
    public ResponseEntity<?> updateUserRole(@PathVariable String username, @RequestBody Map<String, String> body) {
        try {
            String newRoleStr = body.get("role");
            if (newRoleStr == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "권한 정보를 제공해야 합니다."));
            }
            UserRole newRole = UserRole.valueOf(newRoleStr);
            User updatedUser = userService.updateUserRole(username, newRole);
            return ResponseEntity.ok(Map.of(
                    "message", "권한이 성공적으로 변경되었습니다.",
                    "username", updatedUser.getUsername(),
                    "newRole", updatedUser.getRole().name()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "잘못된 권한 값이거나 사용자를 찾을 수 없습니다."));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "권한 변경 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @PutMapping("/{username}/status")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER')")
    public ResponseEntity<?> updateUserStatus(@PathVariable String username, @RequestBody Map<String, Boolean> body) {
        try {
            Boolean enabled = body.get("enabled");
            if (enabled == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "enabled 상태 값을 제공해야 합니다."));
            }
            User updatedUser = userService.updateUserStatus(username, enabled);
            return ResponseEntity.ok(Map.of(
                    "message", "사용자 상태가 성공적으로 변경되었습니다.",
                    "username", updatedUser.getUsername(),
                    "enabled", updatedUser.getEnabled()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "사용자 상태 변경 실패: " + e.getMessage()));
        }
    }

    @Data
    public static class CreateUserRequest {
        private String username;
        private String password;
        private String name;
        private String email;
        private String corpId;
        private String deptName;
        private String role;
    }
}
