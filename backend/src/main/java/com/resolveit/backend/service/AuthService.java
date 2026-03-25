package com.resolveit.backend.service;

import com.resolveit.backend.dto.LoginRequest;
import com.resolveit.backend.dto.LoginResponse;
import com.resolveit.backend.dto.RegisterRequest;
import com.resolveit.backend.entity.User;
import com.resolveit.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * AuthService — Authentication Business Logic
 *
 * Handles user registration and login.
 * This is a service class — it lives between the Controller (HTTP layer)
 * and the Repository (database layer). It contains the core business rules.
 *
 * @Service — marks this as a Spring-managed service bean
 */
@Service
public class AuthService {

    /**
     * @Autowired — Spring automatically injects the UserRepository bean.
     * This is called Dependency Injection (DI).
     */
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogService auditLogService;

    // ─── Register ─────────────────────────────────────────────────

    /**
     * Register a new complainant.
     *
     * Steps:
     * 1. Check if email is already taken
     * 2. Build a new User object with COMPLAINANT role
     * 3. Save to the database
     * 4. Log the registration in audit logs
     * 5. Return a success message
     *
     * @param request  the registration form data from the frontend
     * @return success message string
     * @throws RuntimeException if email is already registered
     */
    public String register(RegisterRequest request) {

        // Step 1: Check for duplicate email
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("A user with this email already exists.");
        }

        // Step 2: Build the User entity using the Builder pattern (from Lombok @Builder)
        User newUser = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(request.getPassword())  // Stored as plain text (suitable for academic project)
                .role(User.Role.COMPLAINANT)       // All self-registered users are complainants
                .department(request.getDepartment())
                .build();

        // Step 3: Save to the database (INSERT INTO users ...)
        userRepository.save(newUser);

        // Step 4: Audit log — track this registration event
        auditLogService.addLog(
                "User Registered",
                newUser.getName() + " registered as COMPLAINANT",
                newUser.getName(),
                "COMPLAINANT",
                null  // not related to a specific complaint
        );

        return "Registration successful! Welcome to resolveIT.";
    }

    // ─── Login ────────────────────────────────────────────────────

    /**
     * Authenticate a user.
     *
     * Steps:
     * 1. Find user by email
     * 2. Verify password matches
     * 3. Verify role matches the selected role on the login form
     * 4. Return user data for the frontend to store as "currentUser"
     *
     * @param request  email, password, and selected role
     * @return LoginResponse with user info (no password)
     * @throws RuntimeException if credentials or role are invalid
     */
    public LoginResponse login(LoginRequest request) {

        // Step 1: Find user by email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password."));

        // Step 2: Check password
        if (!user.getPassword().equals(request.getPassword())) {
            throw new RuntimeException("Invalid email or password.");
        }

        // Step 3: Check role matches
        // The frontend sends "ADMIN", "COMMITTEE", or "COMPLAINANT"
        User.Role requestedRole;
        try {
            requestedRole = User.Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid role specified.");
        }

        if (!user.getRole().equals(requestedRole)) {
            throw new RuntimeException("Role mismatch. Please select the correct role.");
        }

        // Step 4: Build and return safe user data
        return LoginResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .department(user.getDepartment())
                .message("Welcome back, " + user.getName() + "!")
                .build();
    }

    public java.util.List<User> getAllUsersDebug() {
        return userRepository.findAll();
    }
}
