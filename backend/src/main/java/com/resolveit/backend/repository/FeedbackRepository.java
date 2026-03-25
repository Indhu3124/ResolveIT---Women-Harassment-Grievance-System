package com.resolveit.backend.repository;

import com.resolveit.backend.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * FeedbackRepository
 *
 * Provides database access for the Feedback entity.
 */
@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    /**
     * Find feedback submitted for a specific complaint.
     *
     * SQL: SELECT * FROM feedback WHERE case_id = ?
     */
    Optional<Feedback> findByComplaintId(Long caseId);

    /**
     * Check if feedback has already been submitted for a case.
     * Prevents duplicate feedback submissions.
     *
     * SQL: SELECT COUNT(*) > 0 FROM feedback WHERE case_id = ?
     */
    boolean existsByComplaintId(Long caseId);

    /**
     * Get all feedback records (for admin overview).
     * JpaRepository already provides findAll() — this is an alias
     * for finding by a related field if needed.
     */
    List<Feedback> findAll();
}
