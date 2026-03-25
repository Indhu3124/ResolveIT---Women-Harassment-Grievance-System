package com.resolveit.backend.controller;

import com.resolveit.backend.entity.Notification;
import com.resolveit.backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * NotificationController — Notifications REST API
 *
 * Base path: /api/notifications
 */
@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    /**
     * Get all notifications for a specific user.
     */
    @GetMapping("/{userId}")
    public ResponseEntity<List<Notification>> getUserNotifications(@PathVariable Long userId) {
        List<Notification> notifications = notificationService.getUserNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Get only unread notifications for a user.
     */
    @GetMapping("/{userId}/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(@PathVariable Long userId) {
        List<Notification> unread = notificationService.getUnreadNotifications(userId);
        return ResponseEntity.ok(unread);
    }

    /**
     * Mark a specific notification as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        try {
            Notification updated = notificationService.markAsRead(id);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Mark all notifications as read for a specific user.
     */
    @PutMapping("/{userId}/read-all")
    public ResponseEntity<?> markAllAsRead(@PathVariable Long userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read."));
    }

    /**
     * Create a new notification.
     */
    @PostMapping
    public ResponseEntity<Notification> createNotification(@RequestBody Map<String, Object> payload) {
        String message = (String) payload.get("message");
        Object userIdObj = payload.get("userId");
        Long userId = null;
        if (userIdObj != null) {
            userId = Long.valueOf(userIdObj.toString());
        }
        Notification notif = notificationService.createNotification(message, userId);
        return ResponseEntity.ok(notif);
    }
}
