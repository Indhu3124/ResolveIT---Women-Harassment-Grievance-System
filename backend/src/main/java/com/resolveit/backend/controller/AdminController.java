package com.resolveit.backend.controller;

import com.resolveit.backend.dto.AddMemberRequest;
import com.resolveit.backend.dto.AssignRequest;
import com.resolveit.backend.dto.DashboardStats;
import com.resolveit.backend.dto.StatusUpdateRequest;
import com.resolveit.backend.entity.Complaint;
import com.resolveit.backend.entity.User;
import com.resolveit.backend.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * AdminController — Admin REST API
 *
 * Handles everything the Admin can do:
 *   - View dashboard statistics
 *   - Add/view committee members
 *   - Assign complaints to committee members
 *   - Update case status
 *
 * All endpoints are prefixed with /api/admin or /api/complaints (for assign/status)
 */
@RestController
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private AdminService adminService;

    // ─── GET /api/admin/dashboard ──────────────────────────────────

    /**
     * Get dashboard statistics for the admin overview page.
     *
     * Response example:
     * {
     *   "total": 25,
     *   "submitted": 5,
     *   "underReview": 8,
     *   "inInvestigation": 4,
     *   "resolved": 7,
     *   "escalated": 1,
     *   "totalComplainants": 20
     * }
     */
    @GetMapping("/api/admin/dashboard")
    public ResponseEntity<DashboardStats> getDashboardStats() {
        DashboardStats stats = adminService.getDashboardStats();
        return ResponseEntity.ok(stats);
    }

    // ─── POST /api/admin/committee-members ────────────────────────

    /**
     * Add a new committee member (creates a COMMITTEE user account).
     * Called when the admin submits the "Add Committee Member" modal form.
     *
     * Request body example:
     * {
     *   "name": "Dr. Priya Sharma",
     *   "email": "priya@authority.gov.in",
     *   "department": "Cyber Crime Cell",
     *   "specialization": "Cyber Crime Expert"
     * }
     */
    @PostMapping("/api/admin/committee-members")
    public ResponseEntity<?> addCommitteeMember(@Valid @RequestBody AddMemberRequest request) {
        try {
            User member = adminService.addCommitteeMember(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(
                    Map.of("message", "Committee member added successfully.", "userId", member.getId())
            );
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ─── GET /api/admin/committee-members ─────────────────────────

    /**
     * Get all committee members.
     * Used to populate the committee cards section on the admin dashboard,
     * and to populate the "Assign to" dropdown on case-details.html.
     */
    @GetMapping("/api/admin/committee-members")
    public ResponseEntity<List<User>> getCommitteeMembers() {
        List<User> members = adminService.getCommitteeMembers();
        return ResponseEntity.ok(members);
    }

    // ─── PUT /api/complaints/{id}/assign ──────────────────────────

    /**
     * Assign a complaint to a committee member.
     * Changes the complaint status from SUBMITTED → UNDER_REVIEW automatically.
     *
     * Called from the admin case-details page when the admin hits "Assign".
     *
     * Request body example:
     * {
     *   "committeeUserId": 5,
     *   "performedById": 1
     * }
     */
    @PutMapping("/api/complaints/{id}/assign")
    public ResponseEntity<?> assignComplaint(
            @PathVariable Long id,
            @RequestBody AssignRequest request) {
        try {
            Complaint updated = adminService.assignComplaint(id, request);
            return ResponseEntity.ok(Map.of("message", "Complaint assigned successfully.", "status", updated.getStatus()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ─── PUT /api/complaints/{id}/status ──────────────────────────

    /**
     * Update the status of a complaint (admin action).
     * Admin can change status to any value.
     *
     * Request body example:
     * {
     *   "status": "ESCALATED",
     *   "performedById": 1
     * }
     */
    @PutMapping("/api/complaints/{id}/status")
    public ResponseEntity<?> updateComplaintStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateRequest request) {
        try {
            Complaint updated = adminService.updateComplaintStatus(id, request);
            return ResponseEntity.ok(Map.of("message", "Status updated to " + updated.getStatus(), "status", updated.getStatus()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
