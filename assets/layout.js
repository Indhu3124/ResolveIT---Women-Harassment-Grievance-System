/* ============================================================
   resolveIT — layout.js
   FIXED:
   1. capitalize() now handles UPPERCASE role strings from backend
   2. loadNotifications() has graceful fallback if backend endpoint missing
   3. markNotificationsRead() has error handling
============================================================ */
document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    // Relative logo path — works from any subfolder depth
    const depth = (path.match(/\//g) || []).length;
    const logoPath = depth <= 1 ? "assets/images/logo.png" : "../assets/images/logo.png";

    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) return;

    const initial = currentUser.name.charAt(0).toUpperCase();

    // FIX: capitalize handles "ADMIN" → "Admin", "complainant" → "Complainant"
    const roleDisplay = capitalize(currentUser.role);

    // Build the top navbar
    const navbar = `
    <nav class="main-navbar">
        <div class="nav-left">
            <div class="logo-circle-sm me-2">
                <img src="${logoPath}" alt="resolveIT"
                     onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'bi bi-shield-fill\\' style=\\'color:#7b5cff;font-size:18px\\'></i>'">
            </div>
            <div class="logo">resolveIT</div>
        </div>

        <div class="nav-right">

            <!-- NOTIFICATION BELL -->
            <div class="notification-wrapper">
                <div class="notification-icon" onclick="toggleNotifications()" title="Notifications">
                    <i class="bi bi-bell-fill"></i>
                    <span id="notifCount"></span>
                </div>
                <div id="notificationDropdown" class="notification-dropdown">
                    <div class="notif-header">
                        <span><i class="bi bi-bell me-1"></i> Notifications</span>
                        <span class="notif-clear-btn" onclick="clearNotifications()">Clear all</span>
                    </div>
                    <div class="notif-list" id="notifList"></div>
                </div>
            </div>

            <!-- PROFILE -->
            <div class="profile-wrapper">
                <div class="profile-icon" onclick="toggleProfileMenu()" title="${currentUser.name}">
                    ${initial}
                </div>
                <div id="profileDropdown" class="profile-dropdown">
                    <div class="profile-dropdown-header">
                        <div class="p-avatar">${initial}</div>
                        <div class="profile-name">${currentUser.name}</div>
                        <div class="profile-role-badge">${roleDisplay}</div>
                    </div>
                    <div class="profile-dropdown-body">
                        <button class="logout-btn" onclick="logout()">
                            <i class="bi bi-box-arrow-right me-2"></i>Sign Out
                        </button>
                    </div>
                </div>
            </div>

        </div>
    </nav>
    `;

    document.body.insertAdjacentHTML("afterbegin", navbar);
    loadNotifications();

    // Close dropdowns when clicking outside
    document.addEventListener("click", function (e) {
        const notifWrapper = document.querySelector(".notification-wrapper");
        const profileWrapper = document.querySelector(".profile-wrapper");

        if (notifWrapper && !notifWrapper.contains(e.target)) {
            const dd = document.getElementById("notificationDropdown");
            if (dd) dd.classList.remove("show");
        }
        if (profileWrapper && !profileWrapper.contains(e.target)) {
            const pd = document.getElementById("profileDropdown");
            if (pd) pd.classList.remove("show");
        }
    });
});


// FIX: capitalize works for both "ADMIN" and "admin" → "Admin"
function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/* ===== LOGOUT ===== */
function logout() {
    localStorage.removeItem("currentUser");
    const path = window.location.pathname;
    const depth = (path.match(/\//g) || []).length;
    window.location.href = depth <= 1 ? "login.html" : "../login.html";
}

/* ===== PROFILE DROPDOWN ===== */
function toggleProfileMenu() {
    const pd = document.getElementById("profileDropdown");
    const nd = document.getElementById("notificationDropdown");
    if (nd) nd.classList.remove("show");
    if (pd) pd.classList.toggle("show");
}

/* ===== NOTIFICATION DROPDOWN ===== */
function toggleNotifications() {
    const nd = document.getElementById("notificationDropdown");
    const pd = document.getElementById("profileDropdown");
    if (pd) pd.classList.remove("show");
    if (nd) nd.classList.toggle("show");
    if (nd && nd.classList.contains("show")) {
        markNotificationsRead();
    }
}

// FIX: loadNotifications() — tries backend first, falls back to localStorage
function loadNotifications() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) return;

    fetch(`http://localhost:8080/api/notifications/${currentUser.id}`)
        .then(res => {
            if (!res.ok) throw new Error("Notifications endpoint not available");
            return res.json();
        })
        .then(userNotifs => {
            renderNotifications(userNotifs);
        })
        .catch(() => {
            // Fallback: show localStorage notifications
            const all = JSON.parse(localStorage.getItem("notifications")) || [];
            const roleUpper = currentUser.role ? currentUser.role.toUpperCase() : "";
            const userNotifs = all.filter(n =>
                (n.role && n.role.toUpperCase() === roleUpper) ||
                (n.userId && n.userId === currentUser.id)
            );
            renderNotifications(userNotifs);
        });
}

function renderNotifications(userNotifs) {
    const count = document.getElementById("notifCount");
    const list = document.getElementById("notifList");
    if (!count || !list) return;

    const unread = userNotifs.filter(n => !n.read).length;
    count.textContent = unread > 0 ? (unread > 9 ? "9+" : String(unread)) : "";

    if (userNotifs.length === 0) {
        list.innerHTML = `<div class="notif-empty"><i class="bi bi-check-circle me-1"></i>No new notifications</div>`;
        return;
    }

    list.innerHTML = userNotifs.slice().reverse().map(n => `
        <div class="notif-item ${!n.read ? 'unread' : ''}">
            <div class="notif-msg">${n.message}</div>
            <small>${n.createdAt ? new Date(n.createdAt).toLocaleString() : (n.time || '')}</small>
        </div>
    `).join("");
}

// FIX: markNotificationsRead() — tries backend, silently fails if not available
function markNotificationsRead() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser) return;

    fetch(`http://localhost:8080/api/notifications/${currentUser.id}/read-all`, {
        method: "PUT"
    }).then(res => {
        if (res.ok) {
            const count = document.getElementById("notifCount");
            if (count) count.textContent = "";
        }
    }).catch(() => {
        // Silently ignore if endpoint not available
        // Mark localStorage notifications as read instead
        let notifications = JSON.parse(localStorage.getItem("notifications")) || [];
        notifications = notifications.map(n => ({ ...n, read: true }));
        localStorage.setItem("notifications", JSON.stringify(notifications));
        const count = document.getElementById("notifCount");
        if (count) count.textContent = "";
    });
}

function clearNotifications() {
    markNotificationsRead();
    const list = document.getElementById("notifList");
    if (list) {
        list.innerHTML = `<div class="notif-empty"><i class="bi bi-check-circle me-1"></i>All caught up!</div>`;
    }
}
