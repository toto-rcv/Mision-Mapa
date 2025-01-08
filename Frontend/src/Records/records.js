import { loadUserProfile } from '/utils/profile.js';
loadUserProfile();
import { customFetch } from '../utils/auth.js';

import { toProperCase } from '../utils/utils.js';

document.addEventListener('DOMContentLoaded', loadSightings);

async function loadSightings() {
    try {
        const response = await customFetch('/api/sightings', {
            method: 'GET'
        });

        if (response.ok) {
            const sightings = await response.json();
            displaySightings(sightings);
        } else {
            const error = await response.json();
            console.error('Error:', error.message);
        }
    } catch (err) {
        console.error('Error al conectar con el servidor:', err);
    }
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



// Función para mostrar los avistamientos en la tabla
// Función para mostrar los avistamientos en la tabla
function displaySightings(sightings) {
    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = ''; // Clear any existing content

    // Crear y agregar el input de búsqueda
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.id = 'search';
    searchInput.placeholder = 'Buscar Avistamientos';
    searchInput.classList.add('search-input');
    mapContainer.appendChild(searchInput);

    const table = document.createElement('table');
    table.classList.add('sightings-table');

    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>#</th>
            <th>Fecha</th>
            <th class="ubicacion-cell">Ubicacion</th>
            <th>Creado por</th>
            <th>Latitud</th>
            <th>Longitud</th>
            <th>Rumbo</th>
            <th>Altitud Est.</th>
            <th>Tipo de Aeronave</th>
            <th>Color</th>
            <th class="columna_inexistente"></th>
            <th>Acciones</th>
        </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    mapContainer.appendChild(table);

    let currentPage = 1;
    const sightingsPerPage = 9;

    function renderTable(filteredSightings) {
        const totalPages = Math.ceil(filteredSightings.length / sightingsPerPage);
        const start = (currentPage - 1) * sightingsPerPage;
        const end = start + sightingsPerPage;
        const sightingsToDisplay = filteredSightings.slice(start, end);

        tbody.innerHTML = ''; // Clear existing rows
        sightingsToDisplay.forEach(sighting => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sighting.id}</td>
                <td>${formatDate(new Date(sighting.fecha_avistamiento))}</td>
                <td class="ubicacion-cell">${sighting.ubicacion}</td>
                <td>${toProperCase(sighting.usuario.firstName)} ${toProperCase(sighting.usuario.lastName)}</td>
                <td>${sighting.latitud}</td>
                <td>${sighting.longitud}</td>
                <td>${sighting.rumbo}</td>
                <td>${sighting.altitud_estimada}</td>
                <td>${sighting.tipo_aeronave}</td>
                <td>${sighting.color}</td>
                <td class="columna_inexistente"></td>
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

        });

        // Add pagination controls
        const paginationControls = document.createElement('div');
        paginationControls.classList.add('pagination-controls');
        paginationControls.innerHTML = `
            <button class="prev-page" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Anterior</button>
            <span>Página ${currentPage} de ${totalPages}</span>
            <button class="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente &raquo;</button>
        `;
        mapContainer.appendChild(paginationControls);

        // Add event listeners for pagination buttons
        document.querySelector('.prev-page').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable(filteredSightings);
            }
        });

        document.querySelector('.next-page').addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable(filteredSightings);
            }
        });

    }

    // Inicialmente renderizar todos los avistamientos
    renderTable(sightings);

    // Agregar evento input para filtrar los avistamientos
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredSightings = sightings.filter(sighting => {
            const ubicacionMatch = sighting.ubicacion && sighting.ubicacion.toLowerCase().includes(searchTerm);
            const creadoPorMatch = sighting.usuario &&
                (`${sighting.usuario.firstName} ${sighting.usuario.lastName}`).toLowerCase().includes(searchTerm);
            return ubicacionMatch || creadoPorMatch;
        });
        renderTable(filteredSightings);
    });



    checkPermissionsAndDisableDeleteButtons();

    // Agregar manejadores de eventos para los botones de eliminación
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
}


function formatDate(date) {
    const formattedDate = new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
    }).format(date).replace('.', '');

    const formattedTime = new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);

    return `${formattedDate}<br>${formattedTime}`;
}

function updateMarkersCount(count) {
    const markersCountSpan = document.querySelector('.markers-count');
    markersCountSpan.textContent = `${count} marcadores`;
}


function showObservationsModal(sighting) {
    const modal = document.getElementById('observations-modal');
    document.getElementById('modal-observaciones').value = sighting.observaciones || 'N/A';
    document.getElementById('modal-tipo-motor').value = sighting.tipo_motor || 'N/A';
    document.getElementById('modal-cantidad-motores').value = sighting.cantidad_motores || 'N/A';

    modal.style.display = 'block';

    // Cerrar el modal cuando se hace clic en el botón de cerrar
    document.getElementById('close-observations-modal').onclick = function () {
        modal.style.display = 'none';
    };

    // Cerrar el modal cuando se hace clic fuera del contenido del modal
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}
