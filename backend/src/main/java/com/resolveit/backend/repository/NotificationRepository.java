package com.resolveit.backend.repository;

import com.resolveit.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Find all notifications for a specific user, ordered by newest first.
     */
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Find all unread notifications for a specific user.
     */
    List<Notification> findByUserIdAndReadOrderByCreatedAtDesc(Long userId, boolean read);
}
