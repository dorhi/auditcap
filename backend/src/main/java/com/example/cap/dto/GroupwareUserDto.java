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

    // 기존 8개 파라미터 생성자 (하위 호환)
    public GroupwareUserDto(String memberId, String passwd, String memberName, String memberNameKor, String memberNameEng, String groupName, String email, String corpName) {
        this.memberId = memberId;
        this.passwd = passwd;
        this.gwLoginPwd = null;
        this.memberName = memberName;
        this.memberNameKor = memberNameKor;
        this.memberNameEng = memberNameEng;
        this.groupName = groupName;
        this.email = email;
        this.corpName = corpName;
    }
}
