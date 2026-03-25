package com.resolveit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * LoginResponse DTO
 *
 * Returned to the frontend after a successful login.
 * The frontend stores this in localStorage as "currentUser".
 *
 * Only includes safe information — password is never sent back.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private Long id;
    private String name;
    private String email;
    private String role;
    private String department;
    private String message;  // e.g., "Login successful"
}
