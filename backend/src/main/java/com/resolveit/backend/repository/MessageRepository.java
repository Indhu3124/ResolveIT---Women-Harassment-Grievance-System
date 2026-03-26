package com.resolveit.backend.repository;

import com.resolveit.backend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    
    // ─── Basic Queries ─────────────────────────────────────────────────
    
    /**
     * Get all messages for a specific complaint, ordered by creation time
     */
    List<Message> findByComplaintIdOrderByCreatedAtAsc(Long complaintId);
    
    // ─── Mark as Read Queries ──────────────────────────────────────────
    
    /**
     * Mark all messages as read by the complainant for a specific complaint
     * Only marks messages not sent by the complainant
     */
    @Modifying
    @Transactional
    @Query("UPDATE Message m SET m.readByComplainant = true " +
           "WHERE m.complaint.id = :complaintId " +
           "AND m.senderRole != 'COMPLAINANT'")
    int markAllReadByComplainant(@Param("complaintId") Long complaintId);
    
    /**
     * Mark all messages as read by the committee for a specific complaint
     * Only marks messages not sent by the committee
     */
    @Modifying
    @Transactional
    @Query("UPDATE Message m SET m.readByCommittee = true " +
           "WHERE m.complaint.id = :complaintId " +
           "AND m.senderRole != 'COMMITTEE'")
    int markAllReadByCommittee(@Param("complaintId") Long complaintId);
    
    // ─── Unread Count Queries (single complaint) ───────────────────────
    
    /**
     * Count unread messages for the complainant in a specific complaint
     * Counts messages not sent by complainant and not read by complainant
     */
    @Query("SELECT COUNT(m) FROM Message m " +
           "WHERE m.complaint.id = :complaintId " +
           "AND m.readByComplainant = false " +
           "AND m.senderRole != 'COMPLAINANT'")
    long countUnreadByComplainant(@Param("complaintId") Long complaintId);
    
    /**
     * Count unread messages for the committee in a specific complaint
     * Counts messages not sent by committee and not read by committee
     */
    @Query("SELECT COUNT(m) FROM Message m " +
           "WHERE m.complaint.id = :complaintId " +
           "AND m.readByCommittee = false " +
           "AND m.senderRole != 'COMMITTEE'")
    long countUnreadByCommittee(@Param("complaintId") Long complaintId);
    
    // ─── Total Unread Count Queries (all complaints) ───────────────────
    
    /**
     * Count total unread messages across all complaints for a complainant
     */
    @Query("SELECT COUNT(m) FROM Message m " +
           "WHERE m.complaint.complainant.id = :userId " +
           "AND m.readByComplainant = false " +
           "AND m.senderRole != 'COMPLAINANT'")
    long countTotalUnreadForComplainant(@Param("userId") Long userId);
    
    /**
     * Count total unread messages across all complaints for a committee member
     */
    @Query("SELECT COUNT(m) FROM Message m " +
           "WHERE m.complaint.assignedTo.id = :userId " +
           "AND m.readByCommittee = false " +
           "AND m.senderRole != 'COMMITTEE'")
    long countTotalUnreadForCommittee(@Param("userId") Long userId);
    
    // ─── Additional Useful Queries ─────────────────────────────────────
    
    /**
     * Get all unread messages for a complainant across all their complaints
     */
    @Query("SELECT m FROM Message m " +
           "WHERE m.complaint.complainant.id = :userId " +
           "AND m.readByComplainant = false " +
           "AND m.senderRole != 'COMPLAINANT' " +
           "ORDER BY m.createdAt DESC")
    List<Message> findUnreadMessagesForComplainant(@Param("userId") Long userId);
    
    /**
     * Get all unread messages for a committee member across assigned complaints
     */
    @Query("SELECT m FROM Message m " +
           "WHERE m.complaint.assignedTo.id = :userId " +
           "AND m.readByCommittee = false " +
           "AND m.senderRole != 'COMMITTEE' " +
           "ORDER BY m.createdAt DESC")
    List<Message> findUnreadMessagesForCommittee(@Param("userId") Long userId);
    
    /**
     * Delete all messages for a specific complaint (useful when deleting complaints)
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM Message m WHERE m.complaint.id = :complaintId")
    void deleteByComplaintId(@Param("complaintId") Long complaintId);
}