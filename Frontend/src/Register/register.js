document.addEventListener('DOMContentLoaded', () => {
    // Seleccionar el botón y agregar un event listener
    const createAccountform = document.getElementById('registrationForm');
    const successMessage = document.getElementById('successMessage');
    const submitButton = registrationForm.querySelector('.submit-btn');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePasswordButton = document.getElementById('togglePassword');
    const toggleConfirmPasswordButton = document.getElementById('toggleConfirmPassword');
    const nameInput = document.getElementById('name');
    const lastnameInput = document.getElementById('lastname');
    const dniInput = document.getElementById('dni');

    function togglePasswordVisibility(input, button) {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        button.setAttribute('aria-label', type === 'text' ? 'Ocultar contraseña' : 'Mostrar contraseña');
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
        const regex = /^[A-Za-zÀ-ÿ\s]*$/;

        if (!regex.test(input.value)) {
            input.setCustomValidity('Solo letras y espacios');
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
        const rawValue = input.value.replace(/\./g, '');
        const isValid = /^(\d{7,8}){0,1}$/.test(rawValue);
        
        if (!isValid) {
            input.setCustomValidity('DNI debe tener 7 u 8 dígitos');
            input.classList.add('invalid');
        } else {
            input.setCustomValidity('');
            input.classList.remove('invalid');
        }
        return new Intl.NumberFormat('es-AR').format(rawValue);
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

    function validatePasswordMatch() {
        const match = passwordInput.value === confirmPasswordInput.value;

        if (!match) {
            confirmPasswordInput.setCustomValidity("Las contraseñas no coinciden");
        } else {
            confirmPasswordInput.setCustomValidity("");
        }

        [passwordInput, confirmPasswordInput].forEach(input => {
            input.classList.toggle('invalid', !match);
        });
    }

    function validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        
        return {
            isValid: password.length >= minLength && 
                    hasUpperCase && 
                    hasLowerCase && 
                    hasNumber && 
                    hasSymbol,
            criteria: {
                length: password.length >= minLength,
                upper: hasUpperCase,
                lower: hasLowerCase,
                number: hasNumber,
                symbol: hasSymbol
            }
        };
    }

    function updatePasswordRequirements() {
        const validation = validatePasswordStrength(passwordInput.value);
        const requirementElements = document.querySelectorAll('[data-criterion]');
    
        requirementElements.forEach(element => {
            const criterion = element.dataset.criterion;
            const isValid = validation.criteria[criterion];
            
            element.classList.remove('valid', 'invalid');
            element.classList.add(isValid ? 'valid' : 'invalid');
        });

        passwordInput.setCustomValidity(!validation.isValid ? "La contraseña no cumple los requisitos de seguridad": "");
        passwordInput.classList.toggle('invalid', !validation.isValid);
    }

    passwordInput.addEventListener('input', () => {
        validatePasswordMatch();
        updatePasswordRequirements();
    });

    confirmPasswordInput.addEventListener('input', () => { 
        validatePasswordMatch();
        updatePasswordRequirements();
    });

    createAccountform.addEventListener('submit', async (event) => {

        event.preventDefault();

         if (!registrationForm.checkValidity()) {
            registrationForm.reportValidity();
            return;
        }

        submitButton.disabled = true;
        submitButton.classList.add('loading');

        // Crear un objeto con los datos
        const formData = {
            email: document.getElementById("email").value,
            password: document.getElementById("password").value,
            firstName: document.getElementById("name").value,
            lastName: document.getElementById("lastname").value,
            militaryRank: document.getElementById("rankMilitar").value,
            powerMilitary: document.getElementById("powerMilitary").value,
            dni: document.getElementById("dni").value.replace(/\./g, ''),
        };

        try {
            // Enviar los datos al backend con fetch
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                const result = await response.json();

                submitButton.classList.remove('loading');
                submitButton.classList.add('success');
          
                // Wait for 1 second before transitioning to success message
                setTimeout(() => {
                    // Animate form out
                    registrationForm.classList.add('fade-out');
              
                    setTimeout(() => {
                        registrationForm.style.display = 'none';
                        successMessage.style.display = 'block';
                    
                        // Trigger reflow to ensure the transition works
                        void successMessage.offsetWidth;
                    
                        // Animate success message in
                        successMessage.classList.add('fade-in');

                        setTimeout(() => {
                            const progressBar = document.querySelector(".progress-bar")
                            progressBar.style.width = "100%"
              
                            // Redirect after 5 seconds
                            setTimeout(() => {
                              redirectToLogin()
                            }, 10000)
                          }, 500)
                    }, 500); // Wait for the form fade-out animation to complete
                }, 1000);

            } else {
                const error = await response.json();
                submitButton.classList.remove('loading');
                alert('Error: ' + error.message);
            }
        } catch (err) {
            console.error('Error al conectar con el servidor:', err);
            submitButton.classList.remove('loading');
            alert('Error al conectar con el servidor.');
        }
    });
});


function redirectToLogin() {
    window.location.href = "/login"
  }