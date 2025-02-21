// ================================
// IMPORTACIONES
// ================================
import { reloadUserProfile, retrieveUserProfile } from '/utils/profile.js';
import { showNavItems } from '/static/js/navigation.js';
import { customFetch } from '/utils/auth.js';
import { debounce, formatDate, formatDNI } from '/utils/utils.js';

// ================================
// VARIABLES GLOBALES
// ================================
const accessToken = localStorage.getItem('accessToken');

// ================================
// MÓDULO UsersApp
// ================================
const UsersApp = (function () {
    let userIdToDelete = null;
    let usersList = []; // Todos los usuarios del backend
    let currentDisplayList = []; // Lista de usuarios que se muestran (después de filtro)
    let currentFilter = null; // Filtro de búsqueda (nombre, email, dni)
    let currentStatusFilter = 'all'; // Filtro de estado: puede ser "active", "pending", "blocked" o "all"
    let currentPage = 1; // Página actual
    const usersPerPage = 10; // Máximo de usuarios por página

    // Elementos del DOM
    const elements = {
        tableContainer: document.querySelector('.users-table'),
        paginationContainer: document.getElementById('sightings-pagination'),
        modalConfirmDelete: document.getElementById('modal-confirm-delete'),
        confirmDeleteBtn: document.getElementById('confirmDelete'),
        cancelDeleteBtn: document.getElementById('cancelDelete'),
        searchInput: document.getElementById('search')
    };

    // ================================
    // EVENTOS DEL MODAL DE ELIMINACIÓN
    // ================================
    function setupDeleteModalListeners() {
        elements.confirmDeleteBtn.addEventListener('click', async () => {
            if (userIdToDelete) {
                await deleteUser(userIdToDelete);
                userIdToDelete = null;
                elements.modalConfirmDelete.style.display = 'none';
            }
        });

        elements.cancelDeleteBtn.addEventListener('click', () => {
            userIdToDelete = null;
            elements.modalConfirmDelete.style.display = 'none';
        });
    }

    // ================================
    // FUNCIONALIDAD DE BÚSQUEDA
    // ================================
    function setupSearchListener() {
        elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    function handleSearch() {
        const searchValue = elements.searchInput.value.trim().toLowerCase();
        let filteredUsers = [];

        if (searchValue === '') {
            filteredUsers = usersList;
        } else {
            filteredUsers = usersList.filter(user => {
                if (!currentFilter) {
                    // Búsqueda global en todos los campos
                    return (
                        user.firstName.toLowerCase().includes(searchValue) ||
                        user.lastName.toLowerCase().includes(searchValue) ||
                        user.email.toLowerCase().includes(searchValue) ||
                        user.dni.toString().includes(searchValue)
                    );
                } else {
                    switch (currentFilter) {
                        case 'fullName': {
                            const fullName = (user.firstName + ' ' + user.lastName).toLowerCase();
                            return fullName.includes(searchValue);
                        }
                        case 'email':
                            return user.email.toLowerCase().includes(searchValue);
                        case 'dni':
                            return user.dni.toString().includes(searchValue);
                        default:
                            return false;
                    }
                }
            });
        }
        // Al filtrar, reiniciamos la página actual y actualizamos la lista que se muestra
        currentPage = 1;
        currentDisplayList = filteredUsers;
        renderTable(currentDisplayList);
        renderPaginationButtons();
    }

    // ================================
    // CREACIÓN DEL MODAL DE FILTRO
    // ================================
    function setupFilterModal() {
        let filterBtn = document.getElementById('filter-options-btn');

        let filterModal = document.getElementById('filter-modal');
        if (!filterModal) {
            filterModal = document.createElement('div');
            filterModal.id = 'filter-modal';
            filterModal.innerHTML = `
                <h3>Opciones de Filtrado</h3>
                <form id="filter-form">
                  <div class="filter-option">
                    <label for="filter-fullName">Nombre y Apellido</label>
                    <input type="radio" id="filter-fullName" name="filterOption" value="fullName" ${currentFilter === 'fullName' ? 'checked' : ''}>
                  </div>
                  <div class="filter-option">
                    <label for="filter-email">Email</label>
                    <input type="radio" id="filter-email" name="filterOption" value="email" ${currentFilter === 'email' ? 'checked' : ''}>
                  </div>
                  <div class="filter-option">
                    <label for="filter-dni">DNI</label>
                    <input type="radio" id="filter-dni" name="filterOption" value="dni" ${currentFilter === 'dni' ? 'checked' : ''}>
                  </div>
                  <div class="filter-actions">
                    <button type="button" id="filter-confirm-btn">Confirmar</button>
                    <button type="button" id="cancel-filter-btn">Cancelar Filtro</button>
                  </div>
                </form>
            `;
            document.body.appendChild(filterModal);
        }

        function updateFilterModalPosition() {
            const btnRect = filterBtn.getBoundingClientRect();
            filterModal.style.top = (btnRect.top + window.scrollY) + 'px';
            filterModal.style.left = (btnRect.right + 20 + window.scrollX) + 'px';
        }

        filterBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateFilterModalPosition();
            filterModal.classList.add('active');
            filterModal.style.display = 'block';
        });

        window.addEventListener('resize', () => {
            if (filterModal.classList.contains('active')) {
                updateFilterModalPosition();
            }
        });

        document.addEventListener('click', (e) => {
            if (
                filterModal.classList.contains('active') &&
                !filterModal.contains(e.target) &&
                e.target !== filterBtn
            ) {
                filterModal.classList.remove('active');
                filterModal.style.display = 'none';
            }
        });

        document.getElementById('filter-confirm-btn').addEventListener('click', () => {
            const selected = document.querySelector('input[name="filterOption"]:checked')?.value;
            if (selected) {
                currentFilter = selected;
            }
            filterModal.classList.remove('active');
            filterModal.style.display = 'none';
            console.log('Filtro seleccionado:', currentFilter);
            // Al aplicar filtro, reiniciamos la página a 1
            currentPage = 1;
            handleSearch();
        });

        document.getElementById('cancel-filter-btn').addEventListener('click', () => {
            currentFilter = null;
            document.querySelectorAll('input[name="filterOption"]').forEach(input => input.checked = false);
            elements.searchInput.value = '';
            filterModal.classList.remove('active');
            filterModal.style.display = 'none';
            console.log('Filtros cancelados');
            currentPage = 1;
            handleSearch();
        });
    }

    document.addEventListener("scroll", function () {
        const modal = document.getElementById("filter-modal");
        if (modal && modal.style.display !== "none") {
          modal.style.display = "none";
        }
    });

    // ================================
    // FILTRADO POR ESTADO DE USUARIO
    // (Activos, Pendientes, Blockeados y Todos)
    // ================================
    function setupStatusButtons() {
        const statusButtons = document.querySelectorAll('.button-status');
        statusButtons.forEach(button => {
            button.addEventListener('click', () => {
                let selectedStatus;
                // Mapear el texto del botón al estado correspondiente
                switch (button.textContent.trim().toLowerCase()) {
                    case 'todos':
                        selectedStatus = 'all';
                        break;
                    case 'activos':
                        selectedStatus = 'active';
                        break;
                    case 'pendientes':
                        selectedStatus = 'pending';
                        break;
                    case 'blockeados':
                        selectedStatus = 'blocked';
                        break;
                    default:
                        selectedStatus = 'all';
                }
                currentStatusFilter = selectedStatus;
                let filteredUsers;
                if (selectedStatus === 'all' || selectedStatus === null) {
                    filteredUsers = usersList;
                } else {
                    filteredUsers = usersList.filter(user => {
                        return user.statusDetail && user.statusDetail.status === selectedStatus;
                    });
                }
    
                // Si hay un valor en el input de búsqueda, combinar ambos filtros
                const searchValue = elements.searchInput.value.trim().toLowerCase();
                if (searchValue) {
                    filteredUsers = filteredUsers.filter(user =>
                        user.firstName.toLowerCase().includes(searchValue) ||
                        user.lastName.toLowerCase().includes(searchValue) ||
                        user.email.toLowerCase().includes(searchValue) ||
                        user.dni.toString().includes(searchValue)
                    );
                }
                currentDisplayList = filteredUsers;
                currentPage = 1;
                renderTable(currentDisplayList);
                renderPaginationButtons();
            });
        });
    }

    // ================================
    // RENDERIZACIÓN DE LA TABLA DE USUARIOS (con paginación)
    // ================================
    function renderTable(users) {
        // Se muestran solo los usuarios de la página actual
        const startIndex = (currentPage - 1) * usersPerPage;
        const endIndex = startIndex + usersPerPage;
        const usersToDisplay = users.slice(startIndex, endIndex);

        const table = document.createElement('table');
        table.classList.add('users-table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>DNI</th>
                    <th>Fuerza Per.</th>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Fecha de creación</th>
                    <th>Modificador</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        usersToDisplay.forEach(user => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', user.id);
            row.innerHTML = `
                <td data-label="D.N.I:" >${formatDNI(user.dni)}</td>
                <td class="userForze" data-label="Fuerza Per.:" >${user.powerMilitary.trim()}</td>
                <td class="userName" data-label="Usuario:">${user.militaryRank.trim()} , ${user.firstName.trim()} ${user.lastName.trim()}</td>
                <td data-label="Email:">${user.email}</td>
                <td data-label="Rol-Usuario:">
                    <select class="rank-select" data-id="${user.dni}">
                        <option value="POA" ${user.userRank === 'POA' ? 'selected' : ''}>POA</option>
                        <option value="DETECCION" ${user.userRank === 'DETECCION' ? 'selected' : ''}>DETECCION</option>
                        <option value="JEFE DE DETECCION" ${user.userRank === 'JEFE DE DETECCION' ? 'selected' : ''}>JEFE DE DETECCION</option>
                    </select>
                </td>
                <td class="hide-on-mobile">${formatDate(new Date(user.createdAt))}</td>
                <td class="hide-on-mobile">${user.confirmUpdate}</td>
                <td data-label="Estado del Usuario:">
                    <select class="status-select" data-id="${user.dni}">
                        <option value="active" ${user.statusDetail.status === 'active' ? 'selected' : ''}>Activo</option>
                        <option value="pending" ${user.statusDetail.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                        <option value="blocked" ${user.statusDetail.status === 'blocked' ? 'selected' : ''}>Blockeado</option>
                    </select>
                </td>
                <td class="actions-cell">
                    <button class="delete-btn" data-id="${user.dni}">Eliminar</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        elements.tableContainer.innerHTML = '';
        elements.tableContainer.appendChild(table);

        setupTableEventListeners();
    }

    // ================================
    // RENDERIZACIÓN DE LOS BOTONES DE PAGINACIÓN
    // ================================
    function renderPaginationButtons() {
        const container = elements.paginationContainer;
        container.innerHTML = '';

        const totalPages = Math.ceil(currentDisplayList.length / usersPerPage);

        const prevButton = document.createElement('button');
        prevButton.textContent = 'Anterior';
        prevButton.id = 'prevPage';
        prevButton.disabled = currentPage === 1;

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Siguiente';
        nextButton.id = 'nextPage';
        nextButton.disabled = currentPage === totalPages || totalPages === 0;

        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
        pageInfo.style.margin = '0 10px'; // Espaciado entre botones

        container.appendChild(prevButton);
        container.appendChild(pageInfo);
        container.appendChild(nextButton);

        prevButton.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable(currentDisplayList);
                renderPaginationButtons();
            }
        });

        nextButton.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable(currentDisplayList);
                renderPaginationButtons();
            }
        });
    }

    // ================================
    // EVENTOS DE LA TABLA
    // ================================
    function setupTableEventListeners() {
        // Configurar eventos para status-select: al cambiar el estado, se actualiza la tabla
        document.querySelectorAll('.status-select').forEach(select => {
            const currentUser = retrieveUserProfile();
            if (currentUser.user.userRank === "POA" || currentUser.user.userRank === "DETECCION") {
                select.style.cursor = 'not-allowed';
                select.disabled = true;
            }
        });
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (event) => {
                const userId = select.getAttribute('data-id');
                const newStatus = event.target.value;
                // Actualizamos el status en el backend
                await updateUserStatus(userId, newStatus);
                // Re-obtenemos la lista actualizada de usuarios
                const updatedUsers = await getAllUsers();
                usersList = updatedUsers;
                // Si hay un filtro de estado activo (distinto de "all"), se aplica
                if (currentStatusFilter && currentStatusFilter !== 'all') {
                    currentDisplayList = updatedUsers.filter(user => user.statusDetail && user.statusDetail.status === currentStatusFilter);
                } else {
                    currentDisplayList = updatedUsers;
                }
                renderTable(currentDisplayList);
                renderPaginationButtons();
            });
        });

        document.querySelectorAll('.rank-select').forEach(select => {
            const currentUser = retrieveUserProfile();
            if (currentUser.user.userRank === "POA" || currentUser.user.userRank === "DETECCION") {
                select.style.cursor = 'not-allowed';
                select.disabled = true;
            }
        });

        document.querySelectorAll('.rank-select').forEach(select => {
            select.addEventListener('change', async (event) => {
                const userId = select.getAttribute('data-id');
                const newRank = event.target.value;
                await updateUserRank(userId, newRank);
            });
        });

        // Al hacer click en el botón "Eliminar", se asigna el ID del usuario y se muestra el modal de eliminación
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                userIdToDelete = event.target.getAttribute('data-id');
                elements.modalConfirmDelete.style.display = 'block';
            });
        });
    }

    // ================================
    // INICIALIZACIÓN DEL MÓDULO
    // ================================
    async function init() {
        setupDeleteModalListeners();
        setupSearchListener();
        setupFilterModal();
        setupStatusButtons(); // Configuración para filtrar por estado (incluyendo "Todos")
        await reloadUserProfile();
        const userProfile = JSON.parse(localStorage.getItem("user"));
        const userPermissions = userProfile.permissions || {};

        if (!userPermissions["viewUsers"]) {
            window.location.href = "/";
            return;
        }

        showNavItems(userPermissions);

        // Al cargar, obtenemos todos los usuarios y actualizamos la lista que se mostrará
        usersList = await getAllUsers();
        currentDisplayList = usersList; // Inicialmente se muestran todos
        currentPage = 1;
        renderTable(currentDisplayList);
        renderPaginationButtons();
    }

    return {
        init: init
    };
})();

document.addEventListener("DOMContentLoaded", UsersApp.init);

// ================================
// LLAMADAS A LA API
// ================================
async function updateUserStatus(userId, newStatus) {
    try {
        const response = await customFetch(`/api/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo actualizar el estado`);
        }
        console.log(`Estado actualizado para el usuario ${userId}: ${newStatus}`);
    } catch (error) {
        console.error('Error al actualizar el estado del usuario:', error);
    }
}

async function updateUserRank(userId, newRank) {
    try {
        const response = await customFetch(`/api/users/${userId}/rank`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ userRank: newRank })
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo actualizar el rango`);
        }
        console.log(`Rango actualizado para el usuario ${userId}: ${newRank}`);
    } catch (error) {
        console.error('Error al actualizar el rango del usuario:', error);
    }
}

async function getAllUsers() {
    try {
        const response = await customFetch('/api/users', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudieron obtener los usuarios`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
        return [];
    }
}

async function deleteUser(userId) {
    try {
        const response = await fetch(`/api/users/${userId}/deleteUser`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            }
        });
        const result = await response.json();
        if (response.ok) {
            location.reload();
        } else {
            alert(result.message);
        }
    } catch (error) {
        console.error("Error al eliminar el usuario:", error);
        alert("Error al eliminar el usuario.");
    }
}
