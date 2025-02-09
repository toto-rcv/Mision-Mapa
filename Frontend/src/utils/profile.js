import { customFetch } from '/utils/auth.js';

export async function getUserProfile() {
    const accessToken = localStorage.getItem("accessToken");
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
    };
    try {
        const response = await customFetch("/api/auth/profile", {
            method: "GET",
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem("user", JSON.stringify(data));
            return;
        }

        console.error("Error al obtener el perfil de usuario.");
        localStorage.removeItem("user");
    } catch (error) {
        console.error("Error al obtener el perfil de usuario:", error);
    }
}

export function loadUserProfile() {
    const { user } = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        console.error('No se encontraron datos de usuario en el localStorage.');
    }

    const profileAvatar = document.querySelector('.profile-avatar');
    const profileName = document.querySelector('.profile-name');
    const profileRole = document.querySelector('.profile-role');

    // Actualiza los elementos del perfil con los datos del usuario
    profileAvatar.textContent = user.firstName.charAt(0).toUpperCase() + user.lastName.charAt(0).toUpperCase(); // Inicial del nombre
    profileName.textContent = `${user.firstName} ${user.lastName}`;
    profileRole.textContent = `Rol: ${user.userRank}`;
}

export function getUserId() {
    const { user } = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        console.error('No se encontraron datos de usuario en el localStorage.');
    }

    return user.dni
}

export async function reloadUserProfile() {
    await getUserProfile();
    loadUserProfile();
}