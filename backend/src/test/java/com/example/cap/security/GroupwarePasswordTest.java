package com.example.cap.security;

import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.*;

public class GroupwarePasswordTest {

    @Test
    public void testAesMatchingKoseok() {
        String targetHash = "NfUWDaPbxynHEcIzHysHUg==";
        String correctPassword = "tjdwns09$";

        // 올바른 비밀번호 매칭 성공
        assertTrue(CustomAuthenticationProvider.matchesGroupwarePassword(correctPassword, targetHash));
        assertTrue(CustomAuthenticationProvider.matchesGroupwarePassword(" " + correctPassword + " ", targetHash));

        // 틀린 비밀번호 매칭 실패
        assertFalse(CustomAuthenticationProvider.matchesGroupwarePassword("wrongPassword123", targetHash));
    }

    @Test
    public void testAesMatchingJabnyum() {
        String targetHash = "bNPqnl7cX7oaAL0Uy6a/Sw==";
        String correctPassword = "tpdkalal!!";

        assertTrue(CustomAuthenticationProvider.matchesGroupwarePassword(correctPassword, targetHash));
        assertFalse(CustomAuthenticationProvider.matchesGroupwarePassword("wrongPassword", targetHash));
    }
}



