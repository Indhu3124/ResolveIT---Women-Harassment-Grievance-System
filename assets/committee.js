/* ============================================================
   resolveIT — committee.js
   MERGED: Your features (evidence, incident details, status
           update, report generation, timeline, feedback)
   + Her features (backend API chat replacing localStorage,
     date grouping, system messages, file attachments in chat)
============================================================ */

const API_BASE_URL = "http://localhost:8080/api";

document.addEventListener("DOMContentLoaded", function () {

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || currentUser.role.toUpperCase() !== "COMMITTEE") {
        window.location.href = "../login.html"; return;
    }

    // ─── HELPERS ─────────────────────────────────────────────────
    function formatStatus(status) {
        if (!status) return "";
        return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

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
    const table = document.getElementById("committeeTable");
    if (table) {
        loadDashboard();

        function loadDashboard() {
            fetch(`${API_BASE_URL}/committee/cases/${currentUser.id}`)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch assigned cases");
                    return res.json();
                })
                .then(data => {
                    if (!Array.isArray(data)) data = [];

                    const totalEl    = document.getElementById("totalCases");
                    const reviewEl   = document.getElementById("reviewCases");
                    const resolvedEl = document.getElementById("resolvedCases");
                    const escalEl    = document.getElementById("escalatedCases");

                    if (totalEl)    animateCounter(totalEl,    data.length);
                    if (reviewEl)   animateCounter(reviewEl,   data.filter(c => c.status === "UNDER_REVIEW").length);
                    if (resolvedEl) animateCounter(resolvedEl, data.filter(c => c.status === "RESOLVED").length);
                    if (escalEl)    animateCounter(escalEl,    data.filter(c => c.status === "ESCALATED").length);

                    const sidebarBadge = document.getElementById("assignedBadge");
                    if (sidebarBadge) {
                        sidebarBadge.textContent = data.length > 0 ? data.length : "";
                        sidebarBadge.style.display = data.length > 0 ? "inline" : "none";
                    }

                    renderTable(data);
                    setupSearch(data);
                })
                .catch(err => console.error("Error fetching assigned cases:", err));
        }

        function renderTable(data) {
            table.innerHTML = "";
            if (data.length === 0) {
                table.innerHTML = `<tr><td colspan="6" class="text-center py-5"><div style="font-size:40px;margin-bottom:10px">📭</div><div class="text-muted">No cases assigned yet.</div></td></tr>`;
                return;
            }
            data.forEach(c => {
                const fStatus = formatStatus(c.status);
                const sClass  = formatStatusClass(c.status);
                table.innerHTML += `
                <tr>
                    <td><code style="font-size:12px;color:#6d28d9">${c.id}</code></td>
                    <td><strong>${c.title}</strong></td>
                    <td><span class="priority-text priority-${c.priority}">${c.priority || 'N/A'}</span></td>
                    <td><span class="status-badge status-${sClass}">${fStatus}</span></td>
                    <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                    <td class="text-center">
                        <a href="casedetails.html?id=${c.id}" class="btn btn-sm custom-btn">View</a>
                    </td>
                </tr>`;
            });
        }

        function setupSearch(data) {
            const searchInput = document.getElementById("searchInput");
            if (searchInput) {
                searchInput.addEventListener("input", function () {
                    const q = this.value.toLowerCase();
                    renderTable(data.filter(c =>
                        String(c.id).toLowerCase().includes(q) ||
                        c.title.toLowerCase().includes(q) ||
                        (c.priority && c.priority.toLowerCase().includes(q))
                    ));
                });
            }
        }
    }

    // ─── CASE DETAILS PAGE ───────────────────────────────────────
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get("id");

    if (caseId) {
        fetch(`${API_BASE_URL}/complaints/${caseId}`)
            .then(res => {
                if (!res.ok) throw new Error("Case not found");
                return res.json();
            })
            .then(complaint => {
                if (!complaint.assignedTo || complaint.assignedTo.id !== currentUser.id) {
                    showAlert("You are not assigned to this case.", "warning");
                    setTimeout(() => window.location.href = "dashboard.html", 1500);
                    return;
                }

                const populate = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
                populate("caseTitle",       complaint.title);
                populate("caseId",          complaint.id);
                populate("caseDate",        new Date(complaint.createdAt).toLocaleDateString());
                populate("casePriority",    complaint.priority);
                populate("caseDescription", complaint.description);
                populate("caseType",        complaint.type || "N/A");

                const formattedStatus = formatStatus(complaint.status);
                const statusClass     = formatStatusClass(complaint.status);

                const statusEl = document.getElementById("caseStatus");
                if (statusEl) {
                    statusEl.innerText   = formattedStatus;
                    statusEl.className   = `status-badge status-${statusClass}`;
                }

                const statusSelect = document.getElementById("statusUpdate");
                if (statusSelect) statusSelect.value = complaint.status;

                activateTimeline(complaint.status);

                // ── EVIDENCE FILE ─────────────────────────────────
                const evidenceSection     = document.getElementById("evidenceSection");
                const evidenceFileDisplay = document.getElementById("evidenceFileDisplay");
                if (evidenceSection && evidenceFileDisplay) {
                    if (complaint.evidenceFileName) {
                        evidenceSection.style.display = "block";
                        const fileUrl = `${API_BASE_URL}/complaints/files/${complaint.evidenceFileName}`;
                        const ext     = complaint.evidenceFileName.split('.').pop().toLowerCase();
                        const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
                        const isPdf   = ext === "pdf";

                        if (isImage) {
                            evidenceFileDisplay.innerHTML = `
                            <div style="margin-top:8px">
                                <img src="${fileUrl}" alt="Evidence"
                                     style="max-width:100%;max-height:400px;border-radius:10px;border:1px solid #e5e7eb;object-fit:contain;"
                                     onerror="this.outerHTML='<div class=text-danger style=font-size:13px><i class=bi bi-exclamation-circle me-1></i>Image could not be loaded.</div>'"
                                />
                                <div class="mt-2 d-flex gap-2">
                                    <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary" style="border-radius:20px;font-size:12px">
                                        <i class="bi bi-box-arrow-up-right me-1"></i> Open in new tab
                                    </a>
                                    <a href="${fileUrl}" download class="btn btn-sm btn-outline-secondary" style="border-radius:20px;font-size:12px">
                                        <i class="bi bi-download me-1"></i> Download
                                    </a>
                                </div>
                            </div>`;
                        } else if (isPdf) {
                            evidenceFileDisplay.innerHTML = `
                            <div style="margin-top:8px">
                                <iframe src="${fileUrl}" width="100%" height="400px"
                                        style="border-radius:10px;border:1px solid #e5e7eb" title="Evidence PDF">
                                </iframe>
                                <div class="mt-2 d-flex gap-2">
                                    <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-primary" style="border-radius:20px;font-size:12px">
                                        <i class="bi bi-file-earmark-pdf me-1"></i> Open PDF
                                    </a>
                                    <a href="${fileUrl}" download class="btn btn-sm btn-outline-secondary" style="border-radius:20px;font-size:12px">
                                        <i class="bi bi-download me-1"></i> Download
                                    </a>
                                </div>
                            </div>`;
                        } else {
                            evidenceFileDisplay.innerHTML = `
                            <div class="d-flex align-items-center gap-3 p-3"
                                 style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px">
                                <i class="bi bi-file-earmark-fill fs-4 text-success"></i>
                                <div style="flex:1;min-width:0">
                                    <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${complaint.evidenceFileName}</div>
                                    <small class="text-muted">Uploaded by complainant</small>
                                </div>
                                <div class="d-flex gap-2 flex-shrink-0">
                                    <a href="${fileUrl}" target="_blank" class="btn btn-sm btn-outline-success">
                                        <i class="bi bi-eye me-1"></i> View
                                    </a>
                                    <a href="${fileUrl}" download class="btn btn-sm btn-success">
                                        <i class="bi bi-download me-1"></i> Download
                                    </a>
                                </div>
                            </div>`;
                        }
                    } else {
                        evidenceSection.style.display = "none";
                    }
                }

                // ── INCIDENT DETAILS ──────────────────────────────
                const incidentSection        = document.getElementById("incidentSection");
                const incidentDetailsDisplay = document.getElementById("incidentDetailsDisplay");
                if (incidentSection && incidentDetailsDisplay) {
                    if (complaint.incidentLocation || complaint.incidentDate || complaint.incidentTime) {
                        incidentSection.style.display = "block";
                        incidentDetailsDisplay.innerHTML = `
                            ${complaint.incidentLocation ? `<p class="mb-1"><i class="bi bi-geo-alt me-1"></i><strong>Location:</strong> ${complaint.incidentLocation}</p>` : ''}
                            ${complaint.incidentDate     ? `<p class="mb-1"><i class="bi bi-calendar me-1"></i><strong>Date:</strong> ${complaint.incidentDate}</p>` : ''}
                            ${complaint.incidentTime     ? `<p class="mb-1"><i class="bi bi-clock me-1"></i><strong>Time:</strong> ${complaint.incidentTime}</p>` : ''}`;
                    } else {
                        incidentSection.style.display = "none";
                    }
                }

                // ── FEEDBACK ──────────────────────────────────────
                if (complaint.status === "RESOLVED") {
                    fetch(`${API_BASE_URL}/feedback/${caseId}`).then(r => {
                        if (r.ok) {
                            r.json().then(f => {
                                const fa = document.getElementById("feedbackArea");
                                if (fa) fa.innerHTML = `
                                    <div class="feedback-card">
                                        <h6>⭐ Complainant Feedback</h6>
                                        <div class="feedback-display-stars">${"⭐".repeat(f.rating)}</div>
                                        <p style="font-size:13px">${f.comment || "No comment"}</p>
                                    </div>`;
                            });
                        } else {
                            const fa = document.getElementById("feedbackArea");
                            if (fa) fa.innerHTML = `<p class="text-muted" style="font-size:13px">No feedback yet.</p>`;
                        }
                    });
                } else {
                    const feedbackArea = document.getElementById("feedbackArea");
                    if (feedbackArea) feedbackArea.innerHTML = `<p class="text-muted" style="font-size:13px">No feedback yet.</p>`;
                }

                // Load chat using backend API
                loadChat(caseId, currentUser);
                window._currentComplaint = complaint;
            })
            .catch(err => {
                showAlert("Case not found", "danger");
                console.error(err);
            });
    }

    // ─── STATUS UPDATE ───────────────────────────────────────────
    window.updateStatus = function () {
        const newStatus = document.getElementById("statusUpdate").value;
        if (!newStatus) { showAlert("Select a status", "danger"); return; }

        const updateBtn = document.querySelector('button[onclick="updateStatus()"]');
        const originalText = updateBtn.innerHTML;
        updateBtn.innerHTML = "Updating...";
        updateBtn.disabled = true;

        fetch(`${API_BASE_URL}/committee/cases/${caseId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus, performedById: currentUser.id })
        }).then(res => {
            if (res.ok) {
                showAlert("Status updated successfully", "success");
                setTimeout(() => location.reload(), 1200);
            } else {
                updateBtn.innerHTML = originalText;
                updateBtn.disabled = false;
                res.json().then(data => showAlert(data.message || "Error updating status", "danger"));
            }
        }).catch(err => {
            updateBtn.innerHTML = originalText;
            updateBtn.disabled = false;
            showAlert("Server error", "danger");
            console.error(err);
        });
    };

    window.generateReport = function () {
        const c = window._currentComplaint;
        if (!c) return;
        const formattedStatus = formatStatus(c.status);
        const content = `resolveIT CASE REPORT\n========================\nCase ID: ${c.id}\nTitle: ${c.title}\nStatus: ${formattedStatus}\nPriority: ${c.priority}\nDate: ${new Date(c.createdAt).toLocaleDateString()}\n\nDescription:\n${c.description}\n\nGenerated: ${new Date().toLocaleString()}`;
        const blob = new Blob([content], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${c.id}-report.txt`;
        a.click();
    };

});

