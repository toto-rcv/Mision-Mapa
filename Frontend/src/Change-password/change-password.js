document.addEventListener("DOMContentLoaded", async () => {

    const passwordInput = document.getElementById('password');
    const togglePasswordButton = document.getElementById('togglePassword');
    const forgotPasswordForm = document.getElementById('forgot-password-form');

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

    // Handle change password
    forgotPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const password = passwordInput.value;
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token');
            
        

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('resetToken')}` // Assuming the reset token is stored in localStorage
                },
                body: JSON.stringify({ password, token  } )
            });

            const result = await response.json();
            if (response.ok) {
                alert('Contraseña actualizada exitosamente.');
            } else {
                alert(result.message || 'Error al actualizar la contraseña.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar la contraseña.');
        }
    });

});