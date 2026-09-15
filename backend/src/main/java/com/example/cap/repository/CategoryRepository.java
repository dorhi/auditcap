package com.example.cap.repository;

import com.example.cap.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findAllByOrderBySortOrderAsc();
    List<Category> findAllByEnabledTrueOrderBySortOrderAsc();
    Optional<Category> findByCategoryName(String categoryName);
}
