package com.resolveit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * StatusUpdateRequest DTO
 *
 * Used when changing the status of a complaint.
 * Used with:
 *   PUT /api/complaints/{id}/status   (admin)
 *   PUT /api/committee/cases/{id}/status (committee member)
 *
 * Example JSON body:
 * {
 *   "status": "IN_INVESTIGATION",
 *   "performedById": 3
 * }
 */
@Data
public class StatusUpdateRequest {

    /**
     * New status as a string. Must match one of the Complaint.Status enum values:
     * SUBMITTED, UNDER_REVIEW, IN_INVESTIGATION, RESOLVED, ESCALATED
     */
    @NotBlank(message = "Status is required")
    private String status;

    /**
     * The ID of the user making this status change (for audit log).
     */
    private Long performedById;
}
