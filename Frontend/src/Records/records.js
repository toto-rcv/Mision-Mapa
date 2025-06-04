import { reloadUserProfile } from '/utils/profile.js';
import { customFetch } from '../utils/auth.js';
import { showNavItems } from '/static/js/navigation.js';
import { toProperCase, debounce, formatDateTime } from '../utils/utils.js';



const SightingsApp = (function () {
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
        paginationContainer: document.getElementById('sightings-pagination'),
        filterByDateButton: document.getElementById('filterByDate'),
        dateFilterModal: document.getElementById('date-filter-modal'),
        closeDateFilterModalButton: document.getElementById('close-date-filter-modal'),
        applyDateFilterButton: document.getElementById('applyDateFilter'),
        clearDateFilterButton: document.getElementById('clearDateFilter'),
        startDateInput: document.getElementById('start-date'),
        endDateInput: document.getElementById('end-date')
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
        elements.filterByDateButton.addEventListener('click', openDateFilterModal);
        elements.closeDateFilterModalButton.addEventListener('click', closeDateFilterModal);
        elements.applyDateFilterButton.addEventListener('click', applyDateFilter);
        elements.clearDateFilterButton.addEventListener('click', clearDateFilter);
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
        if (!sighting) {
            console.error('No se encontró el avistamiento');
            return;
        }

        const modalMapping = {
            observaciones: 'modal-observaciones',
            tipo_motor: 'modal-tipo-motor',
            cantidad_motores: 'modal-cantidad-motores',
            color: 'modal-color',
            rumbo: 'modal-rumbo',
            tipo_aeronave: 'modal-tipo-aeronave',
            altitud_estimada: 'modal-altitud'
        };

        // Actualizar estado de verificación
        const estadoVerificacion = document.getElementById('modal-estado-verificacion');
        estadoVerificacion.textContent = sighting.estado_verificacion || 'NO_VERIFICADO';
        estadoVerificacion.className = `badge-estado ${sighting.estado_verificacion === 'VERIFICADO' ? 'verificado' : 'no-verificado'}`;

        Object.entries(modalMapping).forEach(([propiedad, modalId]) => {
            document.getElementById(modalId).value = sighting[propiedad] || 'N/A';
        });
        document.getElementById('modal-coordenadas').value = `[${sighting.latitud}, ${sighting.longitud}]`;

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
                // Solo guardar si el usuario está autenticado
                const accessToken = localStorage.getItem("accessToken");
                if (accessToken) {
                    localStorage.setItem("sightings", JSON.stringify(sightings));
                } else {
                    localStorage.removeItem("sightings");
                }
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
                    <th class="col-ws fecha-header">Fecha</th>
                    <th class="col-medium-screen">Lugar de envío</th>
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
                <td data-label="Fecha" class="col-ws">${formatDateTime(new Date(sighting.fecha_avistamiento))}</td>
                <td data-label="Lugar de envío" class="col-medium-screen">${sighting.current_location}</td>
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
            <button class="prev-page" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
            <span class="spanpageNumber">Página ${currentPage} de ${totalPages}</span>
            <button class="next-page" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
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




        let sightingIdToDelete = null; // Variable global para almacenar el avistamiento a eliminar

        document.querySelectorAll('.delete-btn').forEach(button => {
            if (!button.disabled) {
                button.addEventListener('click', (event) => {
                    sightingIdToDelete = event.target.getAttribute('data-id'); // Guarda el ID del avistamiento

                    const modal = document.getElementById("modal-confirm-delete");

                    // Muestra el modal
                    modal.style.display = "block";
                });
            }
        });
        // Evento para confirmar la eliminación cuando se presiona "Sí"
        document.getElementById("confirmDelete").addEventListener('click', async () => {
            if (sightingIdToDelete) {
                const deleted = await deleteSighting(sightingIdToDelete);
                if (deleted) {
                    document.querySelector(`[data-id='${sightingIdToDelete}']`).closest('tr').remove();
                } else {
                    alert("Error al eliminar el avistamiento.");
                }

                sightingIdToDelete = null; // Limpiar variable
                document.getElementById("modal-confirm-delete").style.display = "none"; // Ocultar modal
            }
        });


        // Evento para cancelar la eliminación
        document.getElementById("cancelDelete").addEventListener('click', () => {
            sightingIdToDelete = null;
            const modal = document.getElementById("modal-confirm-delete");
            // Muestra el modal
            modal.style.display = "none";
        });

        document.getElementById('generarPDF').replaceWith(document.getElementById('generarPDF').cloneNode(true));

        document.getElementById('generarPDF').addEventListener('click', async function () {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape', format: [330, 215] });

            const searchQuery = document.getElementById('search').value.trim();
            const allSightings = await fetchAllSightings(searchQuery);

            const head = [[
                'Avist',
                'Creador',
                'Fecha',
                'Ubicacion',
                'Lat./Lon',
                'Rumbo',
                'Alt. Est.',
                'T.Aeronave',
                'Color',
                'T.Motor',
                'Cant. Motores',
                'Observaciones'
            ]];

            const body = allSightings.map(sighting => [
                sighting.id,
                `${toProperCase(sighting.usuario.powerMilitary || '')} ${toProperCase(sighting.usuario.militaryRank || '')} ${toProperCase(sighting.usuario.firstName || '')} ${toProperCase(sighting.usuario.lastName || '')}`,
                formatDateTime(new Date(sighting.fecha_avistamiento)),
                sighting.ubicacion,
                `${sighting.latitud}\n${sighting.longitud}`,
                sighting.rumbo,
                sighting.altitud_estimada,
                sighting.tipo_aeronave,
                sighting.color,
                sighting.tipo_motor,
                sighting.cantidad_motores,
                sighting.observaciones,
            ]);

            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 10;
            const title = "Avistamientos";
            const titleYPosition = 15;  // Posición vertical para el título
            const tableMarginBottom = 10;  // Margen de 10px entre título y tabla

            // Solo agregar el título en la primera página
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(title, pageWidth / 2, titleYPosition, { align: "center" });

            // Definir el inicio de la tabla en la primera página
            let tableStartY = titleYPosition + tableMarginBottom;

            doc.autoTable({
                head: head,
                body: body,
                startY: tableStartY,  // Ajusta la posición de inicio de la tabla
                margin: { left: margin, right: margin },
                tableWidth: pageWidth - margin * 2,
                styles: { fontSize: 10 },
                headStyles: { fillColor: [22, 100, 133] },
                rowPageBreak: 'avoid',
                columnStyles: {
                    1: { cellWidth: 28 },
                    3: { cellWidth: 45 },
                    5: { halign: 'center' }, // Centrar "Rumbo"
                    6: { halign: 'center' }, // Centrar "Alt. Est."
                    7: { halign: 'center' }, // Centrar "T.Aeronave"
                    8: { halign: 'center' }, // Centrar "Color"
                    9: { halign: 'center' }, // Centrar "T.Motor"
                    10: { halign: 'center' }, // Centrar "Cant. Motores" },
                },
                didDrawPage: function (data) {
                    // No dibujar el título en las páginas siguientes
                    if (data.pageCount === 1) {
                        // Solo agregar el título en la primera página
                        doc.setFontSize(16);
                        doc.setFont("helvetica", "bold");
                        doc.text(title, pageWidth / 2, titleYPosition, { align: "center" });
                    }

                    // Asegurar que la tabla comience con el margen de 10px en cada página
                    data.settings.startY = titleYPosition + tableMarginBottom;
                }
            });

            // Obtener fecha y hora formateada desde la función importada
            const now = new Date();
            const timestamp = formatDateTime(now)
                .replace(' ', ' -- ')   // Reemplaza espacio entre fecha y hora con ' -- '
                .replace(':', '-')     // Reemplaza ':' entre hora y minutos con '-'
                .replace(/\//g, '-');   // Reemplaza '/' por '-'

            // Nombre del archivo con fecha y hora
            const fileName = `Tabla_de_Avistamientos_${timestamp}.pdf`;

            doc.save(fileName);
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


    }

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

    // Función para obtener todos los avistamientos recorriendo las páginas
    async function fetchAllSightings(search = '') {
        let allSightings = [];
        let page = 1;
        let totalPages = 1;
        do {
            const data = await loadSightings({ page, limit: 10, search });
            allSightings = allSightings.concat(data.sightings);
            totalPages = data.totalPages;
            page++;
        } while (page <= totalPages);
        return allSightings;
    }

    function getSightingById(id) {
        const accessToken = localStorage.getItem("accessToken");
        if (!accessToken) {
            return null;
        }
        const sightings = JSON.parse(localStorage.getItem("sightings") || "[]");
        return sightings.find((sighting) => sighting.id === Number.parseInt(id, 10));
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

    function openDateFilterModal() {
        elements.dateFilterModal.classList.add('active');
        elements.dateFilterModal.setAttribute('aria-hidden', 'false');
        elements.closeDateFilterModalButton.focus();
    }

    function closeDateFilterModal() {
        elements.dateFilterModal.classList.remove('active');
        elements.dateFilterModal.setAttribute('aria-hidden', 'true');
    }

    function applyDateFilter() {
        const startDate = elements.startDateInput.value;
        const endDate = elements.endDateInput.value;
        if (startDate && endDate) {
            const formattedStartDate = `${startDate}T00:00:00`;
            const formattedEndDate = `${endDate}T23:59:59`;
            currentSearch = `date:${formattedStartDate},${formattedEndDate}`;
            sightingsCurrentPage = 1;
            loadAndDisplaySightings();
            closeDateFilterModal();
        } else {
            alert('Por favor, seleccione ambas fechas.');
        }
    }

    function clearDateFilter() {
        elements.startDateInput.value = '';
        elements.endDateInput.value = '';
        currentSearch = '';
        sightingsCurrentPage = 1;
        loadAndDisplaySightings();
        closeDateFilterModal();
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


function actualizarAlturaViewport() {
    // Si está disponible, usa visualViewport.height; de lo contrario, usa innerHeight
    const alturaVisible = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${alturaVisible * 0.01}px`);
}

// Actualiza la altura al cargar y al redimensionar
actualizarAlturaViewport();
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', actualizarAlturaViewport);
}

window.addEventListener('resize', actualizarAlturaViewport);