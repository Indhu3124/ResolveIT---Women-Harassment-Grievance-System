// ─────────────────────────────────────────────────────────────────────────
//  messages.js  —  Drop this in /assets/ and link from messages.html
//  Replaces the localStorage demo with real Spring Boot API calls.
// ─────────────────────────────────────────────────────────────────────────

const BASE_URL   = "http://localhost:8080/api";
const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) window.location.href = "../login.html";

let activeComplaintId = null;
let pollInterval      = null;

// ── Kick-off ─────────────────────────────────────────────────────────────
loadConversationList();
loadSidebarUnreadBadge();

// Helper for auth headers
function getAuthHeaders() {
    const token = localStorage.getItem("authToken");
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// ── Fetch conversation list (complaints assigned to this user) ────────────
async function loadConversationList() {
    const list = document.getElementById("chatList");
    list.innerHTML = `<div class="no-chats"><span class="spinner-border spinner-border-sm text-secondary"></span></div>`;

    try {
        // Fetch complaints that belong to this user - using /complaints/my endpoint
        const res  = await fetch(`${BASE_URL}/complaints/my`, {
            headers: getAuthHeaders()
        });
        const data = await res.json();

        // Keep only complaints that have an assigned committee member
        const assigned = data.filter(c => c.assignedTo);

        if (assigned.length === 0) {
            list.innerHTML = `
                <div class="no-chats">
                    <i class="bi bi-chat-square"></i>
                    <p style="font-size:13px">No active conversations yet.<br>
                    Messages appear once a committee member is assigned.</p>
                </div>`;
            return;
        }

        // Fetch last message and unread count for each complaint
        const withCounts = await Promise.all(assigned.map(async c => {
            try {
                // Fetch messages to get last message
                const msgsRes = await fetch(
                    `${BASE_URL}/messages?complaintId=${c.id}&requestingUserId=${currentUser.id}`,
                    { headers: getAuthHeaders() }
                );
                const msgs = await msgsRes.json();
                const lastMsg = msgs[msgs.length - 1];
                
                // Fetch unread count
                const urRes = await fetch(
                    `${BASE_URL}/messages/unread?complaintId=${c.id}&readerRole=COMPLAINANT`,
                    { headers: getAuthHeaders() }
                );
                const ur = await urRes.json();
                
                return { 
                    ...c, 
                    unread: ur.count || 0,
                    lastMessage: lastMsg?.text || "No messages yet"
                };
            } catch (err) {
                return { ...c, unread: 0, lastMessage: "No messages yet" };
            }
        }));

        renderChatList(withCounts);

        // Auto-open first
        if (withCounts.length > 0 && !activeComplaintId) {
            openChat(withCounts[0].id, withCounts[0]);
        }

    } catch (err) {
        list.innerHTML = `<div class="no-chats text-danger" style="font-size:13px">
            <i class="bi bi-exclamation-triangle me-1"></i>Could not load conversations.</div>`;
        console.error(err);
    }
}

// ── Render left-panel conversation list ──────────────────────────────────
function renderChatList(complaints) {
    const list = document.getElementById("chatList");
    list.innerHTML = complaints.map(c => `
        <div class="chat-item ${c.id === activeComplaintId ? "active" : ""}"
             onclick="openChat(${c.id}, ${JSON.stringify(c).replace(/"/g, '&quot;')})">
            <div class="chat-avatar committee">${initials(c.assignedTo?.name || c.assignedToName)}</div>
            <div class="chat-meta">
                <div class="chat-name">${c.assignedTo?.name || c.assignedToName || "Committee Member"}</div>
                <div class="chat-preview">${(c.lastMessage || "No messages yet").substring(0, 50)}${c.lastMessage?.length > 50 ? '...' : ''}</div>
                <span class="chat-case-badge">${c.title || "Case #" + c.id}</span>
            </div>
            ${c.unread > 0 ? `<div class="chat-unread">${c.unread}</div>` : ""}
        </div>
    `).join("");
}

// ── Open a chat window ───────────────────────────────────────────────────
async function openChat(complaintId, complaint) {
    activeComplaintId = complaintId;

    // Mark messages as read when opening chat
    try {
        await fetch(`${BASE_URL}/messages/read`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                complaintId: complaintId,
                readerRole: "COMPLAINANT"
            })
        });
    } catch (err) {
        console.error("Failed to mark messages as read:", err);
    }

    // Re-render list to move active state
    await loadConversationList();

    // Show loading state
    const win = document.getElementById("chatWindow");
    win.innerHTML = `<div class="empty-chat"><span class="spinner-border text-secondary"></span></div>`;

    await loadMessages(complaintId, complaint);
    startPolling(complaintId, complaint);   // poll for new messages every 5s
    await loadSidebarUnreadBadge();         // refresh badge after reading
}

