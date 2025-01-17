import { reloadUserProfile } from '/utils/profile.js';
import { showNavItems } from '/static/js/navigation.js';

document.addEventListener("DOMContentLoaded", async () => {
    await reloadUserProfile();
    const userProfile = JSON.parse(localStorage.getItem("user"));
    const userPermissions = userProfile.permissions || {};

    if (!userPermissions["viewUsers"]) {
        window.location.href = "/"; // Redirigir si no tiene permiso
    }

    showNavItems(userPermissions);
});