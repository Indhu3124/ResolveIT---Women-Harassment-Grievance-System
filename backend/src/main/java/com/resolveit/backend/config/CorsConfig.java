package com.resolveit.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CorsConfig — Cross-Origin Resource Sharing Configuration
 *
 * The frontend (HTML files) runs locally (file:// or localhost:5500 via Live Server).
 * The backend runs on localhost:8080.
 *
 * Without this config, the browser would block all fetch() requests from the
 * frontend to the backend with a CORS policy error.
 *
 * This config allows ALL origins to access the API during development.
 * In production, you would restrict this to specific domains.
 */
@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")  // Apply to all /api/* endpoints
                        .allowedOriginPatterns("*")  // Allow any frontend origin
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(false);
            }
        };
    }
}