// ── Load and render messages ──────────────────────────────────────────────
async function loadMessages(complaintId, complaint) {
    try {
        const res  = await fetch(
            `${BASE_URL}/messages?complaintId=${complaintId}&requestingUserId=${currentUser.id}`,
            { headers: getAuthHeaders() }
        );
        const msgs = await res.json();

        renderChatWindow(complaintId, complaint, msgs);

    } catch (err) {
        console.error("Failed to load messages:", err);
    }
}

// ── Render the full chat window ───────────────────────────────────────────
function renderChatWindow(complaintId, complaint, msgs) {
    const committeeName = complaint?.assignedTo?.name || complaint?.assignedToName || "Committee Member";
    const caseTitle     = complaint?.title || `Case #${complaintId}`;

    // Group by date
    const grouped = {};
    msgs.forEach(m => {
        const key = formatDate(m.createdAt);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(m);
    });

    const msgsHTML = Object.entries(grouped).map(([date, dayMsgs]) => `
        <div class="date-separator">${date}</div>
        ${dayMsgs.map(m => renderBubble(m, committeeName)).join("")}
    `).join("");

    document.getElementById("chatWindow").innerHTML = `
        <div class="chat-window-header">
            <div class="chat-avatar committee">${initials(committeeName)}</div>
            <div class="header-info">
                <h6>${committeeName}</h6>
                <span><i class="bi bi-shield-check me-1"></i>Committee Member</span>
            </div>
            <div class="case-tag"><i class="bi bi-folder2-open me-1"></i>${caseTitle}</div>
        </div>

        <div class="chat-messages" id="messagesBody">
            ${msgs.length === 0
                ? `<div class="empty-chat">
                       <i class="bi bi-chat-dots" style="font-size:40px;opacity:0.2"></i>
                       <p>No messages yet. Send a message to start the conversation.</p>
                   </div>`
                : msgsHTML}
        </div>

        <!-- Input area -->
        <div class="chat-input-area">
            <!-- Hidden file input -->
            <input type="file" id="fileInput" style="display:none"
                accept="image/*,.pdf,.doc,.docx,.txt"
                onchange="handleFileSelect(this)">
            
            <!-- Attach button -->
            <button class="btn btn-outline-secondary" style="height:44px;border-radius:12px;border-color:#e0daff;background:white"
                    onclick="document.getElementById('fileInput').click()" title="Attach file">
                <i class="bi bi-paperclip"></i>
            </button>

            <textarea id="messageInput"
                placeholder="Type your message…"
                rows="1"
                onkeydown="handleKey(event)"
                oninput="autoResize(this)"></textarea>

            <button class="btn-send" onclick="sendMessage()" title="Send">
                <i class="bi bi-send-fill"></i>
            </button>
        </div>
        
        <!-- Attachment preview bar (hidden by default) -->
        <div id="attachPreviewBar" style="display:none;position:fixed;bottom:80px;right:20px;left:auto;min-width:300px;
             background:#f0ebff;padding:8px 18px;border-radius:12px;border:1px solid #ddd6fe;
             font-size:13px;display:flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);z-index:1000;">
            <i class="bi bi-paperclip text-purple"></i>
            <span id="attachFileName">file.pdf</span>
            <button onclick="clearAttachment()" class="btn btn-sm btn-link text-danger ms-auto p-0" style="text-decoration:none">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>`;

    scrollToBottom();
}

// ── Render a single message bubble ───────────────────────────────────────
function renderBubble(m, committeeName) {
    const isSent = m.senderRole === "COMPLAINANT";

    if (m.messageType === "SYSTEM") {
        return `<div class="system-msg"><i class="bi bi-info-circle me-1"></i>${m.text}</div>`;
    }

    const attachmentHTML = m.fileName ? `
        <div class="mt-2" style="border-top:1px solid rgba(255,255,255,0.2);padding-top:8px">
            ${isImage(m.fileType)
                ? `<img src="${BASE_URL}/messages/${m.id}/attachment"
                        style="max-width:200px;border-radius:8px;cursor:pointer;max-height:200px"
                        onclick="window.open('${BASE_URL}/messages/${m.id}/attachment')">`
                : `<a href="${BASE_URL}/messages/${m.id}/attachment" target="_blank"
                      style="color:${isSent ? '#fff' : '#7c3aed'};font-size:13px;text-decoration:none">
                      <i class="bi bi-file-earmark-arrow-down me-1"></i>${m.fileName}
                      <small class="ms-1 opacity-75">(${formatBytes(m.fileSize)})</small>
                   </a>`
            }
        </div>` : "";

    return `
        <div class="msg-row ${isSent ? "sent" : "received"}">
            ${!isSent ? `<div class="msg-avatar">${initials(committeeName)}</div>` : ""}
            <div>
                ${!isSent ? `<div class="msg-sender-name">${committeeName}</div>` : ""}
                <div class="msg-bubble">
                    ${m.text ? `<span>${escapeHtml(m.text)}</span>` : ""}
                    ${attachmentHTML}
                    <span class="msg-time">
                        ${formatTime(m.createdAt)}
                        ${isSent
                            ? m.readByCommittee
                                ? '<i class="bi bi-check2-all ms-1" style="font-size:11px;color:#a5f3fc"></i>'
                                : '<i class="bi bi-check2 ms-1" style="font-size:11px;opacity:0.7"></i>'
                            : ""}
                    </span>
                </div>
            </div>
        </div>`;
}

