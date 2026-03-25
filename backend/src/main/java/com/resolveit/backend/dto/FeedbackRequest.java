package com.resolveit.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * FeedbackRequest DTO
 *
 * Sent by a complainant after their case is resolved.
 * Used with: POST /api/feedback
 *
 * Example JSON body:
 * {
 *   "caseId": 7,
 *   "rating": 4,
 *   "comment": "The committee was professional and resolved the case quickly.",
 *   "submittedById": 2
 * }
 */
@Data
public class FeedbackRequest {

    /**
     * The ID of the resolved complaint being rated.
     */
    @NotNull(message = "Case ID is required")
    private Long caseId;

    /**
     * Star rating: must be between 1 and 5.
     */
    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating cannot exceed 5")
    private Integer rating;

    /**
     * Optional text comment about the resolution process.
     */
    private String comment;

    /**
     * The ID of the complainant submitting the feedback (for audit log).
     */
    private Long submittedById;
}
