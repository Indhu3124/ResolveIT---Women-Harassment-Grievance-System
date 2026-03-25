package com.resolveit.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Notification Entity
 *
 * Stores system notifications sent to users when key events occur
 * (e.g., complaint submitted, case assigned, status updated).
 */
@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String message;

    /**
     * The ID of the user this notification is intended for
     * (e.g., complainant or committee member).
     * Since it's simple reporting, we just use userId.
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * Whether the user has clicked/seen this notification yet.
     */
    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        // New notifications are unread by default
        this.read = false;
    }
}
