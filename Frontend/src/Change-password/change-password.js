document.addEventListener("DOMContentLoaded", async () => {

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

});