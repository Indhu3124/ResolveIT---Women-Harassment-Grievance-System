package com.resolveit.backend.service;

import com.resolveit.backend.dto.StatusUpdateRequest;
import com.resolveit.backend.entity.Complaint;
import com.resolveit.backend.entity.User;
import com.resolveit.backend.repository.ComplaintRepository;
import com.resolveit.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * CommitteeService — Committee Member Business Logic
 *
 * Handles:
 *   - Viewing assigned cases
 *   - Updating case status (by committee members)
 */
@Service
public class CommitteeService {

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

    // ─── Get Assigned Cases ────────────────────────────────────────

    /**
     * Get all complaints assigned to a specific committee member.
     * Used on the committee/dashboard.html to show "My Cases".
     *
     * @param memberId  the committee member's user ID
     * @return list of complaints assigned to them
     */
    public List<Complaint> getAssignedCases(Long memberId) {
        return complaintRepository.findByAssignedToId(memberId);
    }

    // ─── Update Case Status (by Committee) ────────────────────────

    /**
     * Committee member updates the status of an assigned case.
     *
     * Typical workflow:
     *   UNDER_REVIEW → IN_INVESTIGATION → RESOLVED (or ESCALATED)
     *
     * @param caseId   the complaint ID
     * @param request  new status and the committee member's ID
     * @return the updated Complaint
     */
    public Complaint updateCaseStatus(Long caseId, StatusUpdateRequest request) {

        // Find the complaint
        Complaint complaint = complaintRepository.findById(caseId)
                .orElseThrow(() -> new RuntimeException("Complaint not found with ID: " + caseId));

        // Parse status string to enum
        Complaint.Status newStatus;
        try {
            newStatus = Complaint.Status.valueOf(request.getStatus().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid status: " + request.getStatus());
        }

        String oldStatus = complaint.getStatus().name();
        complaint.setStatus(newStatus);
        Complaint updated = complaintRepository.save(complaint);

        // Get committee member name for audit log
        String performedBy = "Committee Member";
        if (request.getPerformedById() != null) {
            performedBy = userRepository.findById(request.getPerformedById())
                    .map(User::getName).orElse("Committee Member");
        }

        auditLogService.addLog(
                "Case Status Updated",
                "Complaint #" + caseId + " status updated from " + oldStatus + " to " + newStatus,
                performedBy,
                "COMMITTEE",
                caseId
        );

        // Send Email if resolved
        if (newStatus == Complaint.Status.RESOLVED) {
            User complainant = complaint.getComplainant();
            String text = "Dear " + complainant.getName() + ",\n\n" +
                    "Your complaint '" + complaint.getTitle() + "' has been RESOLVED.\n" +
                    "Please log into your dashboard to view the details and provide feedback.\n\n" +
                    "Best Regards,\nResolveIT Committee";
            emailService.sendEmail(complainant.getEmail(), "Complaint Resolved", text);
        }

        if (complaint.getComplainant() != null) {
            notificationService.createNotification("Your case #" + caseId + " status updated to " + newStatus, complaint.getComplainant().getId());
        }

        return updated;
    }
}
