/* ============================================================
   resolveIT — auth.js
   FIXED:
   1. Login sends role UPPERCASED to backend
   2. Safely stores role from backend
   3. Redirect uses lowercase folder path
   4. Password toggle works everywhere
   5. showAlert is GLOBAL (outside DOMContentLoaded)
============================================================ */
document.addEventListener("DOMContentLoaded", function () {

    // ===== HERO TYPING EFFECT =====
    const animatedText = document.querySelector(".animated-text");
    if (animatedText) {
        const words = ["Report Safely.", "Speak Confidently.", "Be Protected.", "Find Resolution."];
        let i = 0;

        function typingEffect() {
            let chars = words[i].split("");
            animatedText.textContent = "";
            function loopTyping() {
                if (chars.length > 0) {
                    animatedText.textContent += chars.shift();
                    setTimeout(loopTyping, 75);
                } else {
                    setTimeout(deletingEffect, 1800);
                }
            }
            loopTyping();
        }

        function deletingEffect() {
            let chars = words[i].split("");
            function loopDeleting() {
                if (chars.length > 0) {
                    chars.pop();
                    animatedText.textContent = chars.join("");
                    setTimeout(loopDeleting, 45);
                } else {
                    i = (i + 1) % words.length;
                    setTimeout(typingEffect, 300);
                }
            }
            loopDeleting();
        }

        typingEffect();
    }

    // ===== PASSWORD TOGGLE =====
    const toggleIcons = document.querySelectorAll(".toggle-password");
    toggleIcons.forEach(icon => {
        icon.addEventListener("click", function () {
            const input = this.previousElementSibling;
            if (!input) return;
            const type = input.getAttribute("type") === "password" ? "text" : "password";
            input.setAttribute("type", type);
            this.classList.toggle("bi-eye");
            this.classList.toggle("bi-eye-slash");
        });
    });

    // ===== SCROLL REVEAL =====
    const reveals = document.querySelectorAll('.reveal');
    if (reveals.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    observer.unobserve(e.target);
                }
            });
        }, { threshold: 0.15 });
        reveals.forEach(el => observer.observe(el));
    }

    // ===== REGISTER FORM =====
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const name = document.getElementById("fullname").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const password = document.getElementById("regPassword").value;
            const confirm = document.getElementById("confirmPassword").value;
            const deptField = document.getElementById("department");
            const dept = deptField ? deptField.value.trim() || "General" : "General";

            if (!name || !email || !password || !confirm) {
                showAlert("All fields are required", "danger"); return;
            }
            if (password.length < 6) {
                showAlert("Password must be at least 6 characters", "danger"); return;
            }
            if (password !== confirm) {
                showAlert("Passwords do not match", "danger"); return;
            }

            const newUser = { name, email, password, department: dept };

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating Account...';
            submitBtn.disabled = true;

            fetch("http://localhost:8080/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser)
            })
                .then(res => res.json().then(data => ({ ok: res.ok, data })))
                .then(({ ok, data }) => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    if (ok && data.success) {
                        showAlert("✅ Registration successful! Redirecting to login…", "success");
                        registerForm.reset();
                        setTimeout(() => { window.location.href = "login.html"; }, 1600);
                    } else {
                        showAlert(data.message || "Registration failed. Please try again.", "danger");
                    }
                })
                .catch(err => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    showAlert("⚠️ Cannot connect to server. Make sure Spring Boot is running on port 8080.", "danger");
                    console.error("Register error:", err);
                });
        });
    }

    // ===== LOGIN FORM =====
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const roleRaw = document.getElementById("role").value;

            if (!email || !password || !roleRaw) {
                showAlert("Please fill in all fields including your role", "danger"); return;
            }

            const roleForBackend = roleRaw.toUpperCase();
            const loginPayload = { email, password, role: roleForBackend };

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging in...';
            submitBtn.disabled = true;

            fetch("http://localhost:8080/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginPayload)
            })
                .then(res => res.json().then(fetchData => ({ ok: res.ok, fetchData })))
                .then(({ ok, fetchData }) => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;

                    if (ok) {
                        const roleSafe = (fetchData.role || "").toUpperCase();
                        const userObject = {
                            id: fetchData.id,
                            name: fetchData.name,
                            email: fetchData.email,
                            role: roleSafe,
                            department: fetchData.department || ""
                        };
                        localStorage.setItem("currentUser", JSON.stringify(userObject));
                        showAlert(fetchData.message || "Welcome back! 👋", "success");
                        const roleLower = roleSafe.toLowerCase();
                        setTimeout(() => {
                            window.location.href = roleLower + "/dashboard.html";
                        }, 1000);
                    } else {
                        showAlert(fetchData.message || "Invalid credentials or role mismatch!", "danger");
                    }
                })
                .catch(err => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    showAlert("⚠️ Cannot connect to server. Make sure Spring Boot is running on port 8080.", "danger");
                    console.error("Login error:", err);
                });
        });
    }

}); // end DOMContentLoaded


/* ===================================================
   GLOBAL HELPER FUNCTIONS
   Outside DOMContentLoaded so they work everywhere
   including inside fetch() promise callbacks.
=================================================== */

function showAlert(message, type = "info") {
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg`;
    alertDiv.style.cssText = `
        z-index: 99999;
        min-width: 320px;
        border-radius: 14px;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 500;
        animation: fadeInUp 0.3s ease;
        padding: 14px 20px;
    `;
    alertDiv.innerHTML = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
        alertDiv.style.transition = "opacity 0.3s ease";
        alertDiv.style.opacity = "0";
        setTimeout(() => alertDiv.remove(), 350);
    }, 3000);
}

function addNotification(role, userId, message, type = "info") {
    let notifications = JSON.parse(localStorage.getItem("notifications")) || [];
    notifications.push({
        id: Date.now() + Math.random(),
        role, userId, message, type,
        time: new Date().toLocaleString(),
        read: false
    });
    localStorage.setItem("notifications", JSON.stringify(notifications));
}

function addAuditLog(action, detail, type = "info") {
    let logs = JSON.parse(localStorage.getItem("auditLogs")) || [];
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    logs.push({
        id: Date.now(),
        action, detail, type,
        actor: currentUser ? currentUser.name : "System",
        actorRole: currentUser ? currentUser.role : "system",
        time: new Date().toLocaleString()
    });
    localStorage.setItem("auditLogs", JSON.stringify(logs));
}