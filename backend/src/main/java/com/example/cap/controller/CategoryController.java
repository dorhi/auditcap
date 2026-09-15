package com.example.cap.controller;

import com.example.cap.entity.Category;
import com.example.cap.service.CategoryService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<List<Category>> getActiveCategories() {
        return ResponseEntity.ok(categoryService.getActiveCategories());
    }

    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR')")
    public ResponseEntity<List<Category>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR')")
    public ResponseEntity<?> createCategory(@RequestBody CategoryRequest request) {
        try {
            Category category = categoryService.createCategory(request.getCategoryName(), request.getSortOrder());
            return ResponseEntity.ok(category);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "CREATE_CATEGORY_FAILED", "message", e.getMessage()));
        }
    }

    @PutMapping("/{categoryId}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR')")
    public ResponseEntity<?> updateCategory(@PathVariable Long categoryId, @RequestBody CategoryRequest request) {
        try {
            Category category = categoryService.updateCategory(categoryId, request.getCategoryName(), request.getSortOrder(), request.getEnabled());
            return ResponseEntity.ok(category);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "UPDATE_CATEGORY_FAILED", "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{categoryId}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN', 'AUDIT_LEADER', 'AUDITOR')")
    public ResponseEntity<?> deleteCategory(@PathVariable Long categoryId) {
        try {
            categoryService.deleteCategory(categoryId);
            return ResponseEntity.ok(Map.of("message", "카테고리가 성공적으로 삭제되었습니다."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "DELETE_CATEGORY_FAILED", "message", e.getMessage()));
        }
    }

    @Data
    public static class CategoryRequest {
        private String categoryName;
        private Integer sortOrder;
        private Boolean enabled;
    }
}
