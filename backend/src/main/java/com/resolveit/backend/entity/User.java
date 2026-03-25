package com.resolveit.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * User Entity
 *
 * Represents every person in the system.
 * Role determines what the user can do:
 *   - ADMIN       → manages the system, assigns complaints
 *   - COMMITTEE   → investigates and resolves assigned complaints
 *   - COMPLAINANT → submits and tracks their own complaints
 *
 * @Entity  → marks this class as a JPA database table
 * @Table   → specifies the table name in MySQL
 */
@Entity
@Table(name = "users")
@Data                // Lombok: generates getters, setters, equals, hashCode, toString
@NoArgsConstructor   // Lombok: generates a no-argument constructor (required by JPA)
@AllArgsConstructor  // Lombok: generates a constructor with all fields
@Builder             // Lombok: enables the builder pattern for creating objects
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class User {

    // ─── Primary Key ────────────────────────────────────────────
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // auto-increment in MySQL
    private Long id;

    // ─── User Information ────────────────────────────────────────
    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    /**
     * Role of the user in the system.
     * Stored as a string (e.g., "ADMIN") in the database.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String department;

    // ─── Timestamp ───────────────────────────────────────────────
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    /**
     * Called automatically before saving a new User to the database.
     * Sets the creation timestamp.
     */
    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    // ─── Role Enum ────────────────────────────────────────────────
    /**
     * Defines the three roles in the resolveIT system.
     */
    public enum Role {
        ADMIN,
        COMMITTEE,
        COMPLAINANT
    }
}
