package com.resolveit.backend.controller;

import com.resolveit.backend.dto.StatusUpdateRequest;
import com.resolveit.backend.entity.Complaint;
import com.resolveit.backend.service.CommitteeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * CommitteeController — Committee Member REST API
 *
 * Handles what committee members can do:
 *   - View their assigned cases
 *   - Update the status of a case they are investigating
 *
 * Base path: /api/committee
 */
@RestController
@RequestMapping("/api/committee")
@CrossOrigin(origins = "*")
public class CommitteeController {

    @Autowired
    private CommitteeService committeeService;

    // ─── GET /api/committee/cases/{memberId} ──────────────────────

    /**
     * Get all cases assigned to a specific committee member.
     * Used on committee/dashboard.html to populate "My Cases".
     *
     * The memberId is the committee member's User ID,
     * retrieved from localStorage.currentUser.id on the frontend.
     *
     * Example: GET /api/committee/cases/5
     */
    @GetMapping("/cases/{memberId}")
    public ResponseEntity<List<Complaint>> getAssignedCases(@PathVariable Long memberId) {
        List<Complaint> cases = committeeService.getAssignedCases(memberId);
        return ResponseEntity.ok(cases);
    }

    // ─── PUT /api/committee/cases/{id}/status ─────────────────────

    /**
     * Update the status of a complaint (committee member action).
     * Used on the committee case details page.
     *
     * Committee members can change status to:
     *   UNDER_REVIEW → IN_INVESTIGATION → RESOLVED (or ESCALATED)
     *
     * Request body example:
     * {
     *   "status": "IN_INVESTIGATION",
     *   "performedById": 5
     * }
     */
    @PutMapping("/cases/{id}/status")
    public ResponseEntity<?> updateCaseStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateRequest request) {
        try {
            Complaint updated = committeeService.updateCaseStatus(id, request);
            return ResponseEntity.ok(
                    Map.of("message", "Case status updated to " + updated.getStatus(), "status", updated.getStatus())
            );
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
