document.addEventListener('DOMContentLoaded', () => {
    // Seleccionar el botón y agregar un event listener
    const createAccountform = document.getElementById('registrationForm');

    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePasswordButton = document.getElementById('togglePassword');
    const toggleConfirmPasswordButton = document.getElementById('toggleConfirmPassword');
    const nameInput = document.getElementById('name');
    const lastnameInput = document.getElementById('lastname');
    const rangeSelect = document.getElementById('range');
    const dniInput = document.getElementById('dni');

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

    // Toggle confirm password visibility
    toggleConfirmPasswordButton.addEventListener('click', () => {
        togglePasswordVisibility(confirmPasswordInput, toggleConfirmPasswordButton);
    });

    // Validate name and lastname (only letters and spaces)
    function validateNameInput(input) {
        const regex = /^[A-Za-zÀ-ÿ\s]+$/;
        if (!regex.test(input.value)) {
            input.setCustomValidity('Solo se permiten letras y espacios');
            input.classList.add('invalid');
        } else {
            input.setCustomValidity('');
            input.classList.remove('invalid');
        }
    }

    function validateOnBlur(input, validationFunction) {
        input.addEventListener('blur', () => {
            validationFunction(input);
        });
    }

    validateOnBlur(nameInput, validateNameInput);
    validateOnBlur(lastnameInput, validateNameInput);

    // Format and validate DNI
    function formatDNI(input) {
        let value = input.value.replace(/\D/g, '');
        if (value.length > 9) {
            value = value.slice(0, 9);
        }
        const numValue = parseInt(value, 10);
        if (numValue < 1000000 || numValue > 200000000) {
            //input.setCustomValidity('Ingrese un número entre 1.000.000 y 200.000.000');
            input.classList.add('invalid');
        } else {
            input.setCustomValidity('');
            input.classList.remove('invalid');
        }
        return new Intl.NumberFormat('es-AR').format(value);
    }

    dniInput.addEventListener('input', (e) => {
        const cursorPosition = e.target.selectionStart;
        const formattedValue = formatDNI(e.target);
        const lengthDiff = formattedValue.length - e.target.value.length;
        e.target.value = formattedValue;
        e.target.setSelectionRange(cursorPosition + lengthDiff, cursorPosition + lengthDiff);
    });

    dniInput.addEventListener('blur', () => {
        formatDNI(dniInput);
    });


    createAccountform.addEventListener('submit', async (event) => {

        event.preventDefault();
        // Crear un objeto con los datos
        const formData = {
            email: document.getElementById("email").value,
            password: document.getElementById("password").value,
            firstName: document.getElementById("name").value,
            lastName: document.getElementById("lastname").value,
            militaryRank: document.getElementById("rankMilitar").value,
            dni: document.getElementById("dni").value,
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

                registrationForm.style.display = 'none';
                successMessage.style.display = 'block';

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