// ─── TIMELINE ────────────────────────────────────────────────
function activateTimeline(status) {
    const statusOrder = ["SUBMITTED", "UNDER_REVIEW", "IN_INVESTIGATION", "RESOLVED"];
    const idx = statusOrder.indexOf(status);
    const uiSteps = ["Submitted", "UnderReview", "InInvestigation", "Resolved"];

    uiSteps.forEach((s, i) => {
        const el = document.getElementById(`timeline${s}`);
        if (el) el.classList.toggle("active", i <= idx);
    });

    const escEl = document.getElementById("timelineEscalated");
    if (escEl) escEl.classList.toggle("active", status === "ESCALATED");
}

// ─── CHAT — Backend API ───────────────────────────────────────
async function loadChat(caseId, currentUser) {
    const chatBox = document.getElementById("chatMessages");
    if (!chatBox) return;

    try {
        const response = await fetch(
            `${API_BASE_URL}/messages?complaintId=${caseId}&requestingUserId=${currentUser.id}`
        );

        if (!response.ok) throw new Error('Failed to load messages');

        const messages = await response.json();
        chatBox.innerHTML = "";

        if (messages.length === 0) {
            chatBox.innerHTML = `<div style="text-align:center;color:#aaa;font-size:13px;margin-top:20px">No messages yet.</div>`;
            return;
        }

        // Group messages by date
        const grouped = {};
        messages.forEach(msg => {
            const dateKey = formatMessageDate(msg.createdAt);
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(msg);
        });

        Object.entries(grouped).forEach(([date, dayMsgs]) => {
            chatBox.innerHTML += `<div class="date-separator">${date}</div>`;
            dayMsgs.forEach(msg => {
                const isSent  = msg.senderId === currentUser.id;
                const isSystem = msg.messageType === "SYSTEM";

                if (isSystem) {
                    chatBox.innerHTML += `
                        <div class="system-message">
                            <i class="bi bi-info-circle"></i> ${escapeHtml(msg.text)}
                        </div>`;
                } else {
                    chatBox.innerHTML += `
                        <div class="chat-msg ${isSent ? 'sent' : 'received'}">
                            <div class="msg-sender">${escapeHtml(msg.sender?.name || (isSent ? currentUser.name : 'Complainant'))}</div>
                            <div class="msg-text">${escapeHtml(msg.text || '')}</div>
                            ${msg.fileName ? `
                                <div class="msg-attachment">
                                    <a href="${API_BASE_URL}/messages/${msg.id}/attachment"
                                       target="_blank" class="attachment-link">
                                        <i class="bi bi-paperclip"></i> ${escapeHtml(msg.fileName)}
                                        ${msg.fileSize ? `<small>(${formatBytes(msg.fileSize)})</small>` : ''}
                                    </a>
                                </div>
                            ` : ''}
                            <div class="msg-time">${formatMessageTime(msg.createdAt)}</div>
                        </div>`;
                }
            });
        });

        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (error) {
        console.error('Error loading chat:', error);
        if (chatBox) chatBox.innerHTML = `<div style="text-align:center;color:#dc2626;font-size:13px;margin-top:20px">
            Failed to load messages. Please refresh the page.
        </div>`;
    }
}

window.sendChatMessage = async function () {
    const input = document.getElementById("chatInput");
    if (!input || !input.value.trim()) return;

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const caseId = new URLSearchParams(window.location.search).get("id");
    if (!caseId || !currentUser) return;

    const text = input.value.trim();
    const sendBtn = document.querySelector('.chat-send-btn');

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="spinner-border spinner-border-sm" style="width:16px;height:16px"></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/messages/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                complaintId: parseInt(caseId),
                senderId: currentUser.id,
                senderRole: "COMMITTEE",
                text: text
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send message');
        }

        input.value = "";
        await loadChat(caseId, currentUser);

    } catch (error) {
        console.error('Error sending message:', error);
        showAlert(error.message || 'Failed to send message', 'danger');
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="bi bi-send-fill"></i>';
    }
};

// ─── CHAT HELPER FUNCTIONS ────────────────────────────────────
function formatMessageTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatMessageDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBytes(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}