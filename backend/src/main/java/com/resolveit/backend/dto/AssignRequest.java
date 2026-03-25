package com.resolveit.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * AssignRequest DTO
 *
 * Sent by admin when assigning a complaint to a committee member.
 * Used with: PUT /api/complaints/{id}/assign
 *
 * Example JSON body:
 * {
 *   "committeeUserId": 5
 * }
 */
@Data
public class AssignRequest {

    /**
     * The User ID of the committee member to assign the case to.
     */
    @NotNull(message = "Committee member ID is required")
    private Long committeeUserId;

    /**
     * The ID of the admin performing the assignment (for audit log).
     */
    private Long performedById;
}
