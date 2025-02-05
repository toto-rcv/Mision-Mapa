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
                <th>Creador</th>
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
            <td>${user.confirmUpdate}</td>
            <td>
            <select class="status-select" data-id="${user.dni}">
                    <option class="opcion-select" value="active" ${user.statusDetail.status === 'active' ? 'selected' : ''}>Active</option>
                    <option class="opcion-select" value="pending" ${user.statusDetail.status === 'pending' ? 'selected' : ''}>Inactive</option>
                </select></td>
         
            <td class="actions-cell">
                <button class="delete-btn" id="btnDelete"  data-id="${user.dni}" >X</button>
            </td>
        `;
        tbody.appendChild(row);
        console.log(`Created select for user ${user.dni} with status ${user.status}`);
        console.log(user.confirmUpdate)
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


    let userIdToDelete = null; // Variable global para almacenar el usuario a eliminar

    document.addEventListener("click", function (event) {
        if (event.target.classList.contains("delete-btn")) {
            userIdToDelete = event.target.getAttribute("data-id"); // Guarda el ID del usuario
    
            const modal = document.getElementById("modal-confirm-delete");
            const button = event.target; // Botón que se presionó
    
            // Obtiene la posición del botón en la pantalla
            const rect = button.getBoundingClientRect();
            
            // Posiciona el modal al lado derecho del botón
            modal.style.position = "absolute";
            modal.style.top = `${rect.top + window.scrollY -20}px`;
    
            // Muestra el modal
            modal.style.display = "block";
        }
    });
    
    // Evento para cerrar el modal cuando se presiona el botón "No"
    document.getElementById("cancelDelete").addEventListener("click", function () {
        document.getElementById("modal-confirm-delete").style.display = "none";
    });
    
    // Evento para confirmar la eliminación cuando se presiona "Sí" en el modal
    document.getElementById("confirmDelete").addEventListener("click", async function () {
        if (userIdToDelete) { // Asegurar que hay un usuario seleccionado
            try {
                const response = await fetch(`/api/users/${userIdToDelete}/deleteUser`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                        "Content-Type": "application/json"
                    }
                });
    
                const result = await response.json();
    
                if (response.ok) {
                    location.reload(); // Recargar la tabla tras eliminar
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error("Error al eliminar el usuario:", error);
                alert("Error al eliminar el usuario.");
            } finally {
                userIdToDelete = null; // Limpiar variable después de la eliminación
                document.getElementById("modal-confirm-delete").style.display = "none"; // Ocultar modal
            }
        }
    });
    
    // Evento para cerrar el modal si el usuario presiona "No" o fuera del modal
    document.getElementById("cancelDelete").addEventListener("click", function () {
        userIdToDelete = null; // Limpiar variable
        document.getElementById("modal-confirm-delete").style.display = "none"; // Ocultar modal
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
            body: JSON.stringify({ status: newStatus ,})
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