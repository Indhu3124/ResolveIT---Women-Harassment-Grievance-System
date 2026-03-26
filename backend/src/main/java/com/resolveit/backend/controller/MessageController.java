package com.resolveit.backend.controller;

import com.resolveit.backend.dto.MessageDTO;
import com.resolveit.backend.entity.Message;
import com.resolveit.backend.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")   // tighten this to your frontend origin in production
public class MessageController {

    private final MessageService messageService;

    // ──────────────────────────────────────────────────────────────────
    //  GET  /api/messages?complaintId=&requestingUserId=
    //  Fetch all messages for a complaint thread.
    //  Auto-marks messages as read for the requesting user.
    // ──────────────────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<MessageDTO.Response>> getMessages(
            @RequestParam Long complaintId,
            @RequestParam Long requestingUserId) {

        return ResponseEntity.ok(messageService.getMessages(complaintId, requestingUserId));
    }

    // ──────────────────────────────────────────────────────────────────
    //  POST  /api/messages/text
    //  Send a plain text message.
    //  Body: { complaintId, senderId, senderRole, text }
    // ──────────────────────────────────────────────────────────────────
    @PostMapping("/text")
    public ResponseEntity<MessageDTO.Response> sendText(
            @RequestBody MessageDTO.SendRequest req) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(messageService.sendTextMessage(req));
    }

    // ──────────────────────────────────────────────────────────────────
    //  POST  /api/messages/file
    //  Send a file attachment (multipart/form-data).
    //  Fields: complaintId, senderId, senderRole, text (optional caption)
    // ──────────────────────────────────────────────────────────────────
    @PostMapping(value = "/file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> sendFile(
            @RequestParam Long complaintId,
            @RequestParam Long senderId,
            @RequestParam String senderRole,
            @RequestParam(required = false) String text,
            @RequestParam("file") MultipartFile file) {

        try {
            MessageDTO.Response response =
                    messageService.sendFileMessage(complaintId, senderId, senderRole, text, file);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            // Invalid file type / size
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));

        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "File upload failed: " + e.getMessage()));
        }
    }

    // ──────────────────────────────────────────────────────────────────
    //  GET  /api/messages/{id}/attachment
    //  Download the file attached to a specific message.
    // ──────────────────────────────────────────────────────────────────
    @GetMapping("/{id}/attachment")
    public ResponseEntity<byte[]> downloadAttachment(@PathVariable Long id) {
        try {
            Message msg   = messageService.getMessage(id);
            byte[] bytes  = messageService.downloadAttachment(id);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    msg.getFileType() != null ? msg.getFileType() : "application/octet-stream"
            ));
            // inline → browser preview for images/PDFs; attachment → force download for others
            String disposition = isPreviewable(msg.getFileType()) ? "inline" : "attachment";
            headers.setContentDisposition(
                    ContentDisposition.parse(disposition + "; filename=\"" + msg.getFileName() + "\"")
            );
            return ResponseEntity.ok().headers(headers).body(bytes);

        } catch (IOException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ──────────────────────────────────────────────────────────────────
    //  PUT  /api/messages/read
    //  Mark all messages in a thread as read.
    //  Body: { complaintId, readerRole }
    // ──────────────────────────────────────────────────────────────────
    @PutMapping("/read")
    public ResponseEntity<Map<String, Object>> markRead(
            @RequestBody MessageDTO.MarkReadRequest req) {

        int updated = messageService.markRead(req.getComplaintId(), req.getReaderRole());
        return ResponseEntity.ok(Map.of(
                "complaintId", req.getComplaintId(),
                "markedRead",  updated
        ));
    }

    // ──────────────────────────────────────────────────────────────────
    //  GET  /api/messages/unread?complaintId=&readerRole=
    //  Unread count for a specific complaint thread.
    // ──────────────────────────────────────────────────────────────────
    @GetMapping("/unread")
    public ResponseEntity<MessageDTO.UnreadCountResponse> getUnreadCount(
            @RequestParam Long complaintId,
            @RequestParam String readerRole) {

        long count = messageService.getUnreadCount(complaintId, readerRole);
        return ResponseEntity.ok(MessageDTO.UnreadCountResponse.builder().count(count).build());
    }

    // ──────────────────────────────────────────────────────────────────
    //  GET  /api/messages/unread/total?userId=&role=
    //  Total unread across all complaints — used for sidebar badge.
    // ──────────────────────────────────────────────────────────────────
    @GetMapping("/unread/total")
    public ResponseEntity<MessageDTO.UnreadCountResponse> getTotalUnread(
            @RequestParam Long userId,
            @RequestParam String role) {

        long count = messageService.getTotalUnread(userId, role);
        return ResponseEntity.ok(MessageDTO.UnreadCountResponse.builder().count(count).build());
    }

    // ── Helper ────────────────────────────────────────────────────────
    private boolean isPreviewable(String mimeType) {
        if (mimeType == null) return false;
        return mimeType.startsWith("image/") || "application/pdf".equals(mimeType);
    }
}