package com.resolveit.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    // ── Configure upload directory in application.properties:
    //    app.upload.dir=uploads/messages
    @Value("${app.upload.dir:uploads/messages}")
    private String uploadDir;

    // ── Allowed MIME types ────────────────────────────────────────────
    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain"
    );

    private static final long MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    // ── Store file, return the saved path ─────────────────────────────
    public String store(MultipartFile file) throws IOException {
        validate(file);

        // Create directory if it doesn't exist
        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);

        // Generate unique filename to avoid collisions
        String ext = getExtension(file.getOriginalFilename());
        String uniqueName = UUID.randomUUID() + (ext.isEmpty() ? "" : "." + ext);

        Path target = dir.resolve(uniqueName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        return uniqueName;   // stored path (relative), saved in DB
    }

    // ── Load file as byte array for download ──────────────────────────
    public byte[] load(String storedName) throws IOException {
        Path file = Paths.get(uploadDir).resolve(storedName);
        if (!Files.exists(file)) {
            throw new NoSuchFileException("File not found: " + storedName);
        }
        return Files.readAllBytes(file);
    }

    // ── Delete file ───────────────────────────────────────────────────
    public void delete(String storedName) {
        try {
            Path file = Paths.get(uploadDir).resolve(storedName);
            Files.deleteIfExists(file);
        } catch (IOException ignored) { }
    }

    // ── Helpers ───────────────────────────────────────────────────────
    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("File exceeds 10 MB limit");
        }
        String mime = file.getContentType();
        if (mime == null || !ALLOWED_TYPES.contains(mime)) {
            throw new IllegalArgumentException(
                "File type not allowed: " + mime +
                ". Allowed: images, PDF, Word, plain text"
            );
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
