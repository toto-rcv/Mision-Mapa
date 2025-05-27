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
    logoutBtn.addEventListener('click', function (event) {
        event.preventDefault();
        // Perform logout actions
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('sightings'); // Añadir esta línea
        // Redirect to login page
        window.location.href = '/login.html';
    });
});