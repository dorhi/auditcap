package com.example.cap.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupwareUserDto {
    private String memberId;
    private String passwd;        // ERP_LOGIN_PWD (MD5 Base64 등)
    private String gwLoginPwd;    // ORG_EMPLOYEE.LOGIN_PWD (그룹웨어 웹 포털 SHA-256 Hex 등)
    private String memberName;
    private String memberNameKor;
    private String memberNameEng;
    private String groupName;
    private String email;
    private String corpName;
}

