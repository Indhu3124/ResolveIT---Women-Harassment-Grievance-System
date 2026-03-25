package com.resolveit.backend.controller;

import com.resolveit.backend.entity.AuditLog;
import com.resolveit.backend.service.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * AuditLogController — Audit Logs REST API
 *
 * Provides read-only access to the audit trail.
 * Used by the Admin to view the "Audit Logs" section on the dashboard,
 * and on case details pages to show the activity history of a case.
 *
 * Base path: /api/audit-logs
 */
@RestController
@RequestMapping("/api/audit-logs")
@CrossOrigin(origins = "*")
public class AuditLogController {

    @Autowired
    private AuditLogService auditLogService;

    // ─── GET /api/audit-logs ──────────────────────────────────────

    /**
     * Get all audit logs, ordered from newest to oldest.
     * Used in the Admin Dashboard "Audit Logs" section.
     *
     * Response: array of AuditLog objects
     * [
     *   {
     *     "id": 12,
     *     "action": "Case Assigned",
     *     "detail": "Complaint #5 assigned to Officer Ravi Kumar",
     *     "actor": "System Administrator",
     *     "actorRole": "ADMIN",
     *     "caseId": 5,
     *     "timestamp": "2026-03-09T14:30:00"
     *   }, ...
     * ]
     */
    @GetMapping
    public ResponseEntity<List<AuditLog>> getAllLogs() {
        List<AuditLog> logs = auditLogService.getAllLogs();
        return ResponseEntity.ok(logs);
    }

    // ─── GET /api/audit-logs/{caseId} ────────────────────────────

    /**
     * Get all audit logs related to a specific complaint case.
     * Used on the case details page to show the full activity timeline
     * (submitted → assigned → status changes → feedback).
     *
     * Example: GET /api/audit-logs/5
     * Returns all logs where caseId = 5
     */
    @GetMapping("/{caseId}")
    public ResponseEntity<List<AuditLog>> getLogsByCaseId(@PathVariable Long caseId) {
        List<AuditLog> logs = auditLogService.getLogsByCaseId(caseId);
        return ResponseEntity.ok(logs);
    }
}