// ── Send text message ─────────────────────────────────────────────────────
async function sendMessage() {
    if (!activeComplaintId) return;

    const input     = document.getElementById("messageInput");
    const fileInput = document.getElementById("fileInput");
    const text      = input.value.trim();
    const file      = fileInput?.files?.[0];

    if (!text && !file) return;

    const sendBtn = document.querySelector(".btn-send");
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="spinner-border spinner-border-sm" style="width:20px;height:20px"></div>';

    try {
        if (file) {
            // Multipart request with optional caption
            const fd = new FormData();
            fd.append("complaintId", activeComplaintId);
            fd.append("senderId",    currentUser.id);
            fd.append("senderRole",  "COMPLAINANT");
            if (text) fd.append("text", text);
            fd.append("file", file);

            const res = await fetch(`${BASE_URL}/messages/file`, { 
                method: "POST", 
                body: fd,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem("authToken")}`
                }
            });
            if (!res.ok) {
                const err = await res.json();
                showToast(err.error || err.message || "Upload failed", "danger");
                return;
            }
        } else {
            // Plain text
            const res = await fetch(`${BASE_URL}/messages/text`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    complaintId: activeComplaintId,
                    senderId:    currentUser.id,
                    senderRole:  "COMPLAINANT",
                    text
                })
            });
            if (!res.ok) {
                throw new Error("Failed to send message");
            }
        }

        input.value = "";
        input.style.height = "44px";
        clearAttachment();

        // Reload messages
        const complaint = { id: activeComplaintId };
        await loadMessages(activeComplaintId, complaint);
        await loadConversationList(); // Update last message preview

    } catch (err) {
        showToast("Could not send message. Check server.", "danger");
        console.error(err);
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="bi bi-send-fill"></i>';
    }
}

// ── File selection preview ────────────────────────────────────────────────
function handleFileSelect(input) {
    const file = input.files?.[0];
    if (!file) return;
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast("File size must be less than 10MB", "danger");
        input.value = "";
        return;
    }
    
    const bar  = document.getElementById("attachPreviewBar");
    const name = document.getElementById("attachFileName");
    if (bar && name) {
        name.textContent = `${file.name} (${formatBytes(file.size)})`;
        bar.style.display = "flex";
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (bar.style.display === "flex") {
                clearAttachment();
            }
        }, 10000);
    }
}

function clearAttachment() {
    const fi  = document.getElementById("fileInput");
    const bar = document.getElementById("attachPreviewBar");
    if (fi)  fi.value = "";
    if (bar) bar.style.display = "none";
}

// ── Polling — reload messages every 5 seconds ─────────────────────────────
function startPolling(complaintId, complaint) {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
        if (activeComplaintId === complaintId) {
            await loadMessages(complaintId, complaint);
            await loadConversationList(); // Update unread counts
            await loadSidebarUnreadBadge(); // Update sidebar badge
        }
    }, 5000);
}

// ── Sidebar unread badge ──────────────────────────────────────────────────
async function loadSidebarUnreadBadge() {
    try {
        const res   = await fetch(
            `${BASE_URL}/messages/unread/total?userId=${currentUser.id}&role=COMPLAINANT`,
            { headers: getAuthHeaders() }
        );
        const data  = await res.json();
        const badge = document.getElementById("sidebarUnreadBadge");
        if (!badge) return;
        if (data.count > 0) {
            badge.style.display = "inline-block";
            badge.textContent   = data.count > 99 ? "99+" : data.count;
        } else {
            badge.style.display = "none";
        }
    } catch { /* silent fail */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function getCurrentComplaint() {
    return { id: activeComplaintId };
}

function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { 
        e.preventDefault(); 
        sendMessage(); 
    }
}

function autoResize(el) {
    el.style.height = "44px";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
}

function scrollToBottom() {
    const body = document.getElementById("messagesBody");
    if (body) body.scrollTop = body.scrollHeight;
}

function initials(name) {
    if (!name) return "?";
    return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso), t = new Date(), y = new Date(t);
    y.setDate(t.getDate() - 1);
    if (d.toDateString() === t.toDateString()) return "Today";
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function formatBytes(b) {
    if (!b) return "";
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    return (b / (1024 * 1024)).toFixed(1) + " MB";
}

function isImage(mime) {
    return mime && mime.startsWith("image/");
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(msg, type = "info") {
    const toast = document.createElement("div");
    toast.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg`;
    toast.style.cssText = "z-index:99999;min-width:320px;border-radius:14px;font-size:14px;font-weight:500;padding:14px 20px;animation:slideDown 0.3s ease";
    toast.innerHTML = `<i class="bi bi-${type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => { 
        toast.style.transition = "opacity .3s"; 
        toast.style.opacity = "0"; 
        setTimeout(() => toast.remove(), 350); 
    }, 3000);
}