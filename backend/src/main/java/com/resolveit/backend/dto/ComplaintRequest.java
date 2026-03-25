package com.resolveit.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ComplaintRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Complaint type is required")
    private String type;

    private String priority;

    @NotNull(message = "Complainant ID is required")
    private Long complainantId;

    private boolean anonymous;

    // ─── Optional Incident Details ────────────────────────────────
    // All optional — null if not provided by complainant

    private String incidentLocation;  // e.g. "Office Floor 3"
    private String incidentDate;      // e.g. "2026-03-15"
    private String incidentTime;      // e.g. "14:30"
    private String evidenceFileName;
}