package com.resolveit.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * RegisterRequest DTO
 *
 * Data Transfer Object for the POST /api/auth/register endpoint.
 * Contains all the information needed to create a new COMPLAINANT account.
 *
 * DTO (Data Transfer Object) = a simple container that carries data
 * between the frontend (HTTP request body) and the service layer.
 * It does NOT map to a database table.
 */
@Data  // Lombok: generates getters, setters, toString
public class RegisterRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @Email(message = "Enter a valid email address")
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    private String department;
}
