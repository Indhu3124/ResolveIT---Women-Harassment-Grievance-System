package com.resolveit.backend.service;

import com.resolveit.backend.dto.FeedbackRequest;
import com.resolveit.backend.entity.Complaint;
import com.resolveit.backend.entity.Feedback;
import com.resolveit.backend.entity.User;
import com.resolveit.backend.repository.ComplaintRepository;
import com.resolveit.backend.repository.FeedbackRepository;
import com.resolveit.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * FeedbackService — Feedback Business Logic
 *
 * Handles:
 *   - Submitting feedback for a resolved case
 *   - Retrieving feedback for a specific case
 */
@Service
public class FeedbackService {

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogService auditLogService;

    // ─── Submit Feedback ──────────────────────────────────────────

    /**
     * Submit feedback for a resolved case.
     *
     * Steps:
     * 1. Find the complaint
     * 2. Verify it is RESOLVED (only resolved cases accept feedback)
     * 3. Check that feedback hasn't been submitted already
     * 4. Save the feedback
     * 5. Log it in the audit trail
     *
     * @param request  rating, comment, caseId from the frontend
     * @return the saved Feedback entity
     */
    public Feedback submitFeedback(FeedbackRequest request) {

        // Step 1: Find the complaint
        Complaint complaint = complaintRepository.findById(request.getCaseId())
                .orElseThrow(() -> new RuntimeException("Complaint not found with ID: " + request.getCaseId()));

        // Step 2: Verify case is resolved
        if (!complaint.getStatus().equals(Complaint.Status.RESOLVED)) {
            throw new RuntimeException("Feedback can only be submitted for RESOLVED cases.");
        }

        // Step 3: Prevent duplicate feedback
        if (feedbackRepository.existsByComplaintId(request.getCaseId())) {
            throw new RuntimeException("Feedback has already been submitted for this case.");
        }

        // Step 4: Build and save feedback
        Feedback feedback = Feedback.builder()
                .complaint(complaint)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        Feedback saved = feedbackRepository.save(feedback);

        // Step 5: Audit log
        String submittedBy = "Complainant";
        if (request.getSubmittedById() != null) {
            submittedBy = userRepository.findById(request.getSubmittedById())
                    .map(User::getName).orElse("Complainant");
        }

        auditLogService.addLog(
                "Feedback Submitted",
                "Feedback submitted for Complaint #" + request.getCaseId() + " — Rating: " + request.getRating() + "/5",
                submittedBy,
                "COMPLAINANT",
                request.getCaseId()
        );

        return saved;
    }

    // ─── Get Feedback for a Case ──────────────────────────────────

    /**
     * Retrieve feedback for a specific complaint.
     * Returns empty Optional if no feedback has been submitted yet.
     *
     * @param caseId  the complaint ID
     * @return Optional containing the Feedback if it exists
     */
    public Optional<Feedback> getFeedbackByCaseId(Long caseId) {
        return feedbackRepository.findByComplaintId(caseId);
    }
}
