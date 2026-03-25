package com.resolveit.backend.service;

import com.resolveit.backend.entity.Notification;
import com.resolveit.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    /**
     * Create and save a new notification.
     */
    public Notification createNotification(String message, Long userId) {
        Notification notification = Notification.builder()
                .message(message)
                .userId(userId)
                .read(false)
                .build();
        return notificationRepository.save(notification);
    }

    /**
     * Get all notifications for a given user.
     */
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get unread notifications for a user.
     */
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndReadOrderByCreatedAtDesc(userId, false);
    }

    /**
     * Mark a specific notification as read.
     */
    public Notification markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found with ID: " + id));
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    /**
     * Mark all notifications as read for a specific user.
     */
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndReadOrderByCreatedAtDesc(userId, false);
        for (Notification notif : unread) {
            notif.setRead(true);
        }
        notificationRepository.saveAll(unread);
    }
}
