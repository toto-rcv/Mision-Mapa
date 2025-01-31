import { reloadUserProfile } from '/utils/profile.js';
import { showNavItems } from '/static/js/navigation.js';
import { customFetch } from '/utils/auth.js';

document.addEventListener("DOMContentLoaded", async () => {
    await reloadUserProfile();
    const userProfile = JSON.parse(localStorage.getItem("user"));
    const userPermissions = userProfile.permissions || {};

    if (!userPermissions["viewUsers"]) {
        window.location.href = "/"; // Redirigir si no tiene permiso
    }

    showNavItems(userPermissions);

    // Obtener usuarios y renderizar la tabla
    const users = await getAllUsers();
    console.log('Users:', users);
    renderTable(users);
});

async function getAllUsers() {
    try {
        const response = await customFetch('/api/users', {  // Usa la ruta correcta
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudieron obtener los usuarios`);
        }

        const data = await response.json();
        console.log('Users data:', data);
        return data;
    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
        return [];
    }
}

function renderTable(users) {
    const table = document.createElement('table');
    table.classList.add('users-table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>DNI</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Email</th>
                <th>Rango Militar</th>
                <th>Rol</th>
                <th>Fecha de creación</th>
                <th>Fecha de actualización</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    users.forEach(user => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', user.id);
        row.innerHTML = `
            <td>${user.dni}</td>
            <td>${user.firstName}</td>
            <td>${user.lastName}</td>
            <td>${user.email}</td>
            <td>${user.militaryRank}</td>
            <td>${user.userRank}</td>
            <td>${user.createdAt}</td>
            <td>${user.updateAt}</td>
            <td>
            <select class="status-select" data-id="${user.dni}">
                    <option value="active" ${user.statusDetail.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="pending" ${user.statusDetail.status === 'pending' ? 'selected' : ''}>Inactive</option>
                    <option value="blocked" ${user.statusDetail.status === 'blocked' ? 'selected' : ''}>Banned</option>
                </select></td>
         
            <td class="actions-cell">
                <button class="delete-btn" data-id="${user.id}">Eliminar</button>
            </td>
        `;
        tbody.appendChild(row);
        console.log(`Created select for user ${user.dni} with status ${user.status}`);
    });



    document.querySelector('.users-table').innerHTML = '';
    document.querySelector('.users-table').appendChild(table);

    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async (event) => {
            const userId = select.getAttribute('data-id');
            console.log(`User ${userId} status changed to ${event.target.value}`);
            const newStatus = event.target.value;

            // Llamar a la función para actualizar el estado
            await updateUserStatus(userId, newStatus);
        });
    });

}



async function updateUserStatus(userId, newStatus) {
    try {
        const response = await customFetch(`/api/users/${userId}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo actualizar el estado`);
        }

        // Actualizar visualmente la celda con el nuevo estado
        const statusCell = document.querySelector(`.status-cell[data-id="${userId}"]`);
        if (statusCell) {
            statusCell.textContent = newStatus;
        }

        console.log(`Estado actualizado para el usuario ${userId}: ${newStatus}`);
    } catch (error) {
        console.error('Error al actualizar el estado del usuario:', error);
    }
}