package com.resolveit.backend.controller;

import com.resolveit.backend.dto.LoginRequest;
import com.resolveit.backend.dto.LoginResponse;
import com.resolveit.backend.dto.RegisterRequest;
import com.resolveit.backend.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AuthController — Authentication REST API
 *
 * Handles user registration and login.
 *
 * @RestController → marks this as a REST controller
 *                   (combines @Controller + @ResponseBody)
 *                   All methods return JSON automatically.
 *
 * @RequestMapping → all endpoints in this class are prefixed with /api/auth
 *
 * @CrossOrigin → allows requests from any origin (needed for frontend fetch calls)
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    /**
     * Spring injects the AuthService automatically via @Autowired.
     * The controller delegates all business logic to the service.
     */
    @Autowired
    private AuthService authService;

    // ─── POST /api/auth/register ───────────────────────────────────

    /**
     * Register a new complainant account.
     *
     * Request body example:
     * {
     *   "name": "Priya Sharma",
     *   "email": "priya@example.com",
     *   "password": "pass123",
     *   "department": "Engineering"
     * }
     *
     * @Valid → triggers Bean Validation on the request body
     *          (e.g., @NotBlank, @Email annotations in RegisterRequest)
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            String message = authService.register(request);
            // Return 200 OK with a success message
            return ResponseEntity.ok(Map.of("message", message, "success", true));
        } catch (RuntimeException e) {
            // Return 400 Bad Request with the error message
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage(), "success", false));
        }
    }

    // ─── POST /api/auth/login ──────────────────────────────────────

    /**
     * Authenticate a user and return their profile data.
     *
     * Request body example:
     * {
     *   "email": "admin@gmail.com",
     *   "password": "1234",
     *   "role": "ADMIN"
     * }
     *
     * Response example:
     * {
     *   "id": 1,
     *   "name": "System Administrator",
     *   "email": "admin@gmail.com",
     *   "role": "ADMIN",
     *   "department": "Administration"
     * }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage(), "success", false));
        }
    }

    @GetMapping("/debug/users")
    public ResponseEntity<?> getAllUsersDebug() {
        return ResponseEntity.ok(authService.getAllUsersDebug());
    }
}
