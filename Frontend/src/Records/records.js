import { reloadUserProfile } from '/utils/profile.js';
import { customFetch } from '../utils/auth.js';
import { showNavItems } from '/static/js/navigation.js';
import { toProperCase, debounce, formatDate } from '../utils/utils.js';

const SightingsApp = (function() {
    let currentSearch = '';
    let sightingsCurrentPage = 1;
    let touchStartY = 0;
    let touchEndY = 0;

    // DOM elements
    const elements = {
        modal: document.getElementById('observations-modal'),
        closeButton: document.getElementById('close-observations-modal'),
        modalContent: document.querySelector('#observations-modal .modal-content'),
        searchInput: document.getElementById('search'),
        sightingsList: document.getElementById('sightings-list'),
        paginationContainer: document.getElementById('sightings-pagination')
    };

    // Event listeners
    function setupEventListeners() {
        elements.modalContent.addEventListener("touchstart", handleTouchStart, { passive: true })
        document.addEventListener("touchmove", handleTouchMove, { passive: false })
        document.addEventListener("touchend", handleTouchEnd)
        elements.closeButton.addEventListener("click", closeModal)
        window.addEventListener("hashchange", handleHashChange)
        elements.searchInput.addEventListener("input", debounce(handleSearch, 300))
        window.addEventListener("resize", adjustColumnsForSmallScreens)
    }

    // Touch event handlers
    function handleTouchStart(e) {
        touchStartY = e.touches[0].clientY
    }

    function handleTouchMove(e) {
        if (!elements.modal.classList.contains("active")) return
        touchEndY = e.touches[0].clientY
        const diffY = touchEndY - touchStartY
        if (diffY > 0) {
            e.preventDefault()
            elements.modalContent.style.transform = `translateY(${diffY}px)`
            elements.modalContent.style.transition = "none"
        }
    }

    function handleTouchEnd() {
        if (!elements.modal.classList.contains("active")) return
        const diffY = touchEndY - touchStartY
        elements.modalContent.style.transform = ""
        elements.modalContent.style.transition = ""
        if (diffY > 100) {
            closeModal()
        } else {
            elements.modalContent.style.transform = "translateY(0)"
        }
    }

    // Search and pagination
    function handleSearch() {
        const search = elements.searchInput.value.trim().toLowerCase()
        sightingsCurrentPage = 1
        currentSearch = search
        loadAndDisplaySightings()
    }

   // Modal functions
   function showObservationsModal(sighting) {
        const modalFields = [
            'observaciones', 'tipo-motor', 'cantidad-motores', 'color', 
            'rumbo', 'tipo-aeronave', 'altitud'
        ];
        modalFields.forEach(field => {
            document.getElementById(`modal-${field}`).value = sighting[field] || 'N/A';
        });
        document.getElementById('modal-coordenadas').value = `[${sighting.latitud},${sighting.longitud}]`;

        elements.modal.classList.add('active');
        elements.modal.setAttribute('aria-hidden', 'false');
        elements.closeButton.focus();
        window.location.hash = 'modal-open';
    }

    function closeModal() {
        elements.modal.classList.remove("active")
        document.body.style.overflow = ""
        if (window.location.hash === "#modal-open") {
          history.back()
        }
    }

    function handleHashChange() {
        if (window.location.hash !== '#modal-open') {
            closeModal();
        }
    }

    async function loadAndDisplaySightings() {
        try {
            const data = await loadSightings({ page: sightingsCurrentPage, search: currentSearch });
            if (data) {
                const { sightings, currentPage, totalPages } = data;
                // Cache the sightings
                localStorage.setItem("sightings", JSON.stringify(sightings))
                displaySightings(sightings);
                renderPagination(currentPage, totalPages);
            }
        } catch (error) {
            console.error('Error loading sightings:', error);
            // TODO: Implement user-friendly error handling
        }
    }

    // Función para mostrar los avistamientos en la tabla
    function displaySightings(sightings) {
        renderTable(sightings);
        adjustColumnsForSmallScreens();
        checkPermissionsAndDisableDeleteButtons();
    }

    function renderTable(sightings) {
        const table = document.createElement('table');
        table.classList.add('sightings-table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>#</th>
                    <th class="col-ws fecha-header">Fecha <img src="static/img/angles-up-down.svg"/></th>
                    <th class="ubicacion-cell">Ubicacion</th>
                    <th class="col-medium-screen">Creado por</th>
                    <th class="col-large-screen">Latitud</th>
                    <th class="col-large-screen">Longitud</th>
                    <th>Rumbo</th>
                    <th>Altitud Est.</th>
                    <th>Tipo de Aeronave</th>
                    <th class="col-medium-screen">Color</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        sightings.forEach(sighting => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', sighting.id);
            row.innerHTML = `
                <td>${sighting.id}</td>
                <td data-label="Fecha" class="col-ws">${formatDate(new Date(sighting.fecha_avistamiento))}</td>
                <td data-label="Ubicación" class="ubicacion-cell">${sighting.ubicacion}</td>
                <td data-label="Nombre y Apellido" class="col-medium-screen">${toProperCase(sighting.usuario.firstName)} ${toProperCase(sighting.usuario.lastName)}</td>
                <td data-label="Latitud" class="latitud-cell col-large-screen">${sighting.latitud}</td>
                <td data-label="Longitud" class="longitud-cell col-large-screen">${sighting.longitud}</td>
                <td data-label="Rumbo">${sighting.rumbo}</td>
                <td data-label="Altitud estimada">${sighting.altitud_estimada}</td>
                <td data-label="Tipo de Aeronave">${sighting.tipo_aeronave}</td>
                <td data-label="Color" class="col-medium-screen">${sighting.color}</td>
                <td class="actions-cell">
                    <button class="view-details-btn" data-id="${sighting.id}">Ver detalles</button>
                    <button class="delete-btn" data-id="${sighting.id}">X</button>
                    <button class="maps-btn"><img src="static/img/map.svg"/></button>
                </td>
            `;
            tbody.appendChild(row);
        });

        elements.sightingsList.innerHTML = '';
        elements.sightingsList.appendChild(table);

        setupTableEventListeners(table);
    }

    function renderPagination(currentPage, totalPages) {
        const paginationControls = document.createElement('div');
        paginationControls.classList.add('pagination-controls');
        paginationControls.innerHTML = `
            <button class="prev-page" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Anterior</button>
            <span>Página ${currentPage} de ${totalPages}</span>
            <button class="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente &raquo;</button>
        `;

        elements.paginationContainer.innerHTML = '';
        elements.paginationContainer.appendChild(paginationControls);

        paginationControls.querySelector('.prev-page').addEventListener('click', () => {
            if (currentPage > 1) {
                sightingsCurrentPage--;
                loadAndDisplaySightings();
            }
        });

        paginationControls.querySelector('.next-page').addEventListener('click', () => {
            if (currentPage < totalPages) {
                sightingsCurrentPage++;
                loadAndDisplaySightings();
            }
        });
    }

    function setupTableEventListeners(table) {
        table.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', () => {
                const sighting = getSightingById(button.getAttribute('data-id'));
                if (sighting) {
                    showObservationsModal(sighting);
                }
            });

        });

        table.querySelectorAll('.delete-btn').forEach(button => {
            if (!button.disabled) {
                button.addEventListener('click', async (event) => {
                    const id = event.target.getAttribute('data-id');
                    const deleted = await deleteSighting(id);
                    if (deleted) {
                        event.target.closest('tr').remove();
                    }
                });
            }
        });

        document.querySelectorAll('.maps-btn').forEach(mapButton => {
            mapButton.addEventListener('click', (event) => {
                // Buscar el <tr> más cercano al botón
                const row = mapButton.closest('tr');
                
                // Obtener el identificador desde el atributo data-id de la fila
                const recordId = row.getAttribute('data-id');
                
                // Redirigir a index.html y enviar el identificador como parámetro
                window.location.href = `index.html?sighting=${recordId}`;
            });
        });

        table.querySelectorAll('.sightings-table th').forEach(header => {
            header.addEventListener('click', () => handleSort(header));
        });
    }

    function handleSort(header) {
        const currentSort = header.getAttribute('data-sort');
        const sortIcon = header.querySelector('img');
        let newSort;
        switch (currentSort) {
            case 'asc':
                newSort = 'desc';
                sortIcon.src = 'static/img/angles-down.svg';
                sortIcon.style.padding = '0';
                break;
            case 'desc':
                newSort = 'none';
                sortIcon.src = 'static/img/angles-up-down.svg';
                sortIcon.style = '';
                break;
            default:
                newSort = 'asc';
                sortIcon.src = 'static/img/angles-up.svg';
                sortIcon.style.padding = '0';
        }
        header.setAttribute('data-sort', newSort);
        // TODO: Implement actual sorting logic
    };

    // Utility functions
    function checkPermissionsAndDisableDeleteButtons() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.permissions && user.permissions.deleteSightings === false) {
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.style.backgroundColor = 'gray';
                button.style.cursor = 'not-allowed';
                button.disabled = true;
            });
        }
    };

    function getSightingById(id) {
        const sightings = JSON.parse(localStorage.getItem("sightings") || "[]")
        return sightings.find((sighting) => sighting.id === Number.parseInt(id, 10))
    }

    function adjustColumnsForSmallScreens() {
        const isSmallScreen = window.innerWidth <= 768
        const tableRows = document.querySelectorAll(".sightings-table tbody tr")
    
        tableRows.forEach((row) => {
          row.classList.toggle("small-screen", isSmallScreen)
          const cells = row.querySelectorAll("td")
          cells.forEach((cell, index) => {
            if (isSmallScreen) {
              cell.style.display =
                index === 1 || index === 2 || index === 3 || cell.classList.contains("actions-cell") ? "flex" : "none"
            } else {
              cell.style.display = ""
            }
          })
        })
    }

    // Función para verificar permisos y deshabilitar botones de eliminación si es necesario
    function checkPermissionsAndDisableDeleteButtons() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.permissions && user.permissions.deleteSightings === false) {
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.style.backgroundColor = 'gray';
                button.style.cursor = 'not-allowed';
                button.disabled = true;
            });
        }
    }

    // Initialization
    async function init() {
        setupEventListeners();
        await reloadUserProfile();
        const userProfile = JSON.parse(localStorage.getItem("user"));
        const userPermissions = userProfile.permissions || {};
        showNavItems(userPermissions);
        await loadAndDisplaySightings();
    };

    // Public API
    return {
        init: init
    };

})();

document.addEventListener('DOMContentLoaded', SightingsApp.init);

// API calls
async function loadSightings({ page, limit = 10, search = '' }) {
    try {
        const url = `/api/sightings?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
        const response = await customFetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('Failed to load sightings');
        }
    } catch (err) {
        console.error('Error al conectar con el servidor:', err);
        throw err;
    }
}

async function deleteSighting(id) {
    try {
        const response = await customFetch(`/api/sightings/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        return true;
    } catch (err) {
        console.error('Error al eliminar el avistamiento:', err);
        return false;
    }
}