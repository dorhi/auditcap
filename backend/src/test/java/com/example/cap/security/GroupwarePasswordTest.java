package com.example.cap.security;

import org.junit.jupiter.api.Test;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import static org.junit.jupiter.api.Assertions.*;

public class GroupwarePasswordTest {

    @Test
    public void testMd5Base64Matching() throws Exception {
        String rawPassword = "password123!";
        MessageDigest md5 = MessageDigest.getInstance("MD5");
        String hashUtf8 = Base64.getEncoder().encodeToString(md5.digest(rawPassword.getBytes(StandardCharsets.UTF_8)));

        // 24자리 MD5 Base64 매칭 확인 (CD_MEMBER_V_GW의 Passwd 형식)
        assertEquals(24, hashUtf8.length());
        assertTrue(CustomAuthenticationProvider.matchesGroupwarePassword(rawPassword, hashUtf8));

        // EUC-KR 인코딩 해시 매칭 확인
        md5.reset();
        String hashEuckr = Base64.getEncoder().encodeToString(md5.digest(rawPassword.getBytes(Charset.forName("EUC-KR"))));
        assertTrue(CustomAuthenticationProvider.matchesGroupwarePassword(rawPassword, hashEuckr));

        // 틀린 비밀번호 검증
        assertFalse(CustomAuthenticationProvider.matchesGroupwarePassword("wrongPassword", hashUtf8));
    }

    @Test
    public void testSha256Base64Matching() throws Exception {
        String rawPassword = "complexPassword2026@#";
        MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
        String hashSha256 = Base64.getEncoder().encodeToString(sha256.digest(rawPassword.getBytes(StandardCharsets.UTF_8)));

        // 44자리 SHA-256 Base64 매칭 확인
        assertEquals(44, hashSha256.length());
        assertTrue(CustomAuthenticationProvider.matchesGroupwarePassword(rawPassword, hashSha256));
    }

    @Test
    public void testSha256HexMatching() throws Exception {
        String rawPassword = "mypassword123!";
        MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
        byte[] bytes = sha256.digest(rawPassword.getBytes(StandardCharsets.UTF_8));
        String hex = java.util.HexFormat.of().formatHex(bytes);

        // 64자리 SHA-256 Hex 매칭 확인
        assertEquals(64, hex.length());
        assertTrue(CustomAuthenticationProvider.matchesGroupwarePassword(rawPassword, hex));

        // 대문자 Hex 매칭 확인
        assertTrue(CustomAuthenticationProvider.matchesGroupwarePassword(rawPassword, hex.toUpperCase()));
    }
}
