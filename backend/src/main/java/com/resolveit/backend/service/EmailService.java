package com.resolveit.backend.service;

import org.springframework.stereotype.Service;

@Service
public class EmailService {

    public void sendEmail(String toEmail, String subject, String body) {
        System.out.println("[EMAIL] To: " + toEmail + " | Subject: " + subject);
    }

    public void sendRegistrationEmail(String toEmail, String userName) {
        System.out.println("[EMAIL] Registration email to: " + toEmail);
    }

    public void sendCaseAssignedEmail(String toEmail, String memberName, Long caseId, String caseTitle) {
        System.out.println("[EMAIL] Case assigned: " + toEmail + " Case #" + caseId);
    }

    public void sendStatusUpdateEmail(String toEmail, String userName, Long caseId, String newStatus) {
        System.out.println("[EMAIL] Status update: " + toEmail + " -> " + newStatus);
    }
}