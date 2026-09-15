package com.example.cap.repository;

import com.example.cap.entity.Menu;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MenuRepository extends JpaRepository<Menu, Long> {
    Optional<Menu> findByMenuCode(String menuCode);
    boolean existsByMenuCode(String menuCode);
    List<Menu> findAllByOrderByGroupOrderAscSortOrderAsc();
    List<Menu> findByEnabledTrueOrderByGroupOrderAscSortOrderAsc();
}
