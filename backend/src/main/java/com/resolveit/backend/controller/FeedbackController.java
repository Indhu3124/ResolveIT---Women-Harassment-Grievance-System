package com.resolveit.backend.controller;

import com.resolveit.backend.dto.FeedbackRequest;
import com.resolveit.backend.entity.Feedback;
import com.resolveit.backend.service.FeedbackService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * FeedbackController — Feedback REST API
 *
 * Handles complaint resolution feedback:
 *   - Submit feedback after a case is resolved
 *   - View submitted feedback for a specific case
 *
 * Base path: /api/feedback
 */
@RestController
@RequestMapping("/api/feedback")
@CrossOrigin(origins = "*")
public class FeedbackController {

    @Autowired
    private FeedbackService feedbackService;

    // ─── POST /api/feedback ────────────────────────────────────────

    /**
     * Submit feedback for a resolved case.
     * Called from the complainant dashboard after a case is resolved.
     *
     * Request body example:
     * {
     *   "caseId": 7,
     *   "rating": 4,
     *   "comment": "The committee handled the case professionally.",
     *   "submittedById": 3
     * }
     *
     * Business rules (enforced in FeedbackService):
     *   - Case must be RESOLVED to allow feedback
     *   - Duplicate feedback is not allowed
     */
    @PostMapping
    public ResponseEntity<?> submitFeedback(@Valid @RequestBody FeedbackRequest request) {
        try {
            Feedback feedback = feedbackService.submitFeedback(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                    Map.of("message", "Feedback submitted successfully. Thank you!", "feedbackId", feedback.getId())
            );
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ─── GET /api/feedback/{caseId} ───────────────────────────────

    /**
     * Get the feedback submitted for a specific case.
     * Used on the case details page (admin and complainant views)
     * to display the feedback rating and comment.
     *
     * If no feedback has been submitted yet, returns 404 Not Found.
     */
    @GetMapping("/{caseId}")
    public ResponseEntity<?> getFeedback(@PathVariable Long caseId) {
        Optional<Feedback> feedback = feedbackService.getFeedbackByCaseId(caseId);
        if (feedback.isPresent()) {
            return ResponseEntity.ok(feedback.get());
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "No feedback submitted yet for case #" + caseId));
        }
    }
}
