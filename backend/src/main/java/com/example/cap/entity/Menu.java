package com.example.cap.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "CAPS_MENUS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Menu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "menu_id")
    private Long id;

    // 메뉴 식별 고유 코드 (예: PROJECT_REGISTER, ACTION_PLAN_INPUT, CUSTOM_123 등)
    @Column(name = "menu_code", unique = true, nullable = false, length = 50)
    private String menuCode;

    // 화면(메뉴) 이름
    @Column(name = "menu_name", nullable = false, columnDefinition = "NVARCHAR(100)")
    private String menuName;

    // 메뉴 경로/URL/식별경로
    @Column(name = "menu_path", length = 200)
    private String menuPath;

    // 메뉴 아이콘 (이모지 또는 아이콘명)
    @Column(name = "icon", columnDefinition = "NVARCHAR(50)")
    private String icon;

    // 소속 메뉴 그룹명 (예: 감사 업무 관리, 시스템 관리 등)
    @Column(name = "group_name", columnDefinition = "NVARCHAR(100)")
    private String groupName;

    // 그룹 표시 순서
    @Column(name = "group_order")
    private Integer groupOrder;

    // 표시 정렬 순서 (그룹 내 화면 표시 순서)
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    // 화면 및 메뉴 설명
    @Column(name = "description", columnDefinition = "NVARCHAR(500)")
    private String description;

    // 화면 유형: INTERNAL (기본 시스템 화면), CUSTOM_HTML (사용자 정의 안내/HTML), EXTERNAL_URL (외부 링크/iframe)
    @Column(name = "screen_type", nullable = false, length = 30)
    private String screenType;

    // 커스텀 화면 내용 (HTML, 안내문구 또는 외부 URL)
    @Lob
    @Column(name = "custom_content", columnDefinition = "NVARCHAR(MAX)")
    private String customContent;

    // 사용 여부
    @Column(name = "enabled", nullable = false)
    private Boolean enabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.groupName == null || this.groupName.trim().isEmpty()) {
            this.groupName = "기타 메뉴";
        }
        if (this.groupOrder == null) {
            this.groupOrder = 1;
        }
        if (this.sortOrder == null) {
            this.sortOrder = 0;
        }
        if (this.screenType == null) {
            this.screenType = "INTERNAL";
        }
        if (this.enabled == null) {
            this.enabled = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
