package com.example.cap.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupwareUserDto {
    private String memberId;
    private String passwd;
    private String memberName;
    private String memberNameKor;
    private String memberNameEng;
    private String groupName;
    private String email;
    private String corpName;
}
