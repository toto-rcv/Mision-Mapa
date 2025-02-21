import { getUserProfile } from '/utils/profile.js';
import { verifyAccessToken } from '/utils/auth.js';

document.addEventListener("DOMContentLoaded", async () => {

    const accessToken = localStorage.getItem("accessToken");

    if (accessToken) {
        if (await verifyAccessToken());
        window.location.href = "/";
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

    loginForm.addEventListener('submit', async (event) => {

        event.preventDefault();
        // Crear un objeto con los datos
        const formData = {
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        };

        try {
            // Enviar los datos al backend con fetch
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();

                const { accessToken, refreshToken } = result
                localStorage.setItem("accessToken", accessToken)
                localStorage.setItem("refreshToken", refreshToken)
                await getUserProfile();
                window.location.href = "/"

            } else {
                const error = await response.json();
                alert('Error: ' + error.message);
            }
        } catch (err) {
            console.error('Error al conectar con el servidor:', err);
            alert('Error al conectar con el servidor.');
        }
    })


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