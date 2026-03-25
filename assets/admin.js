/* ============================================================
   resolveIT — admin.js (COMPLETE + FIXED)
   All IDs match dashboard.html and case-details.html exactly.
   Feedback summary loads from backend.
   Escalation reassignment supported.
============================================================ */
document.addEventListener("DOMContentLoaded", function () {

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const role = (currentUser && currentUser.role ? currentUser.role : "").toUpperCase();
    if (!currentUser || role !== "ADMIN") {
        window.location.href = "../login.html";
        return;
    }

    // ─── HELPERS ─────────────────────────────────────────────────
    function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ""; }
    function formatStatus(s) { return s ? s.split('_').map(w => capitalize(w)).join(' ') : ""; }
    function formatStatusClass(s) { return s ? s.split('_').map(w => capitalize(w)).join('') : ""; }

    function animateCounter(el, target, duration = 900) {
        if (!el) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start = Math.min(start + step, target);
            el.textContent = Math.floor(start);
            if (start >= target) clearInterval(timer);
        }, 16);
    }
    window.animateCounter = animateCounter;

    function showAlert(message, type = "info") {
        const alertDiv = document.createElement("div");
        alertDiv.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg`;
        alertDiv.style.cssText = "z-index:99999;min-width:320px;border-radius:14px;font-family:'Poppins',sans-serif;font-size:14px;font-weight:500;animation:fadeInUp 0.3s ease;padding:14px 20px;";
        alertDiv.innerHTML = message;
        document.body.appendChild(alertDiv);
        setTimeout(() => { alertDiv.style.transition = "opacity 0.3s ease"; alertDiv.style.opacity = "0"; setTimeout(() => alertDiv.remove(), 350); }, 2500);
    }
    window.showAlert = showAlert;

    // ─── ADMIN DASHBOARD ─────────────────────────────────────────
    const dbTable = document.getElementById("adminTable");
    if (dbTable) {
        loadDashboard();

        function loadDashboard() {
            // Stats
            fetch("http://localhost:8080/api/admin/dashboard")
                .then(r => r.json())
                .then(s => {
                    animateCounter(document.getElementById("totalCases"), s.total || 0);
                    animateCounter(document.getElementById("reviewCases"), s.underReview || 0);
                    animateCounter(document.getElementById("resolvedCases"), s.resolved || 0);
                    animateCounter(document.getElementById("escalatedCases"), s.escalated || 0);
                    animateCounter(document.getElementById("totalUsers"), s.totalComplainants || 0);
                })
                .catch(e => console.warn("Dashboard stats:", e));

            // Cases table
            fetch("http://localhost:8080/api/complaints")
                .then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); })
                .then(data => {
                    if (!Array.isArray(data)) data = [];
                    renderTable(data);
                    setupSearch(data);
                    renderCharts(data);
                    renderAlerts(data);
                })
                .catch(e => console.error("Complaints:", e));

            // Feedback summary — loads from backend
            fetch("http://localhost:8080/api/feedback")
                .then(r => r.ok ? r.json() : [])
                .then(feedbacks => {
                    const fs = document.getElementById("feedbackSummary");
                    if (!fs) return;
                    if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
                        fs.innerHTML = `<p class="text-muted" style="font-size:14px"><i class="bi bi-info-circle me-1"></i>No feedback submitted yet.</p>`;
                        return;
                    }
                    const avg = (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1);
                    const stars = "⭐".repeat(Math.round(avg));
                    fs.innerHTML = `
                    <div class="d-flex align-items-center gap-4 flex-wrap mb-3">
                        <div class="text-center">
                            <h2 style="color:#f59e0b;font-weight:800">${avg} ⭐</h2>
                            <p class="text-muted mb-0" style="font-size:13px">Average Rating</p>
                        </div>
                        <div class="text-center">
                            <h2 style="font-weight:800">${feedbacks.length}</h2>
                            <p class="text-muted mb-0" style="font-size:13px">Total Feedbacks</p>
                        </div>
                        <div class="text-center">
                            <h2 style="font-weight:800">${feedbacks.filter(f => f.rating >= 4).length}</h2>
                            <p class="text-muted mb-0" style="font-size:13px">Positive (4-5 ⭐)</p>
                        </div>
                    </div>
                    <div>
                        ${feedbacks.slice(-3).reverse().map(f => `
                        <div class="alert-card alert-info mb-2 d-flex align-items-start gap-3">
                            <div style="color:#f59e0b;font-size:16px">${"⭐".repeat(f.rating)}</div>
                            <div style="font-size:13px">${f.comment || "<em class='text-muted'>No comment provided</em>"}</div>
                        </div>`).join("")}
                    </div>`;
                })
                .catch(e => console.warn("Feedback summary:", e));
        }

        function renderTable(data) {
            dbTable.innerHTML = "";
            if (data.length === 0) {
                dbTable.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No cases found.</td></tr>`;
                return;
            }
            data.forEach(c => {
                const badge = `<span class="status-badge status-${formatStatusClass(c.status)}">${formatStatus(c.status)}</span>`;
                const assignSpan = c.assignedTo
                    ? `<span class="text-success"><i class="bi bi-person-check me-1"></i>${c.assignedTo.name}</span>`
                    : `<span class="text-warning"><i class="bi bi-person-x me-1"></i>Unassigned</span>`;
                const complainantName = c.complainant ? c.complainant.name : (c.anonymous ? "Anonymous" : "Unknown");
                const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "N/A";
                dbTable.innerHTML += `
                <tr>
                    <td><code style="font-size:12px;color:#6d28d9">${c.id}</code></td>
                    <td><strong>${c.title}</strong></td>
                    <td>${badge}</td>
                    <td><span class="priority-text priority-${c.priority}">${c.priority}</span></td>
                    <td>${date}</td>
                    <td>${assignSpan}</td>
                    <td class="text-center">
                        <a href="case-details.html?id=${c.id}" class="btn btn-sm btn-outline-primary">Manage</a>
                    </td>
                </tr>`;
            });
        }

        function setupSearch(data) {
            const si = document.getElementById("searchInput");
            if (si) {
                si.addEventListener("input", function () {
                    const q = this.value.toLowerCase();
                    renderTable(data.filter(c =>
                        String(c.id).toLowerCase().includes(q) ||
                        c.title.toLowerCase().includes(q) ||
                        (c.complainant && c.complainant.name.toLowerCase().includes(q))
                    ));
                });
            }
        }

        function renderCharts(data) {
            const statusCtx = document.getElementById("statusChart");
            if (statusCtx) {
                new Chart(statusCtx, {
                    type: "doughnut",
                    data: {
                        labels: ["Submitted", "Under Review", "In Investigation", "Resolved", "Escalated"],
                        datasets: [{
                            data: [
                                data.filter(c => c.status === "SUBMITTED").length,
                                data.filter(c => c.status === "UNDER_REVIEW").length,
                                data.filter(c => c.status === "IN_INVESTIGATION").length,
                                data.filter(c => c.status === "RESOLVED").length,
                                data.filter(c => c.status === "ESCALATED").length
                            ],
                            backgroundColor: ["#fde68a", "#bfdbfe", "#ddd6fe", "#bbf7d0", "#fecaca"]
                        }]
                    },
                    options: { plugins: { legend: { position: "bottom" } } }
                });
            }
            const priorityCtx = document.getElementById("priorityChart");
            if (priorityCtx) {
                new Chart(priorityCtx, {
                    type: "bar",
                    data: {
                        labels: ["High", "Medium", "Low"],
                        datasets: [{
                            label: "Cases by Priority",
                            data: [
                                data.filter(c => c.priority === "HIGH").length,
                                data.filter(c => c.priority === "MEDIUM").length,
                                data.filter(c => c.priority === "LOW").length
                            ],
                            backgroundColor: ["#fca5a5", "#fcd34d", "#6ee7b7"]
                        }]
                    },
                    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                });
            }
        }

        function renderAlerts(data) {
            const alertsDiv = document.getElementById("adminAlerts");
            if (!alertsDiv) return;
            const escalated = data.filter(c => c.status === "ESCALATED");
            const unassigned = data.filter(c => !c.assignedTo && c.status === "SUBMITTED");
            let html = "";
            if (escalated.length > 0) html += `<div class="alert-card alert-escalated mb-2"><i class="bi bi-exclamation-circle me-2"></i>${escalated.length} case(s) escalated — need reassignment to another committee member.</div>`;
            if (unassigned.length > 0) html += `<div class="alert-card alert-warning mb-2"><i class="bi bi-person-x me-2"></i>${unassigned.length} case(s) submitted but not yet assigned.</div>`;
            if (html === "") html = `<div class="alert-card alert-info"><i class="bi bi-check-circle me-2"></i>All systems normal. No urgent alerts.</div>`;
            alertsDiv.innerHTML = html;
        }
    }

    // ─── COMMITTEE LIST ───────────────────────────────────────────
    const committeeListDiv = document.getElementById("committeeList");
    if (committeeListDiv) {
        loadCommittee();

        function loadCommittee() {
            fetch("http://localhost:8080/api/admin/committee-members")
                .then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); })
                .then(data => {
                    committeeListDiv.innerHTML = "";
                    if (!Array.isArray(data) || data.length === 0) {
                        committeeListDiv.innerHTML = `<div class="col-12 text-center text-muted py-3">No committee members found.</div>`;
                        return;
                    }
                    data.forEach(m => {
                        const initial = m.name ? m.name.charAt(0).toUpperCase() : "?";
                        committeeListDiv.innerHTML += `
                        <div class="col-md-4 mb-3">
                            <div class="member-card">
                                <div class="member-avatar">${initial}</div>
                                <strong>${m.name}</strong>
                                <div style="font-size:13px;color:#666">${m.email}</div>
                                <div style="font-size:12px;color:#999">${m.department || 'N/A'}</div>
                            </div>
                        </div>`;
                    });
                })
                .catch(e => console.warn("Committee members:", e));
        }

        const addForm = document.getElementById("committeeForm");
        if (addForm) {
            addForm.addEventListener("submit", function (e) {
                e.preventDefault();
                const btn = this.querySelector('button[type="submit"]');
                const oText = btn.innerHTML;
                btn.innerHTML = "Adding..."; btn.disabled = true;

                fetch("http://localhost:8080/api/admin/committee-members", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: document.getElementById("memberName").value.trim(),
                        email: document.getElementById("memberEmail").value.trim(),
                        department: document.getElementById("memberDept").value.trim(),
                        specialization: document.getElementById("memberRole").value.trim()
                    })
                }).then(res => {
                    btn.innerHTML = oText; btn.disabled = false;
                    if (res.ok) {
                        showAlert("Committee Member added successfully! ✅", "success");
                        document.getElementById("addMemberModal").querySelector(".btn-close").click();
                        addForm.reset();
                        loadCommittee();
                    } else {
                        res.json().then(d => showAlert(d.message || "Error adding member", "danger"));
                    }
                }).catch(() => { btn.innerHTML = oText; btn.disabled = false; showAlert("Server error", "danger"); });
            });
        }
    }

    // ─── AUDIT LOGS ──────────────────────────────────────────────
    const auditTable = document.getElementById("auditTableBody");
    if (auditTable) {
        fetch("http://localhost:8080/api/audit-logs")
            .then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); })
            .then(logs => {
                auditTable.innerHTML = "";
                if (!Array.isArray(logs) || logs.length === 0) {
                    auditTable.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No audit logs yet.</td></tr>`;
                    return;
                }
                logs.slice().reverse().forEach(l => {
                    auditTable.innerHTML += `
                    <tr>
                        <td><span class="badge bg-secondary">${l.action}</span></td>
                        <td><span style="font-size:12px;color:#666">${l.detail}</span></td>
                        <td>${l.actor}</td>
                        <td><span class="badge bg-light text-dark">${capitalize(l.actorRole)}</span></td>
                        <td style="font-size:12px">${new Date(l.timestamp).toLocaleString()}</td>
                    </tr>`;
                });
            })
            .catch(e => console.warn("Audit logs:", e));
    }

    // ─── CASE DETAILS PAGE ───────────────────────────────────────
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get("id");

    if (caseId && document.getElementById("caseTitle")) {

        fetch(`http://localhost:8080/api/complaints/${caseId}`)
            .then(r => r.json())
            .then(c => {
                document.getElementById("caseTitle").innerText = c.title;
                document.getElementById("caseId").innerText = c.id;
                document.getElementById("caseDate").innerText = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "N/A";
                document.getElementById("casePriority").innerText = c.priority;
                document.getElementById("caseDescription").innerText = c.description;
                document.getElementById("caseType").innerText = c.type || "N/A";
                document.getElementById("complainantName").innerText = c.complainant ? c.complainant.name : (c.anonymous ? "Anonymous" : "Unknown");

                const statusEl = document.getElementById("caseStatus");
                if (statusEl) {
                    statusEl.innerText = formatStatus(c.status);
                    statusEl.className = `case-status-badge ${formatStatusClass(c.status)}`;
                }

                const assignedEl = document.getElementById("assignedMemberName");
                if (assignedEl) assignedEl.innerText = c.assignedTo ? c.assignedTo.name : "Not assigned yet";

                // Status dropdown
                const statusControl = document.getElementById("statusControl");
                if (statusControl && c.status) {
                    const statusMap = { "UNDER_REVIEW": "Under Review", "IN_INVESTIGATION": "In Investigation", "RESOLVED": "Resolved", "ESCALATED": "Escalated" };
                    statusControl.value = statusMap[c.status] || "Under Review";
                }

                // Evidence file — uses evidenceSection + evidenceFileDisplay IDs
                const evidenceSection = document.getElementById("evidenceSection");
                const evidenceFileDisplay = document.getElementById("evidenceFileDisplay");
                if (evidenceSection && evidenceFileDisplay) {
                    if (c.evidenceFileName) {
                        evidenceSection.style.display = "block";
                        const fileUrl = `http://localhost:8080/api/complaints/files/${c.evidenceFileName}`;
                        evidenceFileDisplay.innerHTML = `
                        <div class="d-flex align-items-center gap-3 p-3"
                             style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px">
                            <i class="bi bi-file-earmark-fill fs-4 text-success"></i>
                            <div>
                                <div style="font-size:13px;font-weight:600">${c.evidenceFileName}</div>
                                <small class="text-muted">Uploaded by complainant</small>
                            </div>
                            <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-success ms-auto">
                                <i class="bi bi-eye me-1"></i> View
                            </a>
                            <a href="${fileUrl}" download class="btn btn-sm btn-success">
                                <i class="bi bi-download me-1"></i> Download
                            </a>
                        </div>`;
                    } else {
                        evidenceSection.style.display = "none";
                    }
                }

                // Incident details — uses incidentSection + incidentDetailsDisplay IDs
                const incidentSection = document.getElementById("incidentSection");
                const incidentDetailsDisplay = document.getElementById("incidentDetailsDisplay");
                if (incidentSection && incidentDetailsDisplay) {
                    if (c.incidentLocation || c.incidentDate || c.incidentTime) {
                        incidentSection.style.display = "block";
                        incidentDetailsDisplay.innerHTML = `
                            ${c.incidentLocation ? `<p class="mb-1"><i class="bi bi-geo-alt me-1"></i><strong>Location:</strong> ${c.incidentLocation}</p>` : ''}
                            ${c.incidentDate ? `<p class="mb-1"><i class="bi bi-calendar me-1"></i><strong>Date:</strong> ${c.incidentDate}</p>` : ''}
                            ${c.incidentTime ? `<p class="mb-1"><i class="bi bi-clock me-1"></i><strong>Time:</strong> ${c.incidentTime}</p>` : ''}`;
                    } else {
                        incidentSection.style.display = "none";
                    }
                }

                activateTimeline(c.status);

                // Feedback
                if (c.status === "RESOLVED") {
                    fetch(`http://localhost:8080/api/feedback/${caseId}`)
                        .then(r => r.ok ? r.json() : null)
                        .then(f => {
                            const fc = document.getElementById("feedbackContainer");
                            if (!fc) return;
                            if (f) {
                                fc.innerHTML = `
                                <div class="feedback-card">
                                    <div class="feedback-display-stars">${"⭐".repeat(f.rating)}</div>
                                    <p style="font-size:13px;margin-top:8px">${f.comment || "No comment provided."}</p>
                                </div>`;
                            } else {
                                fc.innerHTML = `<p class="text-muted">No feedback submitted yet.</p>`;
                            }
                        });
                } else {
                    const fc = document.getElementById("feedbackContainer");
                    if (fc) fc.innerHTML = `<p class="text-muted">Feedback available once case is resolved.</p>`;
                }

                window._currentCase = c;
            })
            .catch(e => console.error("Case load error:", e));

        // Load committee members into assign dropdown
        fetch("http://localhost:8080/api/admin/committee-members")
            .then(r => r.json())
            .then(members => {
                const select = document.getElementById("assignMember");
                if (!select) return;
                select.innerHTML = `<option value="">-- Select Member --</option>`;
                members.forEach(m => {
                    select.innerHTML += `<option value="${m.id}">${m.name} (${m.department || 'Member'})</option>`;
                });
            })
            .catch(e => console.warn("Committee dropdown:", e));

        // Assign case — also handles ESCALATED reassignment
        window.assignCase = function () {
            const select = document.getElementById("assignMember");
            const memberId = select ? select.value : "";
            if (!memberId) { showAlert("Please select a committee member", "warning"); return; }

            const btn = document.querySelector('button[onclick="assignCase()"]');
            const oText = btn.innerHTML;
            btn.innerHTML = "Assigning..."; btn.disabled = true;

            fetch(`http://localhost:8080/api/complaints/${caseId}/assign`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ committeeUserId: parseInt(memberId), performedById: currentUser.id })
            }).then(res => {
                if (res.ok) {
                    showAlert("Case assigned successfully! ✅", "success");
                    setTimeout(() => location.reload(), 1300);
                } else {
                    btn.innerHTML = oText; btn.disabled = false;
                    res.json().then(d => showAlert(d.message || "Error assigning case", "danger"));
                }
            }).catch(() => { btn.innerHTML = oText; btn.disabled = false; showAlert("Server error", "danger"); });
        };

        // Update status — handles escalation
        window.updateCaseStatus = function () {
            const select = document.getElementById("statusControl");
            const newStatusDisplay = select ? select.value : "";
            if (!newStatusDisplay) return;

            const statusMap = {
                "Under Review": "UNDER_REVIEW",
                "In Investigation": "IN_INVESTIGATION",
                "Resolved": "RESOLVED",
                "Escalated": "ESCALATED"
            };
            const newStatus = statusMap[newStatusDisplay];

            const btn = document.querySelector('button[onclick="updateCaseStatus()"]');
            const oText = btn.innerHTML;
            btn.innerHTML = "Updating..."; btn.disabled = true;

            fetch(`http://localhost:8080/api/complaints/${caseId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, performedById: currentUser.id })
            }).then(res => {
                if (res.ok) {
                    // If escalated, show reassignment prompt
                    if (newStatus === "ESCALATED") {
                        showAlert("Case escalated! ⚠️ Please reassign to a different committee member.", "warning");
                        // Highlight the assign section
                        const assignSection = document.querySelector('.col-lg-6');
                        if (assignSection) assignSection.style.border = "2px solid #ef4444";
                    } else {
                        showAlert(`Status updated to ${newStatusDisplay} ✅`, "success");
                    }
                    setTimeout(() => location.reload(), 1500);
                } else {
                    btn.innerHTML = oText; btn.disabled = false;
                    res.json().then(d => showAlert(d.message || "Error updating status", "danger"));
                }
            }).catch(() => { btn.innerHTML = oText; btn.disabled = false; showAlert("Server error", "danger"); });
        };

        window.exportCaseCSV = function () {
            const c = window._currentCase;
            if (!c) return;
            let csv = "ID,Title,Priority,Status,Date Filed,Type,Location,Incident Date,Incident Time\n";
            csv += `"${c.id}","${c.title}","${c.priority}","${c.status}","${new Date(c.createdAt).toLocaleDateString()}","${c.type || 'N/A'}","${c.incidentLocation || 'N/A'}","${c.incidentDate || 'N/A'}","${c.incidentTime || 'N/A'}"\n`;
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `Case_${c.id}_Export.csv`;
            a.click();
        };

        window.exportCasePDF = function () {
            showAlert("PDF export initialized. Downloading…", "info");
            setTimeout(window.exportCaseCSV, 1000);
        };
    }

});

// ─── TIMELINE ─────────────────────────────────────────────────
function activateTimeline(status) {
    const steps = ["SUBMITTED", "UNDER_REVIEW", "IN_INVESTIGATION", "RESOLVED"];
    const idMap = {
        "SUBMITTED": "tl-Submitted",
        "UNDER_REVIEW": "tl-UnderReview",
        "IN_INVESTIGATION": "tl-InInvestigation",
        "RESOLVED": "tl-Resolved",
        "ESCALATED": "tl-Escalated"
    };
    const idx = steps.indexOf(status);
    steps.forEach((s, i) => {
        const el = document.getElementById(idMap[s]);
        if (el) el.classList.toggle("active", i <= idx);
    });
    const escalatedEl = document.getElementById("tl-Escalated");
    if (escalatedEl) {
        if (status === "ESCALATED") {
            escalatedEl.style.display = "";
            escalatedEl.classList.add("active");
        } else {
            escalatedEl.style.display = "none";
            escalatedEl.classList.remove("active");
        }
    }
}