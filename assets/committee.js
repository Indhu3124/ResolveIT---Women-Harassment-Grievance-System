/* ============================================================
   resolveIT — committee.js
   FIXED: Role comparison uses toUpperCase() to work with
          backend returning "COMMITTEE" not "committee"
============================================================ */
document.addEventListener("DOMContentLoaded", function () {

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    // FIX: use toUpperCase() for role comparison
    if (!currentUser || currentUser.role.toUpperCase() !== "COMMITTEE") {
        window.location.href = "../login.html"; return;
    }

    // Helpers
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

    // ─── DASHBOARD ───
    const table = document.getElementById("committeeTable");
    if (table) {
        loadDashboard();

        function loadDashboard() {
            fetch(`http://localhost:8080/api/committee/cases/${currentUser.id}`)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch assigned cases");
                    return res.json();
                })
                .then(data => {
                    if (!Array.isArray(data)) data = [];

                    const totalEl = document.getElementById("totalCases");
                    const reviewEl = document.getElementById("reviewCases");
                    const resolvedEl = document.getElementById("resolvedCases");
                    const escalEl = document.getElementById("escalatedCases");

                    if (totalEl) animateCounter(totalEl, data.length);
                    if (reviewEl) animateCounter(reviewEl, data.filter(c => c.status === "UNDER_REVIEW").length);
                    if (resolvedEl) animateCounter(resolvedEl, data.filter(c => c.status === "RESOLVED").length);
                    if (escalEl) animateCounter(escalEl, data.filter(c => c.status === "ESCALATED").length);

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
                const sClass = formatStatusClass(c.status);
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

    // ─── CASE DETAILS PAGE ───
    const urlParams = new URLSearchParams(window.location.search);
    const caseId = urlParams.get("id");

    if (caseId) {
        fetch(`http://localhost:8080/api/complaints/${caseId}`)
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
                populate("caseTitle", complaint.title);
                populate("caseId", complaint.id);
                populate("caseDate", new Date(complaint.createdAt).toLocaleDateString());
                populate("casePriority", complaint.priority);
                populate("caseDescription", complaint.description);
                populate("caseType", complaint.type || "N/A");

                const formattedStatus = formatStatus(complaint.status);
                const statusClass = formatStatusClass(complaint.status);

                const statusEl = document.getElementById("caseStatus");
                if (statusEl) {
                    statusEl.innerText = formattedStatus;
                    statusEl.className = `status-badge status-${statusClass}`;
                }

                const statusSelect = document.getElementById("statusUpdate");
                if (statusSelect) statusSelect.value = complaint.status;

                activateTimeline(complaint.status);

                if (complaint.status === "RESOLVED") {
                    fetch(`http://localhost:8080/api/feedback/${caseId}`).then(r => {
                        if (r.ok) {
                            r.json().then(f => {
                                const fa = document.getElementById("feedbackArea");
                                if (fa) fa.innerHTML = `
                                    <div class="feedback-card"><h6>⭐ Complainant Feedback</h6>
                                    <div class="feedback-display-stars">${"⭐".repeat(f.rating)}</div>
                                    <p style="font-size:13px">${f.comment || "No comment"}</p></div>`;
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

                loadChat(caseId, currentUser);
                window._currentComplaint = complaint;
            })
            .catch(err => {
                showAlert("Case not found", "danger");
                console.error(err);
            });
    }

    // ─── STATUS UPDATE ───
    window.updateStatus = function () {
        const newStatus = document.getElementById("statusUpdate").value;
        if (!newStatus) { showAlert("Select a status", "danger"); return; }

        const updateBtn = document.querySelector('button[onclick="updateStatus()"]');
        const originalText = updateBtn.innerHTML;
        updateBtn.innerHTML = "Updating...";
        updateBtn.disabled = true;

        fetch(`http://localhost:8080/api/committee/cases/${caseId}/status`, {
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

function loadChat(caseId, currentUser) {
    const chatBox = document.getElementById("chatMessages");
    if (!chatBox) return;
    const chats = JSON.parse(localStorage.getItem("chats")) || {};
    const messages = chats[caseId] || [];
    chatBox.innerHTML = "";
    if (messages.length === 0) {
        chatBox.innerHTML = `<div style="text-align:center;color:#aaa;font-size:13px;margin-top:20px">No messages yet.</div>`;
        return;
    }
    messages.forEach(msg => {
        const isSent = msg.senderId === currentUser.id;
        chatBox.innerHTML += `
        <div class="chat-msg ${isSent ? 'sent' : 'received'}">
            <div class="msg-sender">${msg.senderName}</div>
            <div>${msg.text}</div>
            <div class="msg-time">${msg.time}</div>
        </div>`;
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}

window.sendChatMessage = function () {
    const input = document.getElementById("chatInput");
    if (!input || !input.value.trim()) return;

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const caseId = new URLSearchParams(window.location.search).get("id");
    if (!caseId || !currentUser) return;

    const msg = {
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        text: input.value.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    let chats = JSON.parse(localStorage.getItem("chats")) || {};
    if (!chats[caseId]) chats[caseId] = [];
    chats[caseId].push(msg);
    localStorage.setItem("chats", JSON.stringify(chats));

    input.value = "";
    loadChat(caseId, currentUser);
}
