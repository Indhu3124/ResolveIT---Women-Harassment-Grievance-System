package com.resolveit.backend.config;

import com.resolveit.backend.entity.*;
import com.resolveit.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            System.out.println("Seeding database with initial test data...");

            // 1. Create Users
            User admin = User.builder()
                    .name("System Admin")
                    .email("admin@resolveit.com")
                    .password("admin123")
                    .role(User.Role.ADMIN)
                    .department("Administration")
                    .createdAt(LocalDateTime.now())
                    .build();

            User committee1 = User.builder()
                    .name("Dr. Sarah Jenkins")
                    .email("sarah.jenkins@resolveit.com")
                    .password("comm123")
                    .role(User.Role.COMMITTEE)
                    .department("HR Compliance")
                    .createdAt(LocalDateTime.now())
                    .build();

            User committee2 = User.builder()
                    .name("Officer Rajesh Kumar")
                    .email("rajesh.kumar@resolveit.com")
                    .password("comm123")
                    .role(User.Role.COMMITTEE)
                    .department("Legal")
                    .createdAt(LocalDateTime.now())
                    .build();

            User complainant1 = User.builder()
                    .name("Priya Sharma")
                    .email("priya.sharma@resolveit.com")
                    .password("user123")
                    .role(User.Role.COMPLAINANT)
                    .department("Engineering")
                    .createdAt(LocalDateTime.now())
                    .build();

            User complainant2 = User.builder()
                    .name("Amit Patel")
                    .email("amit.patel@resolveit.com")
                    .password("user123")
                    .role(User.Role.COMPLAINANT)
                    .department("Marketing")
                    .createdAt(LocalDateTime.now())
                    .build();

            userRepository.save(admin);
            userRepository.save(committee1);
            userRepository.save(committee2);
            userRepository.save(complainant1);
            userRepository.save(complainant2);

            // 2. Create Complaints
            Complaint complaint1 = Complaint.builder()
                    .title("Inappropriate Language in Meeting")
                    .description("A senior developer repeatedly used inappropriate language during the weekly standup meeting.")
                    .type("Verbal Harassment")
                    .priority(Complaint.Priority.MEDIUM)
                    .status(Complaint.Status.SUBMITTED)
                    .complainant(complainant1)
                    .anonymous(false)
                    .createdAt(LocalDateTime.now().minusDays(2))
                    .updatedAt(LocalDateTime.now().minusDays(2))
                    .build();

            Complaint complaint2 = Complaint.builder()
                    .title("Biased Performance Review")
                    .description("My manager exhibited clear bias during my annual review, ignoring my key contributions.")
                    .type("Workplace Discrimination")
                    .priority(Complaint.Priority.HIGH)
                    .status(Complaint.Status.IN_INVESTIGATION)
                    .complainant(complainant2)
                    .assignedTo(committee1)
                    .anonymous(false)
                    .createdAt(LocalDateTime.now().minusDays(5))
                    .updatedAt(LocalDateTime.now().minusDays(1))
                    .build();

            Complaint complaint3 = Complaint.builder()
                    .title("Unwelcome Advances")
                    .description("A colleague made unwelcome advances at the company offsite event.")
                    .type("Sexual Harassment")
                    .priority(Complaint.Priority.HIGH)
                    .status(Complaint.Status.RESOLVED)
                    .complainant(complainant1)
                    .assignedTo(committee2)
                    .anonymous(true)
                    .createdAt(LocalDateTime.now().minusDays(10))
                    .updatedAt(LocalDateTime.now().minusDays(3))
                    .build();

            complaintRepository.save(complaint1);
            complaintRepository.save(complaint2);
            complaintRepository.save(complaint3);

            // 3. Create Audit Logs
            AuditLog log1 = AuditLog.builder()
                    .action("Complaint Submitted")
                    .detail("Complaint titled 'Inappropriate Language in Meeting' was submitted.")
                    .actor(complainant1.getName())
                    .actorRole(complainant1.getRole().name())
                    .caseId(complaint1.getId())
                    .timestamp(complaint1.getCreatedAt())
                    .build();

            AuditLog log2 = AuditLog.builder()
                    .action("Case Assigned")
                    .detail("Case assigned to Dr. Sarah Jenkins.")
                    .actor(admin.getName())
                    .actorRole(admin.getRole().name())
                    .caseId(complaint2.getId())
                    .timestamp(complaint2.getCreatedAt().plusDays(1))
                    .build();

            AuditLog log3 = AuditLog.builder()
                    .action("Status Updated")
                    .detail("Status changed to IN_INVESTIGATION by committee member.")
                    .actor(committee1.getName())
                    .actorRole(committee1.getRole().name())
                    .caseId(complaint2.getId())
                    .timestamp(complaint2.getUpdatedAt())
                    .build();

            AuditLog log4 = AuditLog.builder()
                    .action("Case Resolved")
                    .detail("Case was successfully resolved after investigation.")
                    .actor(committee2.getName())
                    .actorRole(committee2.getRole().name())
                    .caseId(complaint3.getId())
                    .timestamp(complaint3.getUpdatedAt())
                    .build();

            auditLogRepository.save(log1);
            auditLogRepository.save(log2);
            auditLogRepository.save(log3);
            auditLogRepository.save(log4);

            // 4. Create Notifications
            Notification notif1 = Notification.builder()
                    .message("Your complaint 'Inappropriate Language in Meeting' has been submitted.")
                    .userId(complainant1.getId())
                    .read(false)
                    .createdAt(complaint1.getCreatedAt())
                    .build();

            Notification notif2 = Notification.builder()
                    .message("You have been assigned a new case: 'Biased Performance Review'.")
                    .userId(committee1.getId())
                    .read(false)
                    .createdAt(complaint2.getCreatedAt().plusDays(1))
                    .build();

            Notification notif3 = Notification.builder()
                    .message("Your case 'Unwelcome Advances' has been resolved.")
                    .userId(complainant1.getId())
                    .read(true)
                    .createdAt(complaint3.getUpdatedAt())
                    .build();

            notificationRepository.save(notif1);
            notificationRepository.save(notif2);
            notificationRepository.save(notif3);

            // 5. Create Feedback
            Feedback feedback = Feedback.builder()
                    .complaint(complaint3)
                    .rating(5)
                    .comment("The committee handled this sensitively and efficiently. Thank you.")
                    .createdAt(LocalDateTime.now().minusDays(1))
                    .build();

            feedbackRepository.save(feedback);

            System.out.println("Test data seeding completed.");
        }
    }
}
