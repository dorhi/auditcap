package com.example.cap.service;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.security.GeneralSecurityException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Arrays;

@Service
public class TotpService {

    private static final int TIME_STEP = 30; // 30초
    private static final int CODE_DIGITS = 6; // 6자리 코드

    // Base32 알파벳 정의 (OTP Secret 생성을 위함)
    private static final String BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    /**
     * Google/MS Authenticator용 Secret Key 생성 (Base32 포맷)
     */
    public String generateSecretKey() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[20]; // 160 bits
        random.nextBytes(bytes);
        return encodeBase32(bytes);
    }

    /**
     * QR 코드 스캔용 URI 생성
     */
    public String getQrCodeUri(String secret, String username, String issuer) {
        return String.format("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
                issuer, username, secret, issuer);
    }

    /**
     * 사용자가 입력한 OTP 코드가 맞는지 검증
     */
    public boolean verifyCode(String secret, int code) {
        long timeWindow = System.currentTimeMillis() / 1000 / TIME_STEP;
        
        // 시간 오차범위 감안 (이전 1주기, 현재 1주기, 이후 1주기)
        for (int i = -1; i <= 1; i++) {
            long hash = getTotp(secret, timeWindow + i);
            if (hash == code) {
                return true;
            }
        }
        return false;
    }

    private long getTotp(String secret, long time) {
        byte[] data = new byte[8];
        long value = time;
        for (int i = 8; i-- > 0; value >>>= 8) {
            data[i] = (byte) value;
        }

        byte[] key = decodeBase32(secret);
        SecretKeySpec signKey = new SecretKeySpec(key, "HmacSHA1");
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(signKey);
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0xF;
            long truncatedHash = 0;
            for (int i = 0; i < 4; ++i) {
                truncatedHash <<= 8;
                truncatedHash |= (hash[offset + i] & 0xFF);
            }
            truncatedHash &= 0x7FFFFFFF;
            truncatedHash %= Math.pow(10, CODE_DIGITS);

            return truncatedHash;
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("TOTP 생성 실패", e);
        }
    }

    // 간단한 Base32 인코딩/디코딩 유틸리티 함수
    private String encodeBase32(byte[] bytes) {
        StringBuilder sb = new StringBuilder((bytes.length + 7) * 8 / 5);
        int i = 0, index = 0, digit = 0;
        int currByte, nextByte;
        while (i < bytes.length) {
            currByte = (bytes[i] >= 0) ? bytes[i] : (bytes[i] + 256);
            if (index > 3) {
                if (i + 1 < bytes.length) {
                    nextByte = (bytes[i + 1] >= 0) ? bytes[i + 1] : (bytes[i + 1] + 256);
                } else {
                    nextByte = 0;
                }
                digit = currByte & (0xFF >> index);
                index = (index + 5) % 8;
                digit <<= index;
                digit |= nextByte >> (8 - index);
                i++;
            } else {
                digit = (currByte >> (8 - (index + 5))) & 0x1F;
                index = (index + 5) % 8;
                if (index == 0) {
                    i++;
                }
            }
            sb.append(BASE32_CHARS.charAt(digit));
        }
        return sb.toString();
    }

    private byte[] decodeBase32(String base32) {
        base32 = base32.toUpperCase().replaceAll("[^" + BASE32_CHARS + "]", "");
        byte[] bytes = new byte[base32.length() * 5 / 8];
        int i = 0, index = 0, lookup = 0, offset = 0, digit = 0;
        for (i = 0; i < base32.length(); i++) {
            lookup = base32.charAt(i) - 'A';
            if (lookup < 0 || lookup >= 26) {
                lookup = base32.charAt(i) - '2' + 26;
            }
            digit = lookup & 0x1F;
            if (index <= 3) {
                index = (index + 5) % 8;
                if (index == 0) {
                    bytes[offset] |= digit;
                    offset++;
                    if (offset >= bytes.length) break;
                } else {
                    bytes[offset] |= (digit << (8 - index));
                }
            } else {
                index = (index + 5) % 8;
                bytes[offset] |= (digit >>> index);
                offset++;
                if (offset >= bytes.length) break;
                bytes[offset] |= (digit << (8 - index));
            }
        }
        return bytes;
    }
}
