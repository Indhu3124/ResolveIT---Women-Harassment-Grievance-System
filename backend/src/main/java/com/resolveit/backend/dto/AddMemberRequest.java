package com.resolveit.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * AddMemberRequest DTO
 *
 * Used by admin to add a new committee member.
 * Used with: POST /api/admin/committee-members
 *
 * Matches the modal form in admin/dashboard.html:
 *   - memberName
 *   - memberEmail
 *   - memberDept (department)
 *   - memberRole (specialization like "CID Officer", "Legal Advisor", etc.)
 *
 * Example JSON body:
 * {
 *   "name": "Dr. Priya Sharma",
 *   "email": "priya@authority.gov.in",
 *   "department": "Cyber Crime Cell",
 *   "specialization": "Cyber Crime Expert"
 * }
 */
@Data
public class AddMemberRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @Email(message = "Enter a valid email")
    @NotBlank(message = "Email is required")
    private String email;

    private String department;

    @NotBlank(message = "Specialization/designation is required")
    private String specialization;
}
