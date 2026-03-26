package com.resolveit.backend.dto;

import com.resolveit.backend.entity.Message;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

public class MessageDTO {

    // ─── Request DTO for sending a text message ───────────────────────
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendRequest {
        private Long senderId;
        private Long complaintId;
        private String senderRole;
        private String text;
        private String filePath; // optional, for file messages
    }

    // ─── Request DTO for marking messages as read ─────────────────────
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarkReadRequest {
        private Long complaintId;
        private String readerRole;
    }

    // ─── Response DTO for unread count ───────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnreadCountResponse {
        private long count;
    }

    // ─── Response DTO for a single message ────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long complaintId;
        private Long senderId;
        private String senderName;
        private String senderRole;
        private String text;
        private String messageType;
        private String fileName;
        private String filePath;
        private String fileType;
        private Long fileSize;
        private boolean readByComplainant;
        private boolean readByCommittee;
        private LocalDateTime createdAt;

        // Factory method to convert entity to response DTO
        public static Response from(Message message) {
            ResponseBuilder builder = Response.builder()
                    .id(message.getId())
                    .complaintId(message.getComplaint() != null ? message.getComplaint().getId() : null)
                    .senderRole(message.getSenderRole() != null ? message.getSenderRole().name() : null)
                    .text(message.getText())
                    .messageType(message.getMessageType() != null ? message.getMessageType().name() : null)
                    .fileName(message.getFileName())
                    .filePath(message.getFilePath())
                    .fileType(message.getFileType())
                    .fileSize(message.getFileSize())
                    .readByComplainant(message.isReadByComplainant())
                    .readByCommittee(message.isReadByCommittee())
                    .createdAt(message.getCreatedAt());

            // Set sender info if sender exists
            if (message.getSender() != null) {
                builder.senderId(message.getSender().getId())
                       .senderName(message.getSender().getName());
            } else {
                builder.senderId(null)
                       .senderName("System");
            }

            return builder.build();
        }
    }
}