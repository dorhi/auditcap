package com.example.cap.repository;

import com.example.cap.entity.Menu;
import com.example.cap.entity.RoleMenuPermission;
import com.example.cap.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleMenuPermissionRepository extends JpaRepository<RoleMenuPermission, Long> {
    
    List<RoleMenuPermission> findByRole(UserRole role);
    
    List<RoleMenuPermission> findByRoleAndHasAccessTrue(UserRole role);
    
    Optional<RoleMenuPermission> findByRoleAndMenu(UserRole role, Menu menu);
    
    void deleteByMenu(Menu menu);

    @Query("SELECT rmp.menu FROM RoleMenuPermission rmp " +
           "WHERE rmp.role = :role AND rmp.hasAccess = true AND rmp.menu.enabled = true " +
           "ORDER BY rmp.menu.groupOrder ASC, rmp.menu.sortOrder ASC")
    List<Menu> findAccessibleMenusByRole(@Param("role") UserRole role);
}
