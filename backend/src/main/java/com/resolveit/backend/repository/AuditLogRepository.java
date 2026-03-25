package com.resolveit.backend.repository;

import com.resolveit.backend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * AuditLogRepository
 *
 * Provides database access for the AuditLog entity.
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    /**
     * Get all audit logs for a specific complaint case.
     * Used to display the activity history for a single case.
     *
     * SQL: SELECT * FROM audit_logs WHERE case_id = ?
     */
    List<AuditLog> findByCaseId(Long caseId);

    /**
     * Get all audit logs, ordered from newest to oldest.
     * Used by Admin in the Audit Logs section of the dashboard.
     *
     * SQL: SELECT * FROM audit_logs ORDER BY timestamp DESC
     */
    List<AuditLog> findAllByOrderByTimestampDesc();
}
