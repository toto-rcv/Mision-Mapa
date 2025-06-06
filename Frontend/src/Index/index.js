import { reloadUserProfile, getUserId } from '/utils/profile.js';
import { customFetch } from '/utils/auth.js';
import { showNavItems, setSidebarItemsListeners } from '/static/js/navigation.js';
import getSocketClient from '/utils/socket.js';
import { initMap, addMarker, updateGreyMarker, removeGreyMarker, reverseGeocode, getMarkers, setMarkerColor, clearAllMarkers, adjustMapViewToMarker, getLatLngFromMarker, staggerMarkers } from '/mapModule.js';
import { formatDNI, formatDateTime } from '/utils/utils.js';

// Initialize UI elements
const closeFormButton = document.getElementById('close-form');
const cancelButton = document.getElementById('cancel-button');

let greyMarker, isOverlayActive = false, isFormActive = false, lat = null, lng = null, currentLocation = null;
let formEditMode = false;

let minTimestamp, maxTimestamp;

let currentFilters = {
    startDate: null,
    endDate: null,
    statuses: ['pending', 'validated'],
    userIds: []
};

let userId;

// DOM elements
const elements = {
    sideBarItems: document.querySelectorAll('.sidebar-item'),
    mapContainer: document.getElementById("map"),
    registerButton: document.getElementById("register-button"),
    overlay: document.getElementById("new-sighting-overlay"),
    formPanel: document.getElementById("sighting-form"),
    closeFormButton: document.getElementById("close-form"),
    cancelButton: document.getElementById("cancel-button"),
    inputs: document.querySelectorAll("#sighting-form input, #sighting-form select, #sighting-form textarea"),
    searchInput: document.querySelector(".search-input"),
    zoomInButton: document.querySelector("#zoom-in"),
    zoomOutButton: document.querySelector("#zoom-out"),
    quantityMarkersModal: document.getElementById("markerAlert"),

    filterButton: document.getElementById("toggle-filters"),
    filtersPanel: document.getElementById("filters-panel"),
    filtersCloseButton: document.getElementById("close-filters-form"),
    statusButtons: document.querySelectorAll(".status-btn"),
    startDateInput: document.getElementById("start-date"),
    endDateInput: document.getElementById("end-date"),
    filtersClearButton: document.querySelector(".btn-clear"),
    quickDateButtons: document.querySelectorAll('.quick-date'),
    userFilter: document.getElementById('user-filter'),
    applyFiltersButton: document.querySelector('.btn-apply'),
};

// Inicializar mapa
const map = initMap(elements.mapContainer);

function validateField(input) {
    if (!input.required) {
        return;
    }
    if (input.validity.valid) {
        input.classList.remove('invalid');
    } else {
        input.classList.add('invalid');
    }
}

function validateObservations(input) {
    const length = input.value.length;
    if (length > 250) {
        input.setCustomValidity('Las observaciones no deben exceder los 250 caracteres');
        input.classList.add('invalid');
    } else {
        input.setCustomValidity('');
        input.classList.remove('invalid');
    }
}

function validateOnBlur(input, validationFunction) {
    input.addEventListener('blur', () => {
        validationFunction(input);
    });
}

elements.inputs.forEach(input => {
    if (input.id === 'observations') {
        validateOnBlur(input, validateObservations);
        input.addEventListener('input', () => validateObservations(input));
    } else {
        validateOnBlur(input, validateField);
    }
});

function showOverlay() {
    elements.overlay.style.display = 'flex';
    elements.overlay.style.transform = 'translateY(0)';
    isOverlayActive = true;

    hideForm();
}

function hideOverlay() {
    elements.overlay.style.transform = 'translateY(100%)';
    elements.overlay.style.display = 'none';
    isOverlayActive = false;
}

function showForm(editMode = false) {
    elements.formPanel.querySelector('.form-title').textContent = editMode ? 'Registrar avistamiento' : 'Detalle de avistamiento';
    elements.formPanel.classList.add('visible');
    isFormActive = true;
    formEditMode = editMode;
}

function hideForm() {
    formEditMode = false;

    elements.formPanel.classList.remove('visible');
    isFormActive = false;
}


function hideNotificationOverlay() {
    elements.quantityMarkersModal.style.display = 'none';
};

function showNotificationOverlay() {
    elements.quantityMarkersModal.style.display = 'block';
}

function formatCoordinates(value) {
    return Number(value).toFixed(6);
}

// Event Listeners
elements.registerButton.addEventListener('click', async () => {
    await clearFilters();
    hideNotificationOverlay();
    showOverlay();
});

closeFormButton.addEventListener('click', () => {
    hideForm();
    removeGreyMarker();
    updateRedMarkersModal();
});

cancelButton.addEventListener('click', () => {
    hideForm();
    removeGreyMarker();
    updateRedMarkersModal();
});

elements.filterButton.addEventListener("click", function () {
    elements.filtersPanel.classList.toggle("active");
    elements.filterButton.classList.toggle("active");
});

elements.filtersCloseButton.addEventListener("click", function () {
    elements.filtersPanel.classList.remove("active");
    elements.filterButton.classList.remove("active");
});

elements.statusButtons.forEach(btn => {
    btn.addEventListener("click", function () {
        const statusValue = btn.getAttribute("data-value");
        if (btn.classList.contains("active")) {
            // Si ya está activo, se desactiva
            btn.classList.remove("active");
            currentFilters.statuses = currentFilters.statuses.filter(s => s !== statusValue);
        } else {
            // Se activa el botón y se agrega el valor al arreglo
            btn.classList.add("active");
            currentFilters.statuses.push(statusValue);
        }
    });
});

elements.startDateInput.addEventListener("change", function () {
    currentFilters.startDate = elements.startDateInput.value ? new Date(elements.startDateInput.value) : null;
});

elements.endDateInput.addEventListener("change", function () {
    currentFilters.endDate = elements.endDateInput.value ? new Date(elements.endDateInput.value) : null;
});

elements.filtersClearButton.addEventListener("click", clearFilters);

elements.quickDateButtons.forEach(btn => {
    btn.addEventListener("click", function () {

        btn.classList.add("clicked");
        // Remueve la clase después de la duración de la animación (300ms)
        setTimeout(() => {
            btn.classList.remove("clicked");
        }, 300);

        animateShrink(elements.startDateInput);
    })
})

elements.userFilter.addEventListener('click', toggleUserMultiSelect);

setSidebarItemsListeners(elements.sideBarItems);

// Handle map clicks
map.on('click', function (e) {
    let formEditable = isFormActive && formEditMode;
    if (isOverlayActive || formEditable) {
        lat = formatCoordinates(e.latlng.lat);
        lng = formatCoordinates(e.latlng.lng);
        const timestamp = new Date().toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        currentLocation = '';
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async position => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                currentLocation = `${latitude},${longitude}`;
                document.getElementById('current_location').textContent = currentLocation;
            })
        }

        // Update coordinates in the form
        document.getElementById('coordinateLog').textContent = lng;
        document.getElementById('coordinateLat').textContent = lat;
        document.getElementById('current_location').textContent = current_location;

        // Update timestamp
        const timestampElement = document.querySelector('.timestamp');
        timestampElement.textContent = timestamp;

        updateGreyMarker(e.latlng);

        if (formEditable) {
            let { percentage, direction } = calculateMarkerPositionPercentage();
            adjustMapViewToMarker(e.latlng, percentage, direction);
        }


        // Perform reverse geocoding
        reverseGeocode(lat, lng).then(address => {
            if (address) {
                document.getElementById('location').value = address;
            }
        });

        if (isOverlayActive) {
            hideOverlay();
            showForm(true);

            let { percentage, direction } = calculateMarkerPositionPercentage();
            adjustMapViewToMarker(e.latlng, percentage, direction);

            const cancelButton = document.getElementById('cancel-button');
            const saveButton = document.getElementById('save-button');
            clearForm();

            if (cancelButton) {
                cancelButton.style.display = 'block';
            }

            if (saveButton) {
                saveButton.style.display = 'block';
            }

        }
    }

});

function validateForm() {
    const form = elements.formPanel;
    const inputs = form.querySelectorAll('input, select, textarea');
    let isValid = true;

    inputs.forEach(input => {
        if (input.required || input.value.trim() !== '') {
            validateField(input);
        }
        if (input.required && !input.validity.valid) {
            isValid = false;
        }
    });

    return isValid;
}

// Form validation and submission
elements.formPanel.addEventListener('submit', async function (e) {
    e.preventDefault();

    const isValid = validateForm();

    if (isValid) {
        const form = elements.formPanel;
        const saveButton = document.getElementById('save-button');
        
        // Change button appearance
        saveButton.style.backgroundColor = '#4CAF50';
        saveButton.textContent = 'Enviando marcador';
        saveButton.disabled = true;

        // Captura los datos del formulario primero
        const formData = {
            fecha_avistamiento: new Date().toISOString(),
            ubicacion: document.getElementById('location').value,
            latitud: lat,
            longitud: lng,
            altitud_estimada: document.getElementById('estimated-height').value,
            rumbo: document.getElementById('heading').value,
            tipo_aeronave: document.getElementById('aircraft-type').value,
            observaciones: document.getElementById('observations').value,
            // Usar las coordenadas del marcador como ubicación por defecto
            current_location: `${lat},${lng}`
        };

        // Campos opcionales con validaciones adicionales
        const optionalFields = [
            { id: 'engine-type', key: 'tipo_motor' },
            { id: 'engine-count', key: 'cantidad_motores', parse: parseInt },
            { id: 'color', key: 'color' },
        ];

        optionalFields.forEach(({ id, key, parse }) => {
            const value = document.getElementById(id).value;
            if (value) {
                formData[key] = parse ? parse(value) : value;
            }
        });

        try {
            let response = await customFetch('/api/sightings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const sighting = await response.json();
                
                // Verificar si se debe forzar el cierre de sesión
                if (sighting.forceLogout) {
                    // Limpiar el localStorage
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('user');
                    // Redirigir al login
                    window.location.href = '/login.html';
                    return;
                }

                addMarker(sighting.id, sighting, false, handleMarkerClick);
                updateRedMarkersModal();
                
                // Close the modal and reset the form
                hideForm();
                removeGreyMarker();
                clearForm();
            } else {
                const error = await response.json();
                console.error('Error:', error.message);
                alert('Error al guardar el avistamiento: ' + error.message);
            }
        } catch (err) {
            console.error('Error al conectar con el servidor:', err);
            alert('Error al conectar con el servidor. Por favor, intente nuevamente.');
        } finally {
            // Reset button appearance
            saveButton.style.backgroundColor = '';
            saveButton.textContent = 'Guardar avistamiento';
            saveButton.disabled = false;
        }
    }
});

document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach(input => {
    input.addEventListener('input', function () {
        if (this.value.trim()) {
            this.classList.remove('invalid');
        }
    });
});

// Initialize map controls
const zoomInButton = document.querySelector('#zoom-in');
const zoomOutButton = document.querySelector('#zoom-out');

zoomInButton.addEventListener('click', () => map.zoomIn());
zoomOutButton.addEventListener('click', () => map.zoomOut());

async function loadMarkers(filters = {}) {
    try {
        let url = '/api/sightings/all';
        const queryParams = new URLSearchParams();

        if (filters.startDate) {
            queryParams.append('startDate', filters.startDate.toISOString());
        }
        if (filters.endDate) {
            queryParams.append('endDate', filters.endDate.toISOString());
        }
        if (filters.statuses && filters.statuses.length) {
            queryParams.append('statuses', filters.statuses.join(','));
        }
        if (filters.userIds && filters.userIds.length) {
            queryParams.append('userIds', filters.userIds.join(','));
        }

        // Si se han agregado parámetros, se adjuntan a la URL
        if ([...queryParams].length) {
            url += `?${queryParams.toString()}`;
        }
        // Realiza una solicitud GET para obtener los datos de los avistamientos
        const response = await customFetch(url, { method: 'GET' });

        if (response.ok) {
            const { sightings } = await response.json();
            return sightings;
        } else {
            const error = await response.json();
            console.error('Error:', error.message);
        }
    } catch (err) {
        console.error('Error al conectar con el servidor:', err);
    }
    return null;
}

function loadUsers() {
    customFetch('/api/users/minimal')
        .then(response => response.json())
        .then(data => {

            const optionsList = document.getElementById('user-options-list');
            optionsList.innerHTML = ''; // Limpiar contenido previo

            data.users.forEach(user => {
                const label = document.createElement('label');
                label.classList.add('user-option');
                // Construir el contenido: checkbox + info del usuario
                label.innerHTML = `
            <input type="checkbox" value="${user.dni}" class="user-checkbox">
            <div class="user-info">
                <span class="user-militaryRank">${user.militaryRank}</span>
                <span class="user-fullname">${user.fullName} <span class="user-dni">(${formatDNI(user.dni)})</span>
                </span>
            </div>
          `;
                optionsList.appendChild(label);
            });

            // Asocia el evento change a cada checkbox
            document.querySelectorAll('.user-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', handleUserSelection);
            });
        })
        .catch(error => console.error('Error loading users:', error));
}

function updateMarkersCount(count) {
    const markersCountSpan = document.querySelector('.markers-count');
    markersCountSpan.textContent = `${count} marcadores`;
}

