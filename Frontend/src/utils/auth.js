async function verifyAccessToken() {
    let accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!accessToken) {
        // Si no hay Access Token, redirigir al login
        console.error("No hay Access Token presente.");
        redirectToLogin();
        return;
    }

    try {
        // Intentar validar el Access Token en el servidor
        const response = await fetch("http://localhost:8070/api/verify/verify-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Access Token válido:", data);
            return; // Salir si el Access Token es válido
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
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem("refreshToken");

    try {
        const response = await fetch("http://localhost:8070/api/auth/refresh-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: refreshToken }),
        });

        if (!response.ok) {
            throw new Error("Error al renovar el Access Token.");
        }

        const data = await response.json();
        console.log("Nuevo Access Token recibido:", data.accessToken);

        // Guardar el nuevo Access Token en localStorage
        localStorage.setItem("accessToken", data.accessToken);
        console.log("Nuevo Access Token obtenido!")
    } catch (error) {
        console.error("No se pudo renovar el Access Token:", error.message);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
       //redirectToLogin();
    }
}

function redirectToLogin() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
}

document.addEventListener("DOMContentLoaded", verifyAccessToken);