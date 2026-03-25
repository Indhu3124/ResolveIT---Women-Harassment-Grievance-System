package com.resolveit.backend.service;

import com.resolveit.backend.dto.ComplaintRequest;
import com.resolveit.backend.entity.Complaint;
import com.resolveit.backend.entity.User;
import com.resolveit.backend.repository.ComplaintRepository;
import com.resolveit.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ComplaintService {

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

    // ─── Submit a New Complaint ────────────────────────────────────
    public Complaint createComplaint(ComplaintRequest request) {

        // Step 1: Find the complainant user
        User complainant = userRepository.findById(request.getComplainantId())
                .orElseThrow(() -> new RuntimeException("Complainant not found with ID: " + request.getComplainantId()));

        // Step 2: Parse priority
        Complaint.Priority priority;
        try {
            priority = Complaint.Priority.valueOf(request.getPriority().toUpperCase());
        } catch (Exception e) {
            priority = Complaint.Priority.MEDIUM;
        }

        // Step 3: Build and save the complaint
        // FIX: Added incidentLocation, incidentDate, incidentTime (all optional — null if not provided)
     Complaint complaint = Complaint.builder()
        .title(request.getTitle())
        .description(request.getDescription())
        .type(request.getType())
        .priority(priority)
        .status(Complaint.Status.SUBMITTED)
        .complainant(complainant)
        .assignedTo(null)
        .anonymous(request.isAnonymous())
        .incidentLocation(request.getIncidentLocation())
        .incidentDate(request.getIncidentDate())
        .incidentTime(request.getIncidentTime())

        .evidenceFileName(request.getEvidenceFileName())

        .build();
        Complaint saved = complaintRepository.save(complaint);

        // Step 4: Audit log
        String actorName = request.isAnonymous() ? "Anonymous" : complainant.getName();
        auditLogService.addLog(
                "Complaint Submitted",
                "Complaint #" + saved.getId() + " submitted: " + saved.getTitle(),
                actorName,
                "COMPLAINANT",
                saved.getId()
        );

        // Email notification (placeholder)
        emailService.sendEmail(
                complainant.getEmail(),
                "Complaint Submitted Successfully",
                "Dear " + complainant.getName() + ",\n\nYour complaint '" + saved.getTitle() +
                "' has been successfully submitted.\nWe will review it shortly.\n\nResolveIT Team"
        );

        // Notify complainant
        notificationService.createNotification(
                "Your complaint '" + saved.getTitle() + "' has been successfully submitted.",
                complainant.getId()
        );

        // Notify all admins
        List<User> admins = userRepository.findByRole(User.Role.ADMIN);
        for (User admin : admins) {
            notificationService.createNotification(
                    "New complaint submitted: " + saved.getTitle(),
                    admin.getId()
            );
        }

        return saved;
    }

    // ─── Get All Complaints ────────────────────────────────────────
    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    // ─── Get Single Complaint ──────────────────────────────────────
    public Complaint getComplaintById(Long id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found with ID: " + id));
    }

    // ─── Get Complaints By Complainant ─────────────────────────────
    public List<Complaint> getComplaintsByComplainant(Long userId) {
        return complaintRepository.findByComplainantId(userId);
    }
}