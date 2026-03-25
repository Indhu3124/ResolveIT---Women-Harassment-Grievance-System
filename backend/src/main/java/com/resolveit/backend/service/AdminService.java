package com.resolveit.backend.service;

import com.resolveit.backend.dto.AddMemberRequest;
import com.resolveit.backend.dto.AssignRequest;
import com.resolveit.backend.dto.DashboardStats;
import com.resolveit.backend.dto.StatusUpdateRequest;
import com.resolveit.backend.entity.Complaint;
import com.resolveit.backend.entity.User;
import com.resolveit.backend.repository.ComplaintRepository;
import com.resolveit.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * AdminService — Admin Business Logic
 *
 * Handles:
 *   - Dashboard statistics
 *   - Adding committee members
 *   - Assigning complaints to committee members
 *   - Updating complaint status
 */
@Service
public class AdminService {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogService auditLogService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private NotificationService notificationService;

    // ─── Dashboard Statistics ────────────────────────────────────

    /**
     * Calculate and return dashboard statistics.
     * These numbers populate the stat cards on admin/dashboard.html.
     *
     * @return DashboardStats with counts for each status
     */
    public DashboardStats getDashboardStats() {
        long total = complaintRepository.count();
        long submitted = complaintRepository.countByStatus(Complaint.Status.SUBMITTED);
        long underReview = complaintRepository.countByStatus(Complaint.Status.UNDER_REVIEW);
        long inInvestigation = complaintRepository.countByStatus(Complaint.Status.IN_INVESTIGATION);
        long resolved = complaintRepository.countByStatus(Complaint.Status.RESOLVED);
        long escalated = complaintRepository.countByStatus(Complaint.Status.ESCALATED);
        long totalComplainants = userRepository.findByRole(User.Role.COMPLAINANT).size();

        return DashboardStats.builder()
                .total(total)
                .submitted(submitted)
                .underReview(underReview)
                .inInvestigation(inInvestigation)
                .resolved(resolved)
                .escalated(escalated)
                .totalComplainants(totalComplainants)
                .build();
    }

    // ─── Add Committee Member ─────────────────────────────────────

    /**
     * Add a new committee member to the system.
     *
     * The admin fills in the "Add Committee Member" modal.
     * This creates a User account with role=COMMITTEE.
     * Default password is "committee123" (matches the frontend notice in the modal).
     *
     * @param request  member form data
     * @return the newly created User entity
     */
    public User addCommitteeMember(AddMemberRequest request) {

        // Prevent duplicate email
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("A user with email " + request.getEmail() + " already exists.");
        }

        // Build the committee member user
        User member = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password("committee123")             // Default password shown in the modal
                .role(User.Role.COMMITTEE)
                .department(request.getDepartment() != null
                        ? request.getDepartment()
                        : request.getSpecialization())
                .build();

        User saved = userRepository.save(member);

        // Audit log
        auditLogService.addLog(
                "Committee Member Added",
                request.getName() + " added to committee as " + request.getSpecialization(),
                "Admin",
                "ADMIN",
                null
        );

        return saved;
    }

    // ─── Get All Committee Members ────────────────────────────────

    /**
     * Return all users with the COMMITTEE role.
     * Used to populate the committee member cards on the admin dashboard
     * and the assignment dropdown on case-details.html.
     *
     * @return list of committee member users
     */
    public List<User> getCommitteeMembers() {
        return userRepository.findByRole(User.Role.COMMITTEE);
    }

    // ─── Assign Complaint ─────────────────────────────────────────

    /**
     * Assign a complaint to a committee member.
     *
     * Steps:
     * 1. Find the complaint
     * 2. Find the committee member (User)
     * 3. Set the assignedTo field
     * 4. Auto-change status from SUBMITTED → UNDER_REVIEW
     * 5. Save and log
     *
     * @param complaintId  the complaint to assign
     * @param request      contains committeeUserId and performedById
     * @return the updated Complaint
     */
    public Complaint assignComplaint(Long complaintId, AssignRequest request) {

        // Step 1: Find the complaint
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found with ID: " + complaintId));

        // Step 2: Find the committee member
        User member = userRepository.findById(request.getCommitteeUserId())
                .orElseThrow(() -> new RuntimeException("Committee member not found with ID: " + request.getCommitteeUserId()));

        // Ensure the selected user is actually a committee member
        if (!member.getRole().equals(User.Role.COMMITTEE)) {
            throw new RuntimeException("Selected user is not a committee member.");
        }

        // Step 3 & 4: Assign and update status
        complaint.setAssignedTo(member);
        if (complaint.getStatus() == Complaint.Status.SUBMITTED) {
            complaint.setStatus(Complaint.Status.UNDER_REVIEW);
        }

        // Step 5: Save and log
        Complaint updated = complaintRepository.save(complaint);

        String performedBy = "Admin";
        if (request.getPerformedById() != null) {
            performedBy = userRepository.findById(request.getPerformedById())
                    .map(User::getName).orElse("Admin");
        }

        auditLogService.addLog(
                "Case Assigned",
                "Complaint #" + complaintId + " assigned to " + member.getName(),
                performedBy,
                "ADMIN",
                complaintId
        );

        // Send Email
        String text = "Dear " + member.getName() + ",\n\n" +
                "You have been assigned to investigate Complaint #" + complaintId + ": '" + complaint.getTitle() + "'.\n" +
                "Please review the details in your dashboard.\n\n" +
                "Best Regards,\nResolveIT Admin";
        emailService.sendEmail(member.getEmail(), "New Case Assigned", text);

        notificationService.createNotification("You have been assigned to new Case #" + complaintId, member.getId());

        if (complaint.getComplainant() != null) {
            notificationService.createNotification("Your case #" + complaintId + " has been assigned to a committee member", complaint.getComplainant().getId());
        }

        return updated;
    }

    // ─── Update Complaint Status ──────────────────────────────────

    /**
     * Update the status of a complaint (admin action).
     *
     * Status transitions:
     *   SUBMITTED → UNDER_REVIEW → IN_INVESTIGATION → RESOLVED
     *   Any status → ESCALATED (if urgent)
     *
     * @param complaintId  the complaint ID
     * @param request      new status string and performer ID
     * @return the updated Complaint
     */
    public Complaint updateComplaintStatus(Long complaintId, StatusUpdateRequest request) {

        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found."));

        // Parse the status string into the enum
        Complaint.Status newStatus;
        try {
            newStatus = Complaint.Status.valueOf(request.getStatus().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status value: " + request.getStatus());
        }

        String oldStatus = complaint.getStatus().name();
        complaint.setStatus(newStatus);
        Complaint updated = complaintRepository.save(complaint);

        String performedBy = "Admin";
        if (request.getPerformedById() != null) {
            performedBy = userRepository.findById(request.getPerformedById())
                    .map(User::getName).orElse("Admin");
        }

        auditLogService.addLog(
                "Status Updated",
                "Complaint #" + complaintId + " status changed from " + oldStatus + " to " + newStatus,
                performedBy,
                "ADMIN",
                complaintId
        );

        if (complaint.getComplainant() != null) {
            notificationService.createNotification("Your case #" + complaintId + " status updated to " + newStatus, complaint.getComplainant().getId());
        }

        return updated;
    }
}
