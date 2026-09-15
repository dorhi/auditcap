package com.example.cap.entity;

public enum UserRole {
    SYSTEM_ADMIN,  // 시스템 관리자
    AUDIT_LEADER,  // 감사 책임자 (신규)
    AUDITOR,       // 감사 담당자 (신규)
    EXEC,          // 경영진
    CORP_HEAD,     // 법인장
    LEAD_REP,      // 대표담당자
    MEMBER,        // 일반담당자
    DEPT_MEMBER    // 유관부서
}
