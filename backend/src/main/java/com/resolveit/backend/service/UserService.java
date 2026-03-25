package com.resolveit.backend.service;

import com.resolveit.backend.entity.User;
import com.resolveit.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

    // ── Update password — called from settings page
  public void updatePassword(Long userId, String newPassword) {
    User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

    if (newPassword == null || newPassword.trim().isEmpty()) {
        throw new RuntimeException("Password cannot be empty");
    }

    user.setPassword(newPassword.trim()); // safe set

    userRepository.save(user);
}}