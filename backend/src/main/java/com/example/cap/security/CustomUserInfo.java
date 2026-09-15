package com.example.cap.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CustomUserInfo {
    private String username;
    private String role;
    private String corpId;
    private String deptName;
    private String name;
    private boolean mfaCompleted;

    public CustomUserInfo(String username, String role, String corpId, boolean mfaCompleted) {
        this.username = username;
        this.role = role;
        this.corpId = corpId;
        this.deptName = "";
        this.name = username;
        this.mfaCompleted = mfaCompleted;
    }

    public CustomUserInfo(String username, String role, String corpId, String deptName, boolean mfaCompleted) {
        this.username = username;
        this.role = role;
        this.corpId = corpId;
        this.deptName = deptName != null ? deptName : "";
        this.name = username;
        this.mfaCompleted = mfaCompleted;
    }
}
