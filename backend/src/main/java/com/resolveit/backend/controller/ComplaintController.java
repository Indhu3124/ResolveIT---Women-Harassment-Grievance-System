package com.resolveit.backend.controller;

import com.resolveit.backend.dto.ComplaintRequest;
import com.resolveit.backend.entity.Complaint;
import com.resolveit.backend.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin(origins = "*")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    // Read upload directory from application.properties
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    // ─── POST /api/complaints ──────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> submitComplaint(@Valid @RequestBody ComplaintRequest request) {
        try {
            Complaint complaint = complaintService.createComplaint(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(complaint);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ─── POST /api/complaints/upload ──────────────────────────────
    /**
     * Upload an evidence file.
     * Called BEFORE submitting the complaint form.
     * Saves the file to the uploads/ folder.
     * Returns the saved filename to include in the complaint JSON.
     *
     * Frontend usage:
     *   const formData = new FormData();
     *   formData.append("file", fileInput.files[0]);
     *   fetch("/api/complaints/upload", { method: "POST", body: formData })
     *     .then(r => r.json())
     *     .then(d => evidenceFileName = d.fileName)
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "No file selected"));
            }

            // Create uploads directory if it doesn't exist
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename to avoid conflicts
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String uniqueFilename = UUID.randomUUID().toString() + extension;

            // Save file to uploads folder
            Path filePath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            return ResponseEntity.ok(Map.of(
                "fileName", uniqueFilename,
                "originalName", originalFilename != null ? originalFilename : uniqueFilename,
                "message", "File uploaded successfully"
            ));

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to upload file: " + e.getMessage()));
        }
    }

    // ─── GET /api/complaints/files/{filename} ─────────────────────
    /**
     * Serve/download an uploaded evidence file.
     * Used by admin and committee dashboards to view/download evidence.
     *
     * Frontend usage:
     *   window.open("http://localhost:8080/api/complaints/files/" + complaint.evidenceFileName)
     */
    @GetMapping("/files/{filename:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            // Detect content type
            String contentType = "application/octet-stream";
            try {
                contentType = Files.probeContentType(filePath);
                if (contentType == null) contentType = "application/octet-stream";
            } catch (IOException ignored) {}

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);

        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ─── GET /api/complaints ───────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<Complaint>> getAllComplaints() {
        return ResponseEntity.ok(complaintService.getAllComplaints());
    }

    // ─── GET /api/complaints/{id} ──────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getComplaintById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(complaintService.getComplaintById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        }
    }

    // ─── GET /api/complaints/my/{userId} ──────────────────────────
    @GetMapping("/my/{userId}")
    public ResponseEntity<List<Complaint>> getMyComplaints(@PathVariable Long userId) {
        return ResponseEntity.ok(complaintService.getComplaintsByComplainant(userId));
    }
}