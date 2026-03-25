package com.resolveit.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * AuditLog Entity
 *
 * Records all significant actions in the system for transparency.
 * Every important action (submit, assign, status change, feedback) creates a log entry.
 *
 * Examples:
 *   action="Complaint Submitted", actor="Priya Sharma", actorRole="COMPLAINANT"
 *   action="Case Assigned",       actor="Admin",        actorRole="ADMIN"
 *   action="Status Updated",      actor="Ravi Kumar",   actorRole="COMMITTEE"
 */
@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    // ─── Primary Key ──────────────────────────────────────────────
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ─── Log Details ──────────────────────────────────────────────
    /**
     * Short description of the action performed.
     * Examples: "Complaint Submitted", "Case Assigned", "Status Updated", "Feedback Submitted"
     */
    @Column(nullable = false)
    private String action;

    /**
     * Longer description with context.
     * Example: "Case #5 assigned to Officer Ravi Kumar"
     */
    @Column(columnDefinition = "TEXT")
    private String detail;

    /**
     * Name of the person who performed the action.
     */
    @Column(nullable = false)
    private String actor;

    /**
     * Role of the person who performed the action (ADMIN, COMMITTEE, COMPLAINANT).
     */
    @Column(name = "actor_role")
    private String actorRole;

    /**
     * The complaint this log entry is related to.
     * Nullable — some logs (like registration) are not tied to a specific case.
     */
    @Column(name = "case_id")
    private Long caseId;

    // ─── Timestamp ────────────────────────────────────────────────
    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    @PrePersist
    public void prePersist() {
        this.timestamp = LocalDateTime.now();
    }
}
