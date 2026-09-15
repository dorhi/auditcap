package com.example.cap.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsername(jwt);
                String role = tokenProvider.getRole(jwt);
                String corpId = tokenProvider.getCorpId(jwt);
                String deptName = tokenProvider.getDeptName(jwt);
                String name = tokenProvider.getName(jwt);
                boolean mfaCompleted = tokenProvider.isMfaCompleted(jwt);

                // 현재 요청 경로
                String requestURI = request.getRequestURI();

                // 2차 인증을 거치지 않은 경우, MFA 검증 API(/api/auth/mfa/verify) 외의 다른 API는 접근 불가
                if (!mfaCompleted && !requestURI.startsWith("/api/auth/mfa/verify") && !requestURI.startsWith("/api/auth/mfa/setup")) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"error\": \"MFA_REQUIRED\", \"message\": \"2차 OTP 인증이 필요합니다.\"}");
                    return;
                }

                // Authentication 객체 생성 및 Context 설정
                List<SimpleGrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role));
                
                // Custom UserDetails 객체 대신 심플 토큰 생성 (Principal에 CustomUserInfo 보관)
                CustomUserInfo userInfo = new CustomUserInfo(username, role, corpId, deptName, name, mfaCompleted);

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userInfo, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) {
            logger.error("Security Context에 사용자 인증 정보를 설정할 수 없습니다.", ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
