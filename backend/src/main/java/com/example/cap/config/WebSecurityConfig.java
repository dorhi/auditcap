package com.example.cap.config;

import com.example.cap.security.CustomAuthenticationProvider;
import com.example.cap.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // @PreAuthorize 등의 어노테이션 사용 가능하도록 설정
public class WebSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CustomAuthenticationProvider customAuthenticationProvider;

    public WebSecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                             CustomAuthenticationProvider customAuthenticationProvider) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.customAuthenticationProvider = customAuthenticationProvider;
    }


    @Bean
    public AuthenticationManager authenticationManager(HttpSecurity http) throws Exception {
        AuthenticationManagerBuilder authenticationManagerBuilder = 
            http.getSharedObject(AuthenticationManagerBuilder.class);
        authenticationManagerBuilder.authenticationProvider(customAuthenticationProvider);
        return authenticationManagerBuilder.build();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // 1차 로그인 및 회원가입, 매뉴얼 다운로드는 인증 없이 접근 허용
                .requestMatchers("/api/auth/login", "/api/auth/signup", "/api/manual/**").permitAll()
                // OTP 설정 및 검증은 1차 로그인 성공 후 발급된 임시 토큰(MFA 미완료) 상태에서 통과해야 하므로 permitAll이 아님 (Filter 내부에서 통과 처리됨)
                .requestMatchers("/api/auth/mfa/setup", "/api/auth/mfa/verify").authenticated()
                // 그 외 모든 API 요청은 최종 2FA 인증(MFA 완료)을 요구
                .anyRequest().authenticated()
            )
            // 세션 없거나 미인증 시 401 Unauthorized 표준 JSON 응답 반환
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"error\": \"UNAUTHORIZED\", \"message\": \"인증 세션이 없거나 만료되었습니다.\"}");
                })
            )
            // JWT 필터 추가
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
