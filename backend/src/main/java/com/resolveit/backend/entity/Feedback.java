package com.resolveit.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * Feedback Entity
 *
 * Stores complainant feedback after a case is resolved.
 * Linked to a specific complaint via a foreign key.
 *
 * Example: After case #5 is resolved, the complainant rates
 * the resolution process with 4 stars and a comment.
 */
@Entity
@Table(name = "feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    // ─── Primary Key ─────────────────────────────────────────────
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ─── Relationship to Complaint ────────────────────────────────
    /**
     * The complaint this feedback belongs to.
     * @ManyToOne → one complaint can have feedback from the complainant
     * @JoinColumn → creates a foreign key column "case_id" in the feedback table
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private Complaint complaint;

    // ─── Feedback Details ─────────────────────────────────────────
    /**
     * Rating from 1 (poor) to 5 (excellent).
     */
    @Column(nullable = false)
    private int rating;

    /**
     * Optional text comment about the resolution process.
     */
    @Column(columnDefinition = "TEXT")
    private String comment;

    // ─── Timestamp ────────────────────────────────────────────────
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}
