package com.resolveit.backend.service;

import com.resolveit.backend.dto.MessageDTO;
import com.resolveit.backend.entity.Message;
import com.resolveit.backend.entity.User;
import com.resolveit.backend.entity.Complaint;
import com.resolveit.backend.repository.MessageRepository;
import com.resolveit.backend.repository.UserRepository;
import com.resolveit.backend.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    private final FileStorageService fileStorageService;

    // ── Get all messages for a complaint (marks as read automatically) ─
    @Transactional
    public List<MessageDTO.Response> getMessages(Long complaintId, Long requestingUserId) {
        Complaint complaint = findComplaint(complaintId);

        // Auto-mark as read based on who is requesting
        String role = resolveReaderRole(complaint, requestingUserId);
        if ("COMPLAINANT".equals(role)) {
            messageRepository.markAllReadByComplainant(complaintId);
        } else if ("COMMITTEE".equals(role)) {
            messageRepository.markAllReadByCommittee(complaintId);
        }

        return messageRepository
                .findByComplaintIdOrderByCreatedAtAsc(complaintId)
                .stream()
                .map(MessageDTO.Response::from)
                .collect(Collectors.toList());
    }

    // ── Send a text message ───────────────────────────────────────────
    @Transactional
    public MessageDTO.Response sendTextMessage(MessageDTO.SendRequest req) {
        User sender     = findUser(req.getSenderId());
        Complaint comp  = findComplaint(req.getComplaintId());

        validateAccess(comp, sender, req.getSenderRole());

        Message message = Message.builder()
                .complaint(comp)
                .sender(sender)
                .senderRole(Message.SenderRole.valueOf(req.getSenderRole()))
                .text(req.getText())
                .messageType(Message.MessageType.TEXT)
                // Sender has already "read" their own message
                .readByComplainant("COMPLAINANT".equals(req.getSenderRole()))
                .readByCommittee("COMMITTEE".equals(req.getSenderRole()))
                .build();

        return MessageDTO.Response.from(messageRepository.save(message));
    }

    // ── Send a file attachment (optionally with caption text) ─────────
    @Transactional
    public MessageDTO.Response sendFileMessage(
            Long complaintId,
            Long senderId,
            String senderRole,
            String captionText,
            MultipartFile file) throws IOException {

        User sender     = findUser(senderId);
        Complaint comp  = findComplaint(complaintId);

        validateAccess(comp, sender, senderRole);

        // Validate file
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Save file to disk
        String storedPath = fileStorageService.store(file);

        Message message = Message.builder()
                .complaint(comp)
                .sender(sender)
                .senderRole(Message.SenderRole.valueOf(senderRole))
                .text(captionText)                          // optional caption
                .messageType(Message.MessageType.FILE)
                .fileName(file.getOriginalFilename())
                .filePath(storedPath)
                .fileType(file.getContentType())
                .fileSize(file.getSize())
                .readByComplainant("COMPLAINANT".equals(senderRole))
                .readByCommittee("COMMITTEE".equals(senderRole))
                .build();

        return MessageDTO.Response.from(messageRepository.save(message));
    }

    // ── Download attachment bytes ──────────────────────────────────────
    public byte[] downloadAttachment(Long messageId) throws IOException {
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found: " + messageId));

        if (msg.getFilePath() == null) {
            throw new RuntimeException("Message has no attachment");
        }
        return fileStorageService.load(msg.getFilePath());
    }

    // ── Get message entity (for serving file metadata) ────────────────
    public Message getMessage(Long messageId) {
        return messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found: " + messageId));
    }

    // ── Explicit mark-as-read (for read receipt API) ───────────────────
    @Transactional
    public int markRead(Long complaintId, String readerRole) {
        return switch (readerRole.toUpperCase()) {
            case "COMPLAINANT" -> messageRepository.markAllReadByComplainant(complaintId);
            case "COMMITTEE"   -> messageRepository.markAllReadByCommittee(complaintId);
            default            -> throw new IllegalArgumentException("Invalid role: " + readerRole);
        };
    }

    // ── Unread count for a single complaint ───────────────────────────
    public long getUnreadCount(Long complaintId, String readerRole) {
        return switch (readerRole.toUpperCase()) {
            case "COMPLAINANT" -> messageRepository.countUnreadByComplainant(complaintId);
            case "COMMITTEE"   -> messageRepository.countUnreadByCommittee(complaintId);
            default            -> throw new IllegalArgumentException("Invalid role: " + readerRole);
        };
    }

    // ── Total unread across all complaints (for sidebar badge) ─────────
    public long getTotalUnread(Long userId, String role) {
        return switch (role.toUpperCase()) {
            case "COMPLAINANT" -> messageRepository.countTotalUnreadForComplainant(userId);
            case "COMMITTEE"   -> messageRepository.countTotalUnreadForCommittee(userId);
            default            -> 0L;
        };
    }

    // ── Post a system message (called internally, e.g. on assignment) ──
    @Transactional
    public void postSystemMessage(Long complaintId, String text) {
        Complaint comp = findComplaint(complaintId);

        Message msg = Message.builder()
                .complaint(comp)
                .sender(null)
                .senderRole(Message.SenderRole.SYSTEM)
                .text(text)
                .messageType(Message.MessageType.SYSTEM)
                .readByComplainant(false)
                .readByCommittee(true)  // Committee doesn't need to read system messages
                .build();

        messageRepository.save(msg);
    }

    // ── Helpers ───────────────────────────────────────────────────────
    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
    }

    private Complaint findComplaint(Long id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found: " + id));
    }

    // Determine reader role from who made the request
    private String resolveReaderRole(Complaint complaint, Long userId) {
        if (complaint.getComplainant() != null &&
            complaint.getComplainant().getId().equals(userId)) {
            return "COMPLAINANT";
        }
        if (complaint.getAssignedTo() != null &&
            complaint.getAssignedTo().getId().equals(userId)) {
            return "COMMITTEE";
        }
        return "UNKNOWN";
    }

    // Only the complainant of the complaint and the assigned committee member may send
    private void validateAccess(Complaint complaint, User sender, String role) {
        boolean isComplainant = "COMPLAINANT".equals(role) &&
                complaint.getComplainant() != null &&
                complaint.getComplainant().getId().equals(sender.getId());

        boolean isCommittee = "COMMITTEE".equals(role) &&
                complaint.getAssignedTo() != null &&
                complaint.getAssignedTo().getId().equals(sender.getId());

        if (!isComplainant && !isCommittee) {
            throw new SecurityException(
                "User " + sender.getId() + " is not authorised to message on complaint " + complaint.getId()
            );
        }
    }
}