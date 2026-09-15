package com.example.cap.dto;

import com.example.cap.entity.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

public class RolePermissionDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatrixResponse {
        private List<UserRole> roles;
        private List<MenuSummary> menus;
        // role name -> Map<menuCode, Boolean hasAccess>
        private Map<String, Map<String, Boolean>> permissions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MenuSummary {
        private Long id;
        private String menuCode;
        private String menuName;
        private String groupName;
        private Integer groupOrder;
        private String icon;
        private Integer sortOrder;
        private Boolean enabled;
        private String screenType;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchUpdateRequest {
        // List of permission settings
        private List<PermissionItem> permissions;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PermissionItem {
        private UserRole role;
        private Long menuId;
        private Boolean hasAccess;
    }
}
