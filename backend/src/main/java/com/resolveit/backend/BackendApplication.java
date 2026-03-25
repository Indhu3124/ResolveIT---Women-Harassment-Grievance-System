package com.resolveit.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * resolveIT — Women's Workplace Grievance Redressal System
 *
 * Main entry point for the Spring Boot application.
 *
 * @SpringBootApplication enables:
 *   - @Configuration  → marks this as a configuration class
 *   - @EnableAutoConfiguration → auto-configures Spring beans
 *   - @ComponentScan  → scans all sub-packages for @Component, @Service, @Repository, @Controller
 */
@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
