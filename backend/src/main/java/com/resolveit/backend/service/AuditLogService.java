package com.resolveit.backend.service;

import com.resolveit.backend.entity.AuditLog;
import com.resolveit.backend.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * AuditLogService — Audit Logging Business Logic
 *
 * Records every significant action in the system.
 * This service is used by all other services to create log entries.
 *
 * Declared before other services because they @Autowired it.
 */
@Service
public class AuditLogService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    // ─── Add a log entry ──────────────────────────────────────────

    /**
     * Create a new audit log entry.
     *
     * Called by other services whenever an important action happens:
     *   - User registered
     *   - Complaint submitted
     *   - Case assigned
     *   - Status updated
     *   - Feedback submitted
     *
     * @param action      Short action name (e.g., "Case Assigned")
     * @param detail      Descriptive detail (e.g., "Case #5 assigned to Ravi Kumar")
     * @param actor       Name of the person who did the action
     * @param actorRole   Their role (e.g., "ADMIN", "COMMITTEE", "COMPLAINANT")
     * @param caseId      Related complaint ID (nullable if not case-related)
     */
    public void addLog(String action, String detail, String actor, String actorRole, Long caseId) {
        AuditLog log = AuditLog.builder()
                .action(action)
                .detail(detail)
                .actor(actor)
                .actorRole(actorRole)
                .caseId(caseId)
                .build();

        auditLogRepository.save(log);
    }

    // ─── Get all logs ─────────────────────────────────────────────

    /**
     * Get all audit logs, newest first.
     * Used by the Admin dashboard Audit Logs section.
     *
     * @return list of AuditLog entries ordered by timestamp desc
     */
    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }

    // ─── Get logs for a specific case ─────────────────────────────

    /**
     * Get all log entries for a specific complaint case.
     * Used on the case detail page to show activity history.
     *
     * @param caseId  the complaint ID
     * @return list of AuditLog entries for that case
     */
    public List<AuditLog> getLogsByCaseId(Long caseId) {
        return auditLogRepository.findByCaseId(caseId);
    }
}
