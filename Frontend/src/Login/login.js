
document.addEventListener("DOMContentLoaded", () => {
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
                const response = await fetch('http://localhost:8070/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    console.log(result)
                
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
