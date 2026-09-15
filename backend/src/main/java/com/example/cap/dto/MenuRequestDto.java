package com.example.cap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuRequestDto {
    private String menuCode;
    private String menuName;
    private String groupName;
    private Integer groupOrder;
    private String menuPath;
    private String icon;
    private Integer sortOrder;
    private String description;
    private String screenType;      // INTERNAL, CUSTOM_HTML, EXTERNAL_URL
    private String customContent;
    private Boolean enabled;
}
