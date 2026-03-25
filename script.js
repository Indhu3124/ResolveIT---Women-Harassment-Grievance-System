function loginUser() {

    const role = document.getElementById("role").value;

    if(role === "complainant") {
        window.location.href = "complainant-dashboard.html";
    }

    if(role === "admin") {
        window.location.href = "admin-dashboard.html";
    }

    if(role === "ic") {
        window.location.href = "ic-dashboard.html";
    }

    return false;
}