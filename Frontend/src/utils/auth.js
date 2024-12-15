document.addEventListener("DOMContentLoaded", async () => {
    const accessToken = localStorage.getItem("accessToken")

    if (!accessToken) {
        window.location.href = "/login"
        return;
    }

    // Validar token contra backend
})