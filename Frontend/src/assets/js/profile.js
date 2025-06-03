document.addEventListener('DOMContentLoaded', function () {
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileDropdownContent = document.getElementById('profileDropdownContent');
    const profileDropdownOverlay = document.getElementById('profileDropdownOverlay');
    const logoutBtn = document.getElementById('logoutBtn');
    const isMobile = window.innerWidth <= 768;

    // Toggle dropdown when clicking the button
    profileDropdownBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        profileDropdownContent.classList.toggle('show');
        if (isMobile) {
            //profileDropdownOverlay.classList.toggle('show');
            document.body.style.overflow = profileDropdownContent.classList.contains('show') ? 'hidden' : '';
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function (event) {
        if (!event.target.closest('.profile')) {
            profileDropdownContent.classList.remove('show');
            if (isMobile) {
                //profileDropdownOverlay.classList.remove('show');
                document.body.style.overflow = '';
            }
        }
    });

    // Close dropdown when clicking overlay on mobile
    if (isMobile) {
        /*
        profileDropdownOverlay.addEventListener('click', function() {
            profileDropdownContent.classList.remove('show');
            profileDropdownOverlay.classList.remove('show');
            document.body.style.overflow = '';
        });
        */
    }


    // Handle logout
    logoutBtn.addEventListener('click', async function (event) {
        event.preventDefault();
        
        try {
            // Primero, desconectar el socket
            if (window.socketInstance && window.socketInstance.socket) {
                window.socketInstance.disconnect();
            }

            // Esperar un momento para asegurar que la desconexión del socket se procese
            await new Promise(resolve => setTimeout(resolve, 500));

            // Limpiar el localStorage y redirigir
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem('sightings');
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            // Aún así, limpiar el localStorage y redirigir
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem('sightings');
            window.location.href = '/login.html';
        }
    });

    // Manejar el cierre de la ventana o navegación
    window.addEventListener('beforeunload', function (event) {
        // Desconectar el socket antes de cerrar
        if (window.socketInstance && window.socketInstance.socket) {
            window.socketInstance.disconnect();
        }
    });
});