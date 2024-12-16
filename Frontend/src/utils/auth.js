document.addEventListener("DOMContentLoaded", async () => {
    const accessToken = localStorage.getItem("accessToken")

    if (!accessToken) {
        window.location.href = "/login"
        return;
    }

    // Validar token contra backend
    try {
        // Enviar el token al backend para validarlo
        const response = await fetch("http://localhost:8070/api/verify/verify-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`, // Token en el header
            },
        });
        
        if (!response.ok) {
            // Si la respuesta no es exitosa, limpiar el token y redirigir
            localStorage.removeItem("accessToken");
            window.location.href = "/login";
            return;
        }

        // Obtener la respuesta del servidor (datos del usuario)
        const data = await response.json();
        console.log("Token válido:", data);
        

    } catch (error) {
        console.error("Error al validar el token:", error);
        // Redirigir en caso de un error inesperado
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
    }
})