package com.example.cap.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtTokenProvider {

    @Value("${app.jwt.secret}")
    private String secretKeyString;

    @Value("${app.jwt.temp-expiration-ms}")
    private long tempExpirationMs;

    @Value("${app.jwt.expiration-ms}")
    private long expirationMs;

    private Key key;

    @PostConstruct
    protected void init() {
        this.key = Keys.hmacShaKeyFor(secretKeyString.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 1차 로그인 성공 시 발급하는 임시 토큰 (MFA 미완료 상태)
     */
    public String createTempToken(String username, String role, String corpId) {
        return createToken(username, role, corpId, "", username, false, tempExpirationMs);
    }

    public String createTempToken(String username, String role, String corpId, String deptName, String name) {
        return createToken(username, role, corpId, deptName, name, false, tempExpirationMs);
    }

    /**
     * 2차 OTP 인증 완료 후 발급하는 최종 토큰 (MFA 완료 상태)
     */
    public String createFinalToken(String username, String role, String corpId) {
        return createToken(username, role, corpId, "", username, true, expirationMs);
    }

    public String createFinalToken(String username, String role, String corpId, String deptName, String name) {
        return createToken(username, role, corpId, deptName, name, true, expirationMs);
    }

    private String createToken(String username, String role, String corpId, String deptName, String name, boolean mfaCompleted, long expirationMs) {
        Claims claims = Jwts.claims().setSubject(username);
        claims.put("role", role);
        claims.put("corpId", corpId);
        claims.put("deptName", deptName != null ? deptName : "");
        claims.put("name", name != null ? name : username);
        claims.put("mfaCompleted", mfaCompleted);

        Date now = new Date();
        Date validity = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(now)
                .setExpiration(validity)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Claims getClaims(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }

    public String getUsername(String token) {
        return getClaims(token).getSubject();
    }

    public String getRole(String token) {
        return (String) getClaims(token).get("role");
    }

    public String getCorpId(String token) {
        return (String) getClaims(token).get("corpId");
    }

    public String getDeptName(String token) {
        Object dept = getClaims(token).get("deptName");
        return dept != null ? dept.toString() : "";
    }

    public String getName(String token) {
        Object name = getClaims(token).get("name");
        return name != null ? name.toString() : getUsername(token);
    }

    public boolean isMfaCompleted(String token) {
        Boolean mfa = (Boolean) getClaims(token).get("mfaCompleted");
        return mfa != null && mfa;
    }
}