// Función para buscar la ubicación
async function buscarUbicacion(nombreLugar) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(nombreLugar)}&addressdetails=1`);
        let resultados = await response.json();
        resultados = resultados.filter(m => m.address.country === 'Argentina')

        if (resultados.length > 0) {
            const { lat, lon, addresstype } = resultados[0]; // Tomar el primer resultado
            let zoomLevel = 10; // Zoom predeterminado para lugares genéricos

            // Determinar el nivel de zoom según el tipo de lugar
            if (addresstype === 'city') {
                zoomLevel = 8; // Zoom más cercano para ciudades
            } else if (addresstype === "administrative" || addresstype === "country") {
                zoomLevel = 5; // Zoom para países
            } else if (addresstype === 'shop' || addresstype === 'village') {
                zoomLevel = 6; // Zoom para pueblos o aldeas
            } else if (addresstype === 'town' || addresstype === 'village') {
                zoomLevel = 12; // Zoom para pueblos o aldeas
            } else if (addresstype === 'state' || addresstype === 'village') {
                zoomLevel = 6; // Zoom para pueblos o aldeas
            }

            // Centrar el mapa y ajustar el zoom
            map.setView([lat, lon], zoomLevel);
        } else {
            alert('No se encontraron resultados para tu búsqueda.');
        }
    } catch (error) {
        console.error('Error al buscar la ubicación:', error);
        alert('Ocurrió un error al buscar la ubicación.');
    }
}

const debounce = (fn, delay = 1000) => {
    let timerId = null;
    let lastKey = null;
    let isBackspaceHeld = false;

    return (...args) => {
        const event = args[0];

        if (event && event.type === 'input' && event.inputType === 'deleteContentBackward') {
            if (lastKey === 'Backspace') {
                if (!isBackspaceHeld) {
                    isBackspaceHeld = true;
                    setTimeout(() => {
                        isBackspaceHeld = false;
                    }, delay);
                }
                return;
            }
            lastKey = 'Backspace';
        } else {
            lastKey = null;
        }

        clearTimeout(timerId);
        timerId = setTimeout(() => {
            if (!isBackspaceHeld) {
                fn(...args);
            }
        }, delay * 2);
    };
};

// Función debounced para buscar la ubicación
const debouncedBuscarUbicacion = debounce((event) => {
    const nombreLugar = event.target.value;
    if (nombreLugar.trim()) {
        buscarUbicacion(nombreLugar);
    }
}, 500);

async function setMarkerAsSeen(sightingId, authorId, currentUserId) {

    if (currentUserId === authorId) return;

    const marker = getMarkers().find(m => m.id === sightingId);
    if (marker) {
        setMarkerColor(marker.id, true)
        updateRedMarkersModal();
    }

    try {
        const response = await customFetch(`/api/sightings/${sightingId}/validate`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
    } catch (error) {
        console.error('Error al validar el avistamiento:', error);
    }
}

function placeMarkersOnMap(sightings) {
    clearAllMarkers();

    // Itera sobre los datos y agrega marcadores al mapa
    sightings.forEach((sighting, i) => {
        const { id, validador } = sighting;
        setTimeout(() => {
            addMarker(id, sighting, !!validador, handleMarkerClick);
        }, i * 30);

    });

    updateMarkersCount(sightings.length);
    updateRedMarkersModal();

}

function fillForm({ id, fecha_avistamiento, ubicacion, current_location, latitud, longitud, altitud_estimada, rumbo, tipo_aeronave, tipo_motor, cantidad_motores, color, observaciones, estado_verificacion }) {

    const form = elements.formPanel;

    form.querySelector("span.sighting-id").innerHTML = `AV-${String(id).padStart(5, '0')}`
    form.querySelector("span.timestamp").innerHTML = formatDateTime(new Date(fecha_avistamiento)) ?? 'No disponible'
    form.querySelector("span#coordinateLog").innerHTML = longitud
    form.querySelector("span#coordinateLat").innerHTML = latitud
    form.querySelector("span#current_location").innerHTML = current_location
    form.querySelector("input#location").value = ubicacion
    form.querySelector("select#estimated-height").value = altitud_estimada
    form.querySelector("select#heading").value = rumbo
    form.querySelector("input#aircraft-type").value = tipo_aeronave
    form.querySelector("select#engine-type").value = tipo_motor
    form.querySelector("select#engine-count").value = cantidad_motores
    form.querySelector("input#color").value = color
    form.querySelector("textarea#observations").value = observaciones

    // Update verification status
    const verificationStatus = form.querySelector("#form-verification-status");
    const userProfile = JSON.parse(localStorage.getItem("user"));
    console.log('User Profile:', userProfile); // Debug log
    const userRank = userProfile?.user?.userRank;
    console.log('User Rank:', userRank); // Debug log
    console.log('Is JEFE DE DETECCION:', userRank === 'JEFE DE DETECCION'); // Debug log
    console.log('Is SUPERVISOR:', userRank === 'SUPERVISOR'); // Debug log

    // Solo mostrar el estado de verificación para JEFE DE DETECCION, SUPERVISOR y ADMINDEVELOPER
    if (userRank === 'JEFE DE DETECCION' || userRank === 'SUPERVISOR' || userRank === 'ADMINDEVELOPER') {
        console.log('Showing verification status'); // Debug log
        if (estado_verificacion === 'VERIFICADO') {
            verificationStatus.textContent = 'VERIFICADO POR EL ALGORITMO';
            verificationStatus.className = 'verification-status verified';
        } else {
            verificationStatus.textContent = 'NO VERIFICADO POR EL ALGORITMO';
            verificationStatus.className = 'verification-status not-verified';
        }
        verificationStatus.style.display = 'block';
    } else {
        console.log('Hiding verification status'); // Debug log
        verificationStatus.style.display = 'none';
    }

    const button_save = document.getElementById('save-button');
    const button_cancel = document.getElementById('cancel-button');
    if (button_save) {

        button_save.style.display = 'none';
    }
    if (button_cancel) {
        button_cancel.style.display = 'none';

    }

};

function clearForm() {
    const form = document.querySelector('.form-content'); // Selecciona el formulario usando la clase 'form-content'
    if (form) {
        form.querySelectorAll('input, select, textarea').forEach(element => element.value = '');
    }
}

function updateRedMarkersModal() {
    const count = getCurrentRedMarkersCount();
    const alertTextLabel = elements.quantityMarkersModal.querySelector('#markerAlertText');

    if (count == 0) {
        hideNotificationOverlay();
        return;
    }

    alertTextLabel.innerHTML = count > 0 ? `
    <span class="marker-alert-count">${count}</span>
        marcador${count !== 1 ? 'es' : ''} por validar
    ` : '';

    showNotificationOverlay();
}

async function setSocketEvents() {
    const socket = await getSocketClient();
    if (!socket) {
        console.log("Socket no inicializado - usuario no autenticado");
        return;
    }

    socket.on('NEW_SIGHTING', (sighting) => {
        console.log('Nuevo avistamiento recibido:', sighting);
        // Verificar si el avistamiento coincide con los filtros actuales
        if (matchesFilters(sighting)) {
            // Verificar si el marcador ya existe
            const existingMarker = getMarkers().find(m => m.id === sighting.id);
            if (!existingMarker) {
                console.log('Añadiendo nuevo marcador:', sighting.id);
                const newMarker = addMarker(sighting.id, sighting, false, handleMarkerClick);
                if (newMarker && newMarker.leafletObject) {
                    newMarker.leafletObject.addTo(map);
                }
                updateRedMarkersModal();
                updateMarkersCount(getMarkers().length);
            } else {
                console.log('El marcador ya existe:', sighting.id);
            }
        } else {
            console.log('El avistamiento no coincide con los filtros actuales');
        }
    });

    socket.on('VALIDATE_SIGHTING', (sightingId) => {
        console.log('Avistamiento validado recibido:', sightingId);
        const marker = getMarkers().find(m => m.id == sightingId);
        if (marker && marker.sighting) {
            marker.sighting.status = 'validated';
            if (!matchesFilters(marker.sighting)) {
                marker.leafletObject.remove();
            }
            setMarkerColor(marker.id, true);
            updateRedMarkersModal();
        }
    });

    // Manejar reconexión
    socket.on('reconnect', () => {
        console.log('Socket reconectado, recargando marcadores...');
        loadMarkers(currentFilters).then(sightings => {
            if (sightings) {
                updateSightingsComponents(sightings);
            }
        });
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log('Socket desconectado');
    });

    // Manejar errores de conexión
    socket.on('connect_error', (error) => {
        console.error('Error de conexión del socket:', error);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await reloadUserProfile();
    const userProfile = JSON.parse(localStorage.getItem("user"));
    if (!userProfile) {
        console.log("Usuario no autenticado - saltando inicialización de socket");
        return;
    }

    const userPermissions = userProfile.permissions || {};
    showNavItems(userPermissions);

    userId = getUserId();

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', debouncedBuscarUbicacion);

    initFilters();

    const sightings = await loadMarkers(currentFilters);
    updateSightingsComponents(sightings);

    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('sighting');

    if (recordId) {
        const sightingRecord = sightings.find(sighting => sighting.id === parseInt(recordId, 10));
        const { latitud, longitud } = sightingRecord || {};
        if (latitud !== undefined && longitud !== undefined) {
            map.setView([latitud, longitud], 10);

            fillForm(sightingRecord);
            showForm(false);

            // Lógica de posicionamiento del marcador
            let { percentage, direction } = calculateMarkerPositionPercentage();
            adjustMapViewToMarker({ lat: latitud, lng: longitud }, percentage, direction);
        }
    }

    // Verificar si hay marcadores rojos y mostrar el modal de notificación si es necesario
    updateRedMarkersModal();

    // Solo inicializar socket si el usuario está autenticado
    if (localStorage.getItem('accessToken')) {
        setSocketEvents();
    }

    setTimeout(() => {
        updateRedMarkersModal();
    }, 1000);

    const clearSearchButton = document.getElementById('clear-search-button');
    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', () => {
            elements.searchInput.value = '';
        });
    } else {
        console.warn("El botón 'clear-search-button' no se encontró en el DOM.");
    }
});

function updateSightingsComponents(sightings) {
    processTimestamps(sightings);
    placeMarkersOnMap(sightings);
    staggerMarkers(getMarkers());
    filterMarkersByDateRange();
}

function getCurrentRedMarkersCount() {
    return getMarkers().filter(marker => marker.isRed).length;
}

function handleMarkerClick(marker, sighting) {

    let formEditable = isFormActive && formEditMode;
    if (isOverlayActive || formEditable) {
        return;
    }

    if (marker.isRed) {
        setMarkerAsSeen(marker.id, marker.sighting.usuario_id, userId);
    }

    hideNotificationOverlay();
    fillForm(sighting);
    showForm(false);

    let { percentage, direction } = calculateMarkerPositionPercentage();
    adjustMapViewToMarker(getLatLngFromMarker(marker), percentage, direction)
}


// Timeline
const timelineContainer = document.querySelector('.timeline-container');
const timelineToggle = document.querySelector('.timeline-toggle');
const startSlider = document.getElementById('start-slider');
const endSlider = document.getElementById('end-slider');
const currentRangeFeedback = document.getElementById('current-range');

// Al hacer click en el toggle se muestra u oculta el timeline
timelineToggle.addEventListener('click', () => {
    timelineContainer.classList.toggle('expanded');
    const icon = timelineToggle.querySelector('i');
    if (timelineContainer.classList.contains('expanded')) {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    } else {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    }
});

// Eventos de cambio en los sliders
startSlider.addEventListener('input', onRangeChange);
endSlider.addEventListener('input', onRangeChange);

startSlider.addEventListener('pointerup', snapStartSlider);
endSlider.addEventListener('pointerup', snapEndSlider);

// Función para snappear el slider de inicio
function snapStartSlider() {
    const step = sliderStep();
    const rawValue = parseFloat(startSlider.value);
    const dayIndexFloat = rawValue / step;
    let dayIndex;
    // Si la parte fraccionaria es menor a 0.5, se redondea hacia abajo; de lo contrario, se avanza un día.
    if (dayIndexFloat - Math.floor(dayIndexFloat) < 0.5) {
        dayIndex = Math.floor(dayIndexFloat);
    } else {
        dayIndex = Math.floor(dayIndexFloat) + 1;
    }

    // Verificar la distancia mínima: el índice de inicio debe ser menor que el índice del extremo final
    const currentEndIndex = Math.round(parseFloat(endSlider.value) / step);
    if (dayIndex >= currentEndIndex) {
        // Si el snap haría que ambos extremos sean iguales o que se invierta el orden, forzamos el inicio a quedar 1 día antes
        dayIndex = Math.max(0, currentEndIndex - 1);
    }

    const newValue = dayIndex * step;
    // Forzamos a un entero
    startSlider.value = Math.round(newValue);
    onRangeChange();
}

// Función para snappear el slider final
function snapEndSlider() {
    const step = sliderStep();
    const rawValue = parseFloat(endSlider.value);
    const dayIndexFloat = rawValue / step;
    let dayIndex;
    // Si la parte fraccionaria es menor a 0.5, se redondea hacia abajo; de lo contrario, se redondea hacia arriba.
    if (dayIndexFloat - Math.floor(dayIndexFloat) < 0.5) {
        dayIndex = Math.floor(dayIndexFloat);
    } else {
        dayIndex = Math.floor(dayIndexFloat) + 1;
    }

    // Verificar la distancia mínima: el índice final debe ser al menos 1 mayor que el índice de inicio
    const currentStartIndex = Math.round(parseFloat(startSlider.value) / step);
    if (dayIndex <= currentStartIndex) {
        // Se fuerza a que el final sea 1 día mayor, sin exceder el límite máximo (totalDays()-1)
        dayIndex = Math.min(totalDays() - 1, currentStartIndex + 1);
    }

    const newValue = dayIndex * step;
    endSlider.value = Math.round(newValue);
    onRangeChange();
}

function onRangeChange() {
    // Asegurarse de que el slider de inicio no supere al de fin
    if (parseInt(startSlider.value) > parseInt(endSlider.value)) {
        startSlider.value = endSlider.value;
    }
    if (parseInt(endSlider.value) < parseInt(startSlider.value)) {
        endSlider.value = startSlider.value;
    }

    updateSliderTrack();
    filterMarkersByDateRange();
    updateRangeFeedback();
}

// Actualiza la posición y tamaño del tramo seleccionado en el slider
function updateSliderTrack() {
    const startVal = parseFloat(startSlider.value);
    const endVal = parseFloat(endSlider.value);
    const track = document.querySelector('.slider-track');
    track.style.left = startVal + '%';
    track.style.width = (endVal - startVal) + '%';
}

// Filtra los marcadores según el rango de fechas seleccionado
function filterMarkersByDateRange() {
    const minDate = new Date(minTimestamp);
    const maxDate = new Date(maxTimestamp);
    const startValue = parseFloat(startSlider.value);
    const endValue = parseFloat(endSlider.value);

    const selectedStartDate = new Date(minDate.getTime() + (startValue / 100) * (maxDate - minDate));
    const selectedEndDate = new Date(minDate.getTime() + (endValue / 100) * (maxDate - minDate));

    selectedStartDate.setHours(0, 0, 0, 0);
    // La fecha superior se establece a las 23:59:59.999 para incluir todo el día
    selectedEndDate.setHours(23, 59, 59, 999);

    getMarkers().forEach(marker => {
        const markerDate = new Date(marker.sighting.fecha_avistamiento);
        if (markerDate >= selectedStartDate && markerDate <= selectedEndDate) {
            marker.leafletObject.setOpacity(1);
        } else {
            marker.leafletObject.setOpacity(0.2);
        }
    });
}

// Actualiza el feedback visual basándose en los valores discretos
function updateRangeFeedback() {
    const step = sliderStep();
    let startDayIndex = Math.round(startSlider.value / step);
    let endDayIndex = Math.round(endSlider.value / step);

    // Aseguramos que el índice final no exceda el límite (totalDays()-1)
    if (endDayIndex >= totalDays()) {
        endDayIndex = totalDays() - 1;
    }

    // Si por el snapping el extremo final cae en el mismo día (o incluso anterior) que el de inicio,
    // se fuerza a que ambos tengan el mismo índice (es decir, el día inicial).
    if (endDayIndex < startDayIndex) {
        endDayIndex = startDayIndex;
    }

    // Se calcula la fecha correspondiente a cada índice, partiendo de minTimestamp
    let startDate = new Date(minTimestamp + startDayIndex * 24 * 60 * 60 * 1000);
    let endDate = new Date(minTimestamp + (endDayIndex - 1) * 24 * 60 * 60 * 1000);

    // Forzamos que para el feedback el inicio muestre 00:00 y el final 23:59
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 0, 0);

    currentRangeFeedback.textContent = `${formatDate(startDate)} (00:00) - ${formatDate(endDate)} (23:59)`;
}

// Procesa los timestamps de los avistamientos para determinar el rango global
function processTimestamps(sightings) {
    const timestamps = sightings.map(s => new Date(s.fecha_avistamiento).getTime());
    // Se obtiene el primer y último timestamp del dataset
    let rawMin = new Date(Math.min(...timestamps));
    let rawMax = new Date(Math.max(...timestamps));

    // Ajustamos para que el primer día comience a las 00:00...
    rawMin.setHours(0, 0, 0, 0);
    // ...y el último día finalice a las 23:59:59.999
    rawMax.setHours(23, 59, 59, 999);

    // Actualizamos las variables globales
    minTimestamp = rawMin.getTime();
    maxTimestamp = rawMax.getTime();

    // Actualizamos la interfaz con los nuevos límites formateados en dd/mm/yyyy
    document.getElementById('timeline-start-date').textContent = formatDate(rawMin);
    document.getElementById('timeline-end-date').textContent = formatDate(rawMax);

    updateRangeFeedback();
    updateSliderTrack();

    generateTicks();
}


function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function totalDays() {
    // Cada día son 24*60*60*1000 milisegundos
    return ((maxTimestamp - minTimestamp) / (24 * 60 * 60 * 1000) + 1);
}

// Calcula el tamaño de cada paso discreto en el slider (en porcentaje)
function sliderStep() {
    // Dividimos el slider (0–100) en (totalDays()-1) intervalos.
    return 100 / (totalDays() - 1);
}

// Función que genera de forma dinámica los ticks
function generateTicks() {
    const tickContainer = document.querySelector('.slider-ticks');
    tickContainer.innerHTML = ''; // Limpiar cualquier tick previo
    const total = totalDays();
    const step = sliderStep();

    for (let i = 0; i < total; i++) {
        const tick = document.createElement('div');
        tick.className = 'tick';
        tick.style.left = (i * step) + '%';
        tickContainer.appendChild(tick);
    }
}

/* 
    Funciones de Filtros
*/
function initFilters() {

    setDefaultDateRange(30);

    currentFilters.statuses = ['pending', 'validated'];
    currentFilters.userIds = [];

    document.querySelectorAll('.quick-date').forEach(button => {
        button.addEventListener('click', handleQuickDate);
    });

    elements.applyFiltersButton.addEventListener('click', applyFilters);

    loadUsers();
}

function setDefaultDateRange(days) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);

    startDate.setHours(0, 0, 0, 0);

    currentFilters.startDate = startDate;
    currentFilters.endDate = null;

    const formatLocalDate = (date) => {
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 16);
    };

    elements.startDateInput.value = formatLocalDate(startDate);
    elements.endDateInput.value = '';
}

// Manejadores de Eventos
function handleQuickDate(e) {
    const days = parseInt(e.target.dataset.days);
    setDefaultDateRange(days);
}

function handleStatusChange(e) {
    currentFilters.statuses = Array.from(
        document.querySelectorAll('.status-filters input:checked')
    ).map(c => c.value);
}

// Lógica de Filtrado
async function applyFilters() {
    const sightings = await loadMarkers(currentFilters);
    updateSightingsComponents(sightings);
    showFilterFeedback(sightings ? sightings.length : 0);
}

async function clearFilters() {
    currentFilters = {
        startDate: new Date(Date.now() - 30 * 86400000),
        endDate: null,
        statuses: ['pending', 'validated'],
        userIds: []
    };

    setDefaultDateRange(30);

    // Actualizar UI
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.classList.toggle('active', currentFilters.statuses.includes(btn.dataset.value));
    });

    document.querySelectorAll('.user-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });

    const selectedContainer = document.getElementById('selected-users');
    selectedContainer.innerHTML = '';
    const placeholder = document.getElementById('user-placeholder');
    if (placeholder) {
        placeholder.style.display = 'block';
    }

    await applyFilters();
}

function updateMarkersVisibility(visibleMarkers) {
    getMarkers().forEach(marker => {
        const opacity = visibleMarkers.includes(marker) ? 1 : 0.2;
        marker.leafletObject.setOpacity(opacity);
    });
}

function showFilterFeedback(visibleCount) {
    const feedback = document.getElementById('filter-feedback');
    feedback.textContent = visibleCount === 0 ?
        "No se encontraron avistamientos con los filtros aplicados." :
        `${visibleCount} avistamientos encontrados`;
    feedback.style.display = 'block';
    setTimeout(() => feedback.style.display = 'none', 3000);
}

function animateShrink(input) {
    const animationDuration = 400;
    input.classList.add("animate-shrink");
    setTimeout(() => {
        input.classList.remove("animate-shrink");
    }, animationDuration);
}

function toggleUserMultiSelect() {
    const container = document.getElementById('user-multi-select');
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        // Enfoca el buscador interno al abrir el dropdown
        document.getElementById('user-dropdown-search').focus();
    } else {
        container.style.display = 'none';
    }
}

function handleUserSelection(e) {
    const checkbox = e.target;
    const userDni = checkbox.value;
    if (checkbox.checked) {
        if (!currentFilters.userIds.includes(userDni)) {
            currentFilters.userIds.push(userDni);
        }
    } else {
        currentFilters.userIds = currentFilters.userIds.filter(id => id !== userDni);
    }

    // Actualiza el input principal con los nombres de los usuarios seleccionados
    updateSelectedUserCards();
}

function updateSelectedUserCards() {
    const selectedContainer = document.getElementById('selected-users');
    const placeholder = document.getElementById('user-placeholder');
    // Limpiar el contenedor
    selectedContainer.innerHTML = '';

    // Obtener todas las opciones seleccionadas
    const selectedCheckboxes = document.querySelectorAll('.user-checkbox:checked');
    selectedCheckboxes.forEach(cb => {
        const option = cb.closest('.user-option');
        const fullName = option.querySelector('.user-fullname').textContent;
        const dni = cb.value;

        const badgeText = `${abbreviateName(fullName)} (${formatDNI(dni)})`;

        // Crear la tarjeta (badge)
        const badge = document.createElement('div');
        badge.classList.add('selected-user-card');

        const nameSpan = document.createElement('span');
        nameSpan.textContent = badgeText;
        badge.appendChild(nameSpan);

        const removeBtn = document.createElement('span');
        removeBtn.classList.add('remove-badge');
        removeBtn.textContent = '×';

        removeBtn.addEventListener('click', function (e) {
            e.stopPropagation();

            currentFilters.userIds = currentFilters.userIds.filter(id => id !== dni);
            cb.checked = false;

            badge.remove();

            if (selectedContainer.children.length === 0) {
                placeholder.style.display = 'block';
            }
        });

        badge.appendChild(removeBtn);


        selectedContainer.appendChild(badge);
    });

    // Mostrar u ocultar el placeholder
    placeholder.style.display = selectedContainer.children.length ? 'none' : 'block';
}

function filterUserOptions() {
    const searchTerm = document.getElementById('user-dropdown-search').value.toLowerCase();
    const options = document.querySelectorAll('.user-option');
    options.forEach(option => {
        const fullName = option.querySelector('.user-fullname').textContent.toLowerCase();
        const dni = option.querySelector('.user-dni').textContent.toLowerCase().replace(/\./g, '');
        // Se verifica si el término de búsqueda coincide con el nombre o el DNI
        if (fullName.includes(searchTerm) || dni.includes(searchTerm)) {
            option.style.display = '';
        } else {
            option.style.display = 'none';
        }
    });
}

function abbreviateName(fullName) {
    if (!fullName) return "";
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return fullName;
    const firstInitial = parts[0].charAt(0);
    const lastName = parts[1];
    return `${firstInitial}. ${lastName}`;
}

document.getElementById('user-dropdown-search').addEventListener('input', filterUserOptions);

document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('user-multi-select');
    const input = document.getElementById('user-filter');
    // Si el clic se produce fuera del dropdown y del input, se cierra el dropdown
    if (!dropdown.contains(event.target) && event.target !== input) {
        dropdown.style.display = 'none';
    }
});

function matchesFilters(sighting) {
    // Verificar fecha de inicio
    if (currentFilters.startDate) {
        const sightingDate = new Date(sighting.fecha_avistamiento);
        if (sightingDate < currentFilters.startDate) {
            return false;
        }
    }

    // Verificar fecha de fin
    if (currentFilters.endDate) {
        const sightingDate = new Date(sighting.fecha_avistamiento);
        if (sightingDate > currentFilters.endDate) {
            return false;
        }
    }

    // Verificar estado
    if (currentFilters.statuses && currentFilters.statuses.length > 0) {
        const status = sighting.validado_por ? 'validated' : 'pending';
        if (!currentFilters.statuses.includes(status)) {
            return false;
        }
    }

    // Verificar usuario
    if (currentFilters.userIds && currentFilters.userIds.length > 0) {
        if (!currentFilters.userIds.includes(sighting.usuario_id)) {
            return false;
        }
    }

    return true;
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

function calculateMarkerPositionPercentage() {
    const mapContainer = document.getElementById('map');
    const formContainer = elements.formPanel;

    if (!mapContainer || !formContainer) {
        console.warn('Elementos no encontrados.');
        // Valor por defecto asumiendo desktop
        return { percentage: 25, direction: 'horizontal' };
    }

    // Detección simple de mobile: umbral ajustable
    const isMobile = window.innerWidth <= 768;

    if (!isMobile) {
        // Desktop: calcular desplazamiento horizontal
        const mapLeft = mapContainer.getBoundingClientRect().left;
        const formLeft = formContainer.getBoundingClientRect().left;
        const availableSpace = formLeft - mapLeft;
        const midpoint = availableSpace / 2;
        const mapWidth = mapContainer.offsetWidth;
        const percentage = (midpoint / mapWidth) * 100;
        return { percentage, direction: 'horizontal' };
    } else {
        // Mobile: calcular desplazamiento vertical
        const mapTop = mapContainer.getBoundingClientRect().top;
        const formTop = formContainer.getBoundingClientRect().top;
        const availableSpace = formTop - mapTop;
        const midpoint = availableSpace / 2;
        const mapHeight = mapContainer.offsetHeight;
        const percentage = (midpoint / mapHeight) * 100;
        return { percentage, direction: 'vertical' };
    }
}

// Seleccionar el botón de limpiar búsqueda
const clearSearchButton = document.getElementById('clear-search-button');

// Agregar evento click para limpiar el campo de búsqueda
clearSearchButton.addEventListener('click', () => {
    elements.searchInput.value = '';
});

async function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('La geolocalización no está soportada en este navegador.'));
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                let errorMessage = 'Error al obtener la ubicación: ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Se requiere permiso para acceder a la ubicación. Por favor, habilita la geolocalización en tu navegador.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'La información de ubicación no está disponible.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'La solicitud de ubicación ha expirado.';
                        break;
                    default:
                        errorMessage += error.message;
                }
                console.error(errorMessage);
                alert(errorMessage);
                reject(new Error(errorMessage));
            },
            options
        );
    });
}