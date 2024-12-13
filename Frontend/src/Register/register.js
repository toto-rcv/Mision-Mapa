

document.addEventListener('DOMContentLoaded', () => {
    // Seleccionar el botón y agregar un event listener
    const createAccountform = document.getElementById('form');

    createAccountform.addEventListener('submit', async () => {
        
        event.preventDefault();
        // Capturar los datos del formulario
        const rangoMilitar = document.querySelector('input[name="rango_militar"]').value;
        const correoElectronico = document.querySelector('input[name="correo_electronico"]').value;
        const nombre = document.querySelector('input[name="nombre"]').value;
        const apellidos = document.querySelector('input[name="apellidos"]').value;
        const dni = document.querySelector('input[name="dni"]').value;
        const contrasena = document.querySelector('input[name="contrasena"]').value;

        // Crear un objeto con los datos
        const formData = {
            email: correoElectronico,
            password: contrasena,
            firstName: nombre,
            lastName: apellidos,
            militaryRank: rangoMilitar ,
            dni: dni,
          };
            console.log(formData)
        try {
            // Enviar los datos al backend con fetch
            const response = await fetch('http://localhost:8070/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                alert('Registro exitoso: ' + result.message);
              window.location.href = '/'; // Redirige a otra página
            } else {
                const error = await response.json();
                alert('Error: ' + error.message);
            }
        } catch (err) {
            console.error('Error al conectar con el servidor:', err);
            alert('Error al conectar con el servidor.');
        }
    });
});
