package com.resolveit.backend.repository;

import com.resolveit.backend.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * ComplaintRepository
 *
 * Provides database access for the Complaint entity.
 * Extends JpaRepository for built-in CRUD operations.
 *
 * Custom query methods are interpreted by Spring Data JPA
 * from method names — no SQL needed.
 */
@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    /**
     * Get all complaints submitted by a specific user (complainant).
     * Used on the complainant dashboard to show "My Complaints".
     *
     * SQL: SELECT * FROM complaints WHERE complainant_id = ?
     */
    List<Complaint> findByComplainantId(Long complainantId);

    /**
     * Get all complaints assigned to a specific committee member.
     * Used on the committee dashboard to show "My Cases".
     *
     * SQL: SELECT * FROM complaints WHERE assigned_to_id = ?
     */
    List<Complaint> findByAssignedToId(Long memberId);

    /**
     * Get all complaints with a specific status.
     * Useful for admin to filter cases (e.g., all ESCALATED cases).
     *
     * SQL: SELECT * FROM complaints WHERE status = ?
     */
    List<Complaint> findByStatus(Complaint.Status status);

    /**
     * Count complaints by status — used for dashboard statistics.
     *
     * SQL: SELECT COUNT(*) FROM complaints WHERE status = ?
     */
    long countByStatus(Complaint.Status status);
}
