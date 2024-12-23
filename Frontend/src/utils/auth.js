export async function verifyAccessToken() {
    let accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!accessToken) {
        redirectToLogin();
        return false;
    }

    try {
        // Intentar validar el Access Token en el servidor
        const response = await fetch("/api/verify/verify-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        if (response.ok) {
            return true; // El Access Token es válido
        }

        // Si el Access Token es inválido o expirado, intentar renovarlo
        console.warn("Access Token expirado. Intentando renovar...");
        if (refreshToken) {
            await refreshAccessToken(); // Llamar a la función para renovar
            verifyAccessToken(); // Reintentar la verificación
        } else {
            console.error("No hay Refresh Token disponible.");
            redirectToLogin();
        }
    } catch (error) {
        console.error("Error al verificar el Access Token:", error);
        redirectToLogin();
    }

    return false; // El Access Token no es válido
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem("refreshToken");

    try {
        const response = await fetch("/api/auth/refresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: refreshToken }),
        });

        if (!response.ok) {
            throw new Error("Error al renovar el Access Token.");
        }

        const data = await response.json();
        // Guardar el nuevo Access Token en localStorage
        localStorage.setItem("accessToken", data.accessToken);
    } catch (error) {
        console.error("No se pudo renovar el Access Token:", error.message);
        redirectToLogin();
    }
}

function redirectToLogin() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.href = "/login";
}

if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
    document.addEventListener("DOMContentLoaded", verifyAccessToken);
}