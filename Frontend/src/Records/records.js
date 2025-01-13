import { loadUserProfile } from '/utils/profile.js';
loadUserProfile();
import { customFetch } from '../utils/auth.js';

import { toProperCase } from '../utils/utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    const modal = document.getElementById('observations-modal');
    const closeButton = document.getElementById('close-observations-modal');
    const modalContent = modal.querySelector('.modal-content');
    const limit = 10;

    let currentSearch = '';
    let sightingsCurrentPage = 1;
    let touchStartY = 0;
    let touchEndY = 0;

    function handleTouchStart(e) {
        touchStartY = e.touches[0].clientY;
    }

    function handleTouchMove(e) {
        if (!modal.classList.contains('active')) return;

        touchEndY = e.touches[0].clientY;
        const diffY = touchEndY - touchStartY;
        if (diffY > 0) {
            e.preventDefault();
            modalContent.style.transform = `translateY(${diffY}px)`;
            modalContent.style.transition = 'none';
        }
    }

    function handleTouchEnd() {
        if (!modal.classList.contains('active')) return;

        const diffY = touchEndY - touchStartY;
        modalContent.style.transform = '';
        modalContent.style.transition = '';

        if (diffY > 100) {
            closeModal();
        } else {
            modalContent.style.transform = 'translateY(0)';
        }
    }

    modalContent.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    function showObservationsModal(sighting) {

        document.getElementById('modal-observaciones').value = sighting.observaciones || 'N/A';
        document.getElementById('modal-tipo-motor').value = sighting.tipo_motor || 'N/A';
        document.getElementById('modal-cantidad-motores').value = sighting.cantidad_motores || 'N/A';
        document.getElementById('modal-color').value = sighting.color || 'N/A';
        document.getElementById('modal-rumbo').value = sighting.rumbo || 'N/A';
        document.getElementById('modal-coordenadas').value = `[${sighting.latitud},${sighting.longitud}]` || 'N/A';
        document.getElementById('modal-tipo-aeronave').value = sighting.tipo_aeronave || 'N/A';
        document.getElementById('modal-altitud').value = sighting.altitud_estimada || 'N/A';



        modal.offsetHeight;
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        closeButton.focus();

        window.location.hash = 'modal-open';

    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';

        if (window.location.hash === '#modal-open') {
            history.back();
        }
    }

    function handleHashChange() {
        if (window.location.hash !== '#modal-open') {
            closeModal();
        }
    }
    // Cerrar el modal cuando se hace clic en el botón de cerrar
    closeButton.onclick = function (e) {
        e.preventDefault();
        closeModal();
    };

    // Cerrar el modal cuando se hace clic fuera del contenido del modal
    window.addEventListener('hashchange', handleHashChange);
    const searchInput = document.getElementById('search');

    // Agregar evento input para filtrar los avistamientos
    searchInput.addEventListener('input', debounce(() => {
        const search = searchInput.value.trim().toLowerCase();
        sightingsCurrentPage = 1;
        currentSearch = search; // Reiniciar la paginación
        loadAndDisplaySightings();
        console.log('search', search);
    }), 300);
    // Función para mostrar los avistamientos en la tabla
    function displaySightings(sightings) {
        renderTable(sightings);


        checkPermissionsAndDisableDeleteButtons();
    }

    function renderTable(filteredSightings) {
        const sightingsList = document.getElementById('sightings-list');

        sightingsList.innerHTML = ''; // Clear any existing content

        const table = document.createElement('table');
        table.classList.add('sightings-table');

        const thead = document.createElement('thead');
        thead.innerHTML = `
        <tr>
            <th>#</th>
            <th class="col-ws">Fecha</th>
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
    `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        table.appendChild(tbody);
        sightingsList.appendChild(table);

        tbody.innerHTML = ''; // Clear existing rows
        filteredSightings.forEach(sighting => {
            const row = document.createElement('tr');
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
            </td>
        `;
            tbody.appendChild(row);

            // Add event listener for "Ver detalles" button
            row.querySelector('.view-details-btn').addEventListener('click', () => {
                showObservationsModal(sighting);
            });

            document.querySelectorAll('.delete-btn').forEach(button => {
                if (!button.disabled) {
                    button.addEventListener('click', async (event) => {
                        const id = event.target.getAttribute('data-id');
                        const deleted = await deleteSighting(id);
                        if (deleted) {
                            // Actualizar la tabla

                            event.target.closest('tr').remove();
                            updateMarkersCount(document.querySelectorAll('.sightings-table tbody tr').length);
                        }
                    });
                }
            });
        });

        adjustColumnsForSmallScreens();
    }



    function renderPagination(currentPage, totalPages) {
        // Add pagination controls
        const sightingsPaginationContainer = document.getElementById('sightings-pagination');
        const existingPaginationControls = document.querySelector('.pagination-controls');

        if (existingPaginationControls) {
            existingPaginationControls.remove();
        }

        const paginationControls = document.createElement('div');
        paginationControls.classList.add('pagination-controls');
        paginationControls.innerHTML = `
          <button class="prev-page" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Anterior</button>
          <span>Página ${currentPage} de ${totalPages}</span>
          <button class="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente &raquo;</button>
      `;

        sightingsPaginationContainer.appendChild(paginationControls);

        // añade evento de boton para la paginacion
        paginationControls.querySelector('.prev-page').addEventListener('click', async () => {
            if (currentPage > 1) {
                sightingsCurrentPage--;
                await loadAndDisplaySightings();
            }
        });

        paginationControls.querySelector('.next-page').addEventListener('click', async () => {
            console.log(sightingsCurrentPage, currentPage, totalPages);
            if (currentPage < totalPages) {
                sightingsCurrentPage++;
                await loadAndDisplaySightings();
            }
        });
    }


    async function loadAndDisplaySightings() {
        const data = await loadSightings({ page: sightingsCurrentPage, search: currentSearch });
        if (data) {
            console.log(data);
            const { sightings, currentPage, totalPages } = data;
            displaySightings(sightings);
            renderPagination(currentPage, totalPages);
        }
    }

    await loadAndDisplaySightings();


});

async function loadSightings({ page, limit = 10, search = '' }) {

    try {
        const url = `/api/sightings?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
        console.log('page', page);
        const response = await customFetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (response.ok) {
            const { sightings, currentPage, totalPages } = await response.json();
            return { sightings, currentPage, totalPages };
        } else {
            const error = await response.json();
            console.error('Error:', error.message);
        }
    } catch (err) {
        console.error('Error al conectar con el servidor:', err);
    }
    return null;
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

// Función para eliminar un avistamiento
async function deleteSighting(id) {
    try {
        const response = await fetch(`/api/sightings/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Error:', error.message);
            return false
        }
    } catch (err) {
        console.error('Error al conectar con el servidor:', err);
        return false
    }
    return true
}

function formatDate(date) {
    const day = date.getDate(); // Día (1-31)
    const monthIndex = date.getMonth(); // Mes (0-11)
    const year = date.getFullYear(); // Año (4 dígitos)
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    const formattedDate = `${day}/${months[monthIndex]}/${year}`
    const formattedTime = new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);

    return `${formattedDate} ${formattedTime}`;
}

function adjustColumnsForSmallScreens() {
    const isSmallScreen = window.innerWidth <= 768;
    const tableRows = document.querySelectorAll('.sightings-table tbody tr');

    tableRows.forEach(row => {
        if (isSmallScreen) {
            row.classList.add('small-screen');
        } else {
            row.classList.remove('small-screen');
        }

        const cells = row.querySelectorAll('td');
        cells.forEach((cell, index) => {
            // Solo Fecha, Ubicacion, Rumbo, Altitud Estimada, Tipo de Aeronave y botones de acciones
            if (isSmallScreen) {
                if (index !== 1 && index !== 3 && index !== 2 && !cell.classList.contains('actions-cell')) {
                    cell.style.display = 'none';
                } else {
                    cell.style.display = 'flex';
                }
            } else {
                cell.style.display = '';
            }
        });
    });

}

window.addEventListener('resize', adjustColumnsForSmallScreens);



// Función de debounce
const debounce = (fn, delay = 1000) => {
    let timerId = null;
    return (...args) => {
        clearTimeout(timerId);
        timerId = setTimeout(() => fn(...args), delay);
    };
};