let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
    refreshSubscribers.push(cb);
}

function onRefreshed(accessToken) {
    refreshSubscribers.forEach((cb) => cb(accessToken));
    refreshSubscribers = [];
}

export async function verifyAccessToken() {
    let accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    try {
        // Intentar validar el Access Token en el servidor
        const response = await customFetch("/api/verify/verify-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        if (response.ok) {
            return true; // El Access Token es válido
        }

        if (refreshToken) {
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((newAccessToken) => {
                        resolve(true);
                    });
                });
            }
            isRefreshing = true;
            await refreshAccessToken(); // Llamar a la función para renovar
            isRefreshing = false;
            onRefreshed(localStorage.getItem("accessToken"));
            
            return verifyAccessToken(); // Reintentar la verificación
        } else {
            console.error("No hay Refresh Token disponible.");
            redirectToLogin();
        }
    } catch (error) {
        console.error("Error al verificar el Access Token:", error);
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


export async function customFetch(url, options = {}) {
    let accessToken = localStorage.getItem("accessToken");

    options.headers = {
        ...options.headers,
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json" 
    };


    let response = await fetch(url, options);

    if (response.status === 401 || response.status === 403) {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
            console.error("No hay Refresh Token disponible. Redirigiendo a login.");
            redirectToLogin();
            return response; 
        }

        if (!isRefreshing) {
            isRefreshing = true;
            try {
                await refreshAccessToken();
                accessToken = localStorage.getItem("accessToken");
                onRefreshed(accessToken);
                
                options.headers["Authorization"] = `Bearer ${accessToken}`; // Actualizar headers con el nuevo token
                response = await fetch(url, options); // Reintentar la petición original
                return response; // Retornar la nueva respuesta (petición reintentada)
            } catch (refreshError) {
                console.error("Error al renovar el Access Token en customFetch:", refreshError);
                redirectToLogin();
                return response; // Retornar la respuesta original (o podrías retornar un error específico)
            } finally {
                isRefreshing = false;
            }
        } else {
            // Esperar a que se refresque el token y reintentar
            return new Promise((resolve) => {
                subscribeTokenRefresh(async () => { // Usar async para await dentro del subscriber
                    accessToken = localStorage.getItem("accessToken");
                    options.headers["Authorization"] = `Bearer ${accessToken}`;
                    try {
                        const retryResponse = await fetch(url, options);
                        resolve(retryResponse); // Resolver la promesa con la respuesta reintentada
                    } catch (retryError) {
                        console.error("Error al reintentar la petición después de refrescar el token:", retryError);
                        redirectToLogin(); // O manejar el error de otra manera
                        resolve(response); // Resolver con la respuesta original (o podrías retornar un error específico)
                    }
                });
            });
        }
    }

    return response;
}