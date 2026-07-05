package com.demoapp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Simple-login security (Phase-A answer: Authentication = Simple login).
 *
 * Public endpoints: the root, the health check, the actuator health probe and
 * the login/logout endpoints. Everything else requires an authenticated user.
 * Authentication is HTTP Basic + form login backed by the database users table,
 * which is the multi-user foundation (ADR-005).
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Stateless-friendly API; CSRF disabled because there is no
                // browser-form session state to protect in this shell.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/", "/api/health", "/actuator/health/**", "/error").permitAll()
                        .anyRequest().authenticated())
                .httpBasic(basic -> {})
                .formLogin(form -> {});
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
