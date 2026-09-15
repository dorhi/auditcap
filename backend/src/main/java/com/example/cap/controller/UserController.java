package com.example.cap.controller;

import com.example.cap.entity.User;
import com.example.cap.entity.UserRole;
import com.example.cap.dto.GroupwareUserDto;
import com.example.cap.service.GroupwareService;
import com.example.cap.service.UserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
     * 성명으로 글로벌세아 / 세아상역 사원 검색 API (동명이인 구분 지원)
     */
    @GetMapping("/search-employee")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<?> searchEmployee(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String corp) {
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "검색할 사원 이름을 입력해 주세요."));
        }

        List<GroupwareUserDto> employees = groupwareService.searchGroupwareUsers(name.trim(), corp);

        // 각 직원이 이미 시스템(CAPS_USERS)에 등록되었는지 여부 플래그 포함
        List<Map<String, Object>> responseList = new java.util.ArrayList<>();
        for (GroupwareUserDto emp : employees) {
            boolean alreadyRegistered = userService.existsByUsername(emp.getMemberId());
            Map<String, Object> map = new HashMap<>();
            map.put("username", emp.getMemberId());
            map.put("name", emp.getMemberName());
            map.put("nameKor", emp.getMemberNameKor());
            map.put("nameEng", emp.getMemberNameEng());
            map.put("deptName", emp.getGroupName());
            map.put("email", emp.getEmail());
            map.put("corpId", emp.getCorpName());
            map.put("alreadyRegistered", alreadyRegistered);
            responseList.add(map);
        }

        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/check-username")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
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
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
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
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
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
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
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
