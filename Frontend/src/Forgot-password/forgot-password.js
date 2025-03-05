document.getElementById('forgot-password-form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Evita que el formulario se envíe de la manera tradicional

    const email = document.getElementById('email').value;

    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            alert('Correo de recuperación enviado.');
        } else {
            alert('Error al enviar el correo de recuperación.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al enviar el correo de recuperación.');
    }
});