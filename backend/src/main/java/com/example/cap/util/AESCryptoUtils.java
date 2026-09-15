package com.example.cap.util;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

public class AESCryptoUtils {

    private static final String RAW_KEY = "sae-aX9f3LqT7mN1bRwZ6vY2jP0cKdHs";
    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/CBC/PKCS5Padding";

    public static String encrypt(String plainText) {
        if (plainText == null) {
            plainText = "";
        }

        try {
            String aesKey = RAW_KEY.trim();
            String aesIv = aesKey.substring(0, 16);

            byte[] keyBytes = aesKey.getBytes(StandardCharsets.UTF_8);
            byte[] ivBytes = aesIv.getBytes(StandardCharsets.UTF_8);
            byte[] plainBytes = plainText.getBytes(StandardCharsets.UTF_8);

            SecretKeySpec secretKeySpec = new SecretKeySpec(keyBytes, ALGORITHM);
            IvParameterSpec ivParameterSpec = new IvParameterSpec(ivBytes);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, ivParameterSpec);

            byte[] cipherBytes = cipher.doFinal(plainBytes);
            return Base64.getEncoder().encodeToString(cipherBytes);
        } catch (Exception e) {
            throw new RuntimeException("AES Encryption failed", e);
        }
    }
}
