import { getUserProfile } from '/utils/profile.js';
import { verifyAccessToken } from '/utils/auth.js';

document.addEventListener("DOMContentLoaded", async () => {

    const accessToken = localStorage.getItem("accessToken");

    if (accessToken) {
        if (await verifyAccessToken());
        window.location.href = "/index";
    }

    const loginForm = document.getElementById("loginForm");
    const passwordInput = document.getElementById('password');
    const togglePasswordButton = document.getElementById('togglePassword');

    function togglePasswordVisibility(input, button) {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);

        if (type === 'password') {
            button.setAttribute('aria-label', 'Mostrar contraseña');
        } else {
            button.setAttribute('aria-label', 'Ocultar contraseña');
        }
    }

    // Toggle password visibility
    togglePasswordButton.addEventListener('click', () => {
        togglePasswordVisibility(passwordInput, togglePasswordButton);
    });

    let bloqueoInterval = null;
    const BLOQUEO_KEY = 'bloqueoHasta';

    function mostrarModalBloqueo() {
        const modal = document.getElementById('modal-blocked');
        const modalMsg = document.getElementById('modal-blocked-message');
        const bloqueoHasta = parseInt(localStorage.getItem(BLOQUEO_KEY), 10);
        function actualizarMensaje() {
            const ahora = Date.now();
            const restante = Math.max(0, Math.ceil((bloqueoHasta - ahora) / 1000));
            if (restante > 0) {
                modalMsg.textContent = `Te quedaste sin intentos, por favor espera ${restante} segundos para reintentar.`;
            } else {
                modalMsg.textContent = "Ya puedes volver a intentar.";
                clearInterval(bloqueoInterval);
                bloqueoInterval = null;
                localStorage.removeItem(BLOQUEO_KEY);
            }
        }
        actualizarMensaje();
        if (!bloqueoInterval) {
            bloqueoInterval = setInterval(actualizarMensaje, 1000);
        }
        modal.style.display = 'flex';
        document.getElementById('modal-blocked-close').onclick = () => {
            modal.style.display = 'none';
            // No limpiar el intervalo aquí, para que siga actualizando el tiempo en background
        };
    }

    // Si hay un bloqueo activo al cargar la página, mostrar el modal actualizado
    const bloqueoHasta = parseInt(localStorage.getItem(BLOQUEO_KEY), 10);
    if (bloqueoHasta && bloqueoHasta > Date.now()) {
        mostrarModalBloqueo();
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
        }

        const formData = {
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                const { accessToken, refreshToken } = result;
                localStorage.setItem("accessToken", accessToken);
                localStorage.setItem("refreshToken", refreshToken);
                await getUserProfile();
                window.location.href = "/index";
            } else {
                const error = await response.json();
                // Mostrar modal personalizado si es bloqueo por intentos
                if (error.message && error.message.includes("Demasiados intentos")) {
                    // Guardar el tiempo de desbloqueo en localStorage (5 minutos = 300000 ms)
                    const desbloqueoEn = 5 * 60 * 1000;
                    const ahora = Date.now();
                    let bloqueoHasta = parseInt(localStorage.getItem(BLOQUEO_KEY), 10);
                    if (!bloqueoHasta || bloqueoHasta < ahora) {
                        bloqueoHasta = ahora + desbloqueoEn;
                        localStorage.setItem(BLOQUEO_KEY, bloqueoHasta);
                    }
                    mostrarModalBloqueo();
                } else if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.style.display = 'block';
                } else {
                    alert('Error: ' + error.message);
                }
            }
        } catch (err) {
            console.error('Error al conectar con el servidor:', err);
            if (errorDiv) {
                errorDiv.textContent = 'Error al conectar con el servidor.';
                errorDiv.style.display = 'block';
            } else {
                alert('Error al conectar con el servidor.');
            }
        }
    });

});


function actualizarAlturaViewport() {
    // Si está disponible, usa visualViewport.height; de lo contrario, usa innerHeight
    const alturaVisible = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${alturaVisible * 0.01}px`);
}

// Actualiza la altura al cargar y al redimensionar
actualizarAlturaViewport();
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', actualizarAlturaViewport);
}
window.addEventListener('resize', actualizarAlturaViewport);