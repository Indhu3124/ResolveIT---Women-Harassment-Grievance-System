/* ============================================================
   resolveIT — complainant.js
   CHANGED: Submit complaint now uploads evidence file first
            via POST /api/complaints/upload (multipart),
            then includes the returned filename in complaint JSON.
            Everything else is unchanged.
============================================================ */
document.addEventListener("DOMContentLoaded", function () {

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) {
        window.location.href = "../login.html"; return;
    }
    if (currentUser.role.toUpperCase() !== "COMPLAINANT") {
        window.location.href = "../login.html"; return;
    }

    // Helpers
    function formatStatus(status) {
        if (!status) return "";
        return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    window.formatStatus = formatStatus;

    function formatStatusClass(status) {
        if (!status) return "";
        return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    }

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

    // ─── DASHBOARD ───────────────────────────────────────────────
    const complaintTable = document.getElementById("complaintTable");
    if (complaintTable) {
        const totalEl = document.getElementById("totalCases");
        const resolvedEl = document.getElementById("resolvedCases");

        loadDashboard();

        function loadDashboard() {
            fetch(`http://localhost:8080/api/complaints/my/${currentUser.id}`)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch complaints");
                    return res.json();
                })
                .then(data => {
                    if (!Array.isArray(data)) data = [];
                    if (totalEl) animateCounter(totalEl, data.length);
                    if (resolvedEl) animateCounter(resolvedEl, data.filter(c => c.status === "RESOLVED").length);
                    renderTable(data);
                    setupSearch(data);
                })
                .catch(err => console.error("Error fetching complaints:", err));
        }

        function renderTable(data) {
            complaintTable.innerHTML = "";
            if (data.length === 0) {
                complaintTable.innerHTML = `
                <tr><td colspan="6" class="text-center py-5">
                    <div style="font-size:40px">📝</div>
                    <div class="text-muted mt-2">No complaints filed yet.</div>
                    <a href="submit.html" class="custom-btn mt-3 d-inline-block">+ File a Complaint</a>
                </td></tr>`;
                return;
            }

            data.forEach(c => {
                let feedbackBtn = '';
                if (c.status === "RESOLVED") {
                    fetch(`http://localhost:8080/api/feedback/${c.id}`).then(res => {
                        if (res.ok) {
                            res.json().then(f => {
                                feedbackBtn = `<small class="text-warning">⭐ Rated ${f.rating}/5</small>`;
                                addRow();
                            });
                        } else {
                            feedbackBtn = `<button class="btn btn-sm btn-outline-warning ms-1" onclick="openFeedbackModal('${c.id}')">⭐ Feedback</button>`;
                            addRow();
                        }
                    }).catch(() => addRow());
                } else {
                    addRow();
                }

                function addRow() {
                    let assignedName = '<small class="text-muted">Unassigned</small>';
                    if (c.assignedTo) {
                        assignedName = `<small class="text-success">👤 ${c.assignedTo.name}</small>`;
                    }
                    const formattedStatus = formatStatus(c.status);
                    const statusClass = formatStatusClass(c.status);
                    let rowId = `row-${c.id}`;
                    let existingRow = document.getElementById(rowId);
                    const rowHtml = `
                    <tr id="${rowId}">
                        <td><code style="font-size:12px;color:#6d28d9">${c.id}</code></td>
                        <td><strong>${c.title}</strong></td>
                        <td><span class="status-badge status-${statusClass}">${formattedStatus}</span></td>
                        <td><span class="priority-text priority-${c.priority}">${c.priority}</span></td>
                        <td>${assignedName}</td>
                        <td>${new Date(c.createdAt).toLocaleDateString()} ${feedbackBtn}</td>
                    </tr>`;
                    if (existingRow) {
                        existingRow.outerHTML = rowHtml;
                    } else {
                        complaintTable.innerHTML += rowHtml;
                    }
                }
            });
        }

        function setupSearch(data) {
            const s = document.getElementById("searchInput");
            if (s) {
                s.addEventListener("input", function () {
                    const q = this.value.toLowerCase();
                    renderTable(data.filter(c =>
                        String(c.id).toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
                    ));
                });
            }
        }
    }

    // ─── SUBMIT COMPLAINT ─────────────────────────────────────────
    const form = document.getElementById("complaintForm");
    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();

            const title    = document.getElementById("title").value.trim();
            const desc     = document.getElementById("description").value.trim();
            const prio     = document.getElementById("priority").value;
            const type     = document.getElementById("type").value;
            const anon     = document.getElementById("anonymous").checked;

            const locationEl = document.getElementById("incidentLocation");
            const dateEl     = document.getElementById("incidentDate");
            const timeEl     = document.getElementById("incidentTime");

            const incidentLocation = locationEl && locationEl.value.trim() ? locationEl.value.trim() : null;
            const incidentDate     = dateEl && dateEl.value ? dateEl.value : null;
            const incidentTime     = timeEl && timeEl.value ? timeEl.value : null;

            if (!title || !desc || !type) {
                showAlert("Please fill in all required fields (Type, Title, Description)", "danger");
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;

            // ── STEP 1: Upload evidence file if selected ──────────
            let evidenceFileName = null;
            const fileInput = document.getElementById("evidenceFile");

            if (fileInput && fileInput.files.length > 0) {
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Uploading file...';

                const formData = new FormData();
                formData.append("file", fileInput.files[0]);

                try {
                    const uploadRes = await fetch("http://localhost:8080/api/complaints/upload", {
                        method: "POST",
                        body: formData  // No Content-Type header — browser sets it with boundary
                    });

                    if (uploadRes.ok) {
                        const uploadData = await uploadRes.json();
                        evidenceFileName = uploadData.fileName;
                        // Store original name for display purposes
                        window._uploadedOriginalName = uploadData.originalName;
                    } else {
                        showAlert("File upload failed, submitting without evidence.", "warning");
                    }
                } catch (err) {
                    console.error("File upload error:", err);
                    showAlert("File upload failed, submitting without evidence.", "warning");
                }
            }

            // ── STEP 2: Submit complaint JSON ─────────────────────
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';

            const newComplaint = {
                complainantId: currentUser.id,
                title,
                description: desc,
                priority: prio,
                type,
                anonymous: anon,
                incidentLocation,
                incidentDate,
                incidentTime,
                evidenceFileName  // null if no file, or UUID filename if uploaded
            };

            fetch("http://localhost:8080/api/complaints", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newComplaint)
            }).then(res => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                if (res.ok) {
                    showAlert("Complaint submitted successfully! ✅", "success");
                    setTimeout(() => window.location.href = "dashboard.html", 1400);
                } else {
                    res.json().then(data => showAlert(data.message || "Error submitting complaint", "danger"));
                }
            }).catch(err => {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                showAlert("Server error. Make sure Spring Boot is running.", "danger");
                console.error(err);
            });
        });
    }

}); // end DOMContentLoaded


/* ─── TRACK COMPLAINT ────────────────────────────────────────── */
window.trackComplaint = function () {
    const id = document.getElementById("trackId") ? document.getElementById("trackId").value.trim() : "";
    const result = document.getElementById("trackResult");
    if (!result) return;

    if (!id) {
        result.innerHTML = `<div class="alert-card alert-warning">⚠️ Please enter a Case ID.</div>`;
        return;
    }

    result.innerHTML = `<div class="text-center text-muted py-3">Loading...</div>`;

    fetch(`http://localhost:8080/api/complaints/${id}`)
        .then(res => {
            if (!res.ok) throw new Error("Case not found");
            return res.json();
        })
        .then(complaint => {
            const currentUser = JSON.parse(localStorage.getItem("currentUser"));
            if (complaint.complainant && complaint.complainant.id !== currentUser.id) {
                result.innerHTML = `<div class="alert-card alert-escalated">❌ You don't have permission to view this case.</div>`;
                return;
            }

            const formattedStatus = formatStatus(complaint.status);
            const statusClass = formattedStatus.replace(/\s/g, "");
            const assignedName = complaint.assignedTo
                ? complaint.assignedTo.name + ' (' + (complaint.assignedTo.department || 'Committee') + ')'
                : 'Not yet assigned';
            const statusOrder = ["SUBMITTED", "UNDER_REVIEW", "IN_INVESTIGATION", "RESOLVED"];
            const statusIdx = statusOrder.indexOf(complaint.status);

            const timeline = statusOrder.map((s, i) => `
                <div class="timeline-item ${i <= statusIdx ? 'active' : ''}">
                    ${formatStatus(s)}
                </div>`).join(" → ");

            fetch(`http://localhost:8080/api/audit-logs/${complaint.id}`)
                .then(r => r.json())
                .then(logs => renderResult(complaint, formattedStatus, statusClass, assignedName, timeline, logs))
                .catch(() => renderResult(complaint, formattedStatus, statusClass, assignedName, timeline, []));
        })
        .catch(() => {
            result.innerHTML = `<div class="alert-card alert-escalated">❌ Case not found. Please check the Case ID.</div>`;
        });
}

function renderResult(complaint, formattedStatus, statusClass, assignedName, timeline, logs) {
    const result = document.getElementById("trackResult");

    let historyHtml = "";
    if (logs && logs.length > 0) {
        const statusLogs = logs.filter(l =>
            l.action === "Status Updated" ||
            l.action === "Complaint Submitted" ||
            l.action === "Case Assigned"
        );
        historyHtml = `
            <div class="timeline-vertical mt-4">
                ${statusLogs.map(sh => `
                    <div class="tv-item">
                        <div class="tv-title">${sh.action}</div>
                        <div class="tv-time">${new Date(sh.timestamp).toLocaleString()}</div>
                        <div style="font-size:12px;color:#666">${sh.detail}</div>
                    </div>`).join("")}
            </div>`;
    }

    let feedbackSection = "";
    if (complaint.status === "RESOLVED") {
        feedbackSection = `<div id="fb-section-${complaint.id}" class="mt-3"><small class="text-muted">Loading feedback...</small></div>`;
        fetch(`http://localhost:8080/api/feedback/${complaint.id}`).then(res => {
            if (res.ok) {
                res.json().then(f => {
                    const el = document.getElementById(`fb-section-${complaint.id}`);
                    if (el) el.innerHTML = `
                        <div class="feedback-card mt-3">
                            <h6>Your Feedback</h6>
                            <div class="feedback-display-stars">${"⭐".repeat(f.rating)}</div>
                            <p style="font-size:13px">${f.comment || ""}</p>
                        </div>`;
                });
            } else {
                const el = document.getElementById(`fb-section-${complaint.id}`);
                if (el) el.innerHTML = `
                    <button class="custom-btn mt-3" onclick="openFeedbackModal('${complaint.id}')">⭐ Submit Feedback</button>`;
            }
        });
    }

    // Incident details
    let incidentHtml = "";
    if (complaint.incidentLocation || complaint.incidentDate || complaint.incidentTime) {
        incidentHtml = `
        <hr>
        <p class="fw-semibold mb-2" style="font-size:13px">📍 Incident Details</p>
        <div style="font-size:13px;color:#4b5563">
            ${complaint.incidentLocation ? `<p class="mb-1"><strong>Location:</strong> ${complaint.incidentLocation}</p>` : ''}
            ${complaint.incidentDate ? `<p class="mb-1"><strong>Date:</strong> ${complaint.incidentDate}</p>` : ''}
            ${complaint.incidentTime ? `<p class="mb-1"><strong>Time:</strong> ${complaint.incidentTime}</p>` : ''}
        </div>`;
    }

    const chats = JSON.parse(localStorage.getItem("chats")) || {};
    const messages = (chats[complaint.id] || []).slice(-3);
    const chatPreview = messages.length > 0
        ? `<div class="mt-2">${messages.map(m => `
            <div style="font-size:12px;padding:4px 8px;
                background:${m.senderRole && m.senderRole.toUpperCase() === 'COMPLAINANT' ? '#ede9fe' : '#f0fdf4'};
                border-radius:8px;margin-bottom:4px">
                <strong>${m.senderName}:</strong> ${m.text}
            </div>`).join("")}</div>`
        : `<small class="text-muted">No messages yet.</small>`;

    result.innerHTML = `
    <div class="row g-4">
        <div class="col-lg-7">
            <div class="case-card">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5>Case Details</h5>
                    <span class="status-badge status-${statusClass}">${formattedStatus}</span>
                </div>
                <p><strong>Case ID:</strong> ${complaint.id}</p>
                <p><strong>Title:</strong> ${complaint.title}</p>
                <p><strong>Type:</strong> ${complaint.type || "N/A"}</p>
                <p><strong>Priority:</strong>
                    <span class="priority-text priority-${complaint.priority}">${complaint.priority}</span>
                </p>
                <p><strong>Date Filed:</strong> ${new Date(complaint.createdAt).toLocaleDateString()}</p>
                <p><strong>Assigned to:</strong> ${assignedName}</p>
                ${incidentHtml}
                <hr>
                <p><strong>Description:</strong><br>${complaint.description}</p>
                ${feedbackSection}
            </div>
        </div>
        <div class="col-lg-5">
            <div class="case-card mb-4">
                <h5>Status Progress</h5>
                <div class="timeline mt-3">${timeline}</div>
                ${historyHtml}
            </div>
            <div class="case-card">
                <h5>💬 Messages</h5>
                <div style="font-size:13px">
                    ${complaint.assignedTo
                        ? chatPreview
                        : '<small class="text-muted">Chat available once assigned.</small>'}
                </div>
            </div>
        </div>
    </div>`;
}


/* ─── FILE UPLOAD HANDLERS ───────────────────────────────────── */
function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showAlert("File too large. Maximum size is 5MB.", "danger");
        input.value = "";
        return;
    }
    document.getElementById("fileName").textContent = file.name;
    document.getElementById("filePreview").style.display = "flex";
    document.getElementById("uploadArea").style.borderColor = "#00c6a7";
    document.getElementById("uploadArea").style.background = "#f0fdf4";
}

function handleFileDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const input = document.getElementById("evidenceFile");
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    handleFileSelect(input);
}

function removeFile() {
    document.getElementById("evidenceFile").value = "";
    document.getElementById("filePreview").style.display = "none";
    document.getElementById("uploadArea").style.borderColor = "#967fd8";
    document.getElementById("uploadArea").style.background = "#faf8ff";
}


/* ─── FEEDBACK MODAL ─────────────────────────────────────────── */
window.openFeedbackModal = function (caseId) {
    const existing = document.getElementById("feedbackModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "feedbackModal";
    modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99998;display:flex;align-items:center;justify-content:center`;
    modal.innerHTML = `
    <div style="background:white;border-radius:24px;padding:36px;max-width:460px;width:90%;text-align:center">
        <h4 style="font-weight:700;margin-bottom:8px">Rate Your Experience</h4>
        <p class="text-muted" style="font-size:14px">How satisfied are you with the resolution?</p>
        <div class="star-rating justify-content-center" id="starContainer">
            ${[1,2,3,4,5].map(i =>
                `<span onclick="setRating(${i})" onmouseover="hoverStar(${i})" onmouseout="resetStars()">☆</span>`
            ).join("")}
        </div>
        <textarea id="feedbackComment" rows="3" class="form-control mt-3 mb-3"
            placeholder="Tell us more (optional)…"></textarea>
        <div class="d-flex gap-3 justify-content-center">
            <button class="custom-btn" onclick="submitFeedback('${caseId}')">Submit Feedback</button>
            <button class="btn btn-outline-secondary"
                onclick="document.getElementById('feedbackModal').remove()">Cancel</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
    window._feedbackRating = 0;
}

window.hoverStar = function (val) {
    document.querySelectorAll("#starContainer span").forEach((s, i) => {
        s.textContent = i < val ? "★" : "☆";
        s.style.color = i < val ? "#f59e0b" : "#d1d5db";
    });
}

window.resetStars = function () {
    const r = window._feedbackRating || 0;
    document.querySelectorAll("#starContainer span").forEach((s, i) => {
        s.textContent = i < r ? "★" : "☆";
        s.style.color = i < r ? "#f59e0b" : "#d1d5db";
    });
}

window.setRating = function (val) {
    window._feedbackRating = val;
    resetStars();
}

window.submitFeedback = function (caseId) {
    const rating = window._feedbackRating || 0;
    const comment = document.getElementById("feedbackComment")?.value.trim() || "";
    if (rating === 0) { showAlert("Please select a rating", "danger"); return; }

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    fetch("http://localhost:8080/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: parseInt(caseId), rating, comment, submittedById: currentUser.id })
    }).then(res => {
        if (res.ok) {
            document.getElementById("feedbackModal").remove();
            showAlert("Thank you for your feedback! ⭐", "success");
            setTimeout(() => location.reload(), 1200);
        } else {
            res.json().then(data => showAlert(data.message || "Error submitting feedback", "danger"));
        }
    }).catch(() => showAlert("Server error", "danger"));
}