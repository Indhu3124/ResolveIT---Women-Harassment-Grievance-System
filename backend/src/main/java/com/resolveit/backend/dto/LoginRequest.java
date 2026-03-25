package com.resolveit.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import lombok.Data;

/**
 * LoginRequest DTO
 *
 * Data Transfer Object for the POST /api/auth/login endpoint.
 * The frontend sends email, password, and the selected role.
 */
@Data
public class LoginRequest {

    @Email(message = "Enter a valid email address")
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    /**
     * Role must match exactly (e.g., "COMPLAINANT", "COMMITTEE", "ADMIN").
     * This prevents a complainant from logging in with the admin login form.
     */
    @NotBlank(message = "Role is required")
    private String role;
}
