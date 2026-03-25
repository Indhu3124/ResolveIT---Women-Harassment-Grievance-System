package com.resolveit.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DashboardStats DTO
 *
 * Returned by GET /api/admin/dashboard.
 * Contains summary counts for all complaint statuses.
 * Used by the admin dashboard to populate the stat cards and charts.
 *
 * Example JSON response:
 * {
 *   "total": 25,
 *   "submitted": 5,
 *   "underReview": 8,
 *   "inInvestigation": 4,
 *   "resolved": 7,
 *   "escalated": 1,
 *   "totalComplainants": 20
 * }
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStats {

    private long total;
    private long submitted;
    private long underReview;
    private long inInvestigation;
    private long resolved;
    private long escalated;
    private long totalComplainants;
}
