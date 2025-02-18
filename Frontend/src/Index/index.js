import { reloadUserProfile, getUserId } from '/utils/profile.js';
import { customFetch } from '/utils/auth.js';
import { showNavItems } from '/static/js/navigation.js';
import getSocketClient from '/utils/socket.js';

// Initialize UI elements
const registerButton = document.getElementById('register-button');
const overlay = document.getElementById('new-sighting-overlay');
const formPanel = document.getElementById('sighting-form');
const closeFormButton = document.getElementById('close-form');
const cancelButton = document.getElementById('cancel-button');
const inputs = formPanel.querySelectorAll('input, select, textarea');

let greyMarker, isOverlayActive = false, isFormActive = false, lat = null, lng = null;
let formEditMode = false;
let markers = [];
let minTimestamp, maxTimestamp;

// Estado de los filtros (se elimina la propiedad userId)
let currentFilters = {
    startDate: null,
    endDate: null,
    statuses: ['pending', 'validated'],
    userIds: []
};


const mapContainer = L.map('map', { zoomControl: false }).setView([-34.6037, -58.3816], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '© OpenStreetMap contributors'}).addTo(mapContainer);


const redIcon = L.icon({
    // Define redIcon here
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const blueIconMarker = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const greyIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// DOM elements
const elements = {
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
    applyFiltersButton: document.querySelector('.btn-apply')
  }


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

function validateHeight(input) {
    const height = parseInt(input.value, 10);
    if (isNaN(height) || height < 0 || height > 15000) {
        input.setCustomValidity('La altura debe estar entre 0 y 15000 metros');
    } else {
        input.setCustomValidity('');
    }
    validateField(input);
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

inputs.forEach(input => {
    if (input.id === 'estimated-height') {
        validateOnBlur(input, validateHeight);
    } else if (input.id === 'observations') {
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
    elements.formPanel.style.display = 'block';
    isFormActive = true;
    formEditMode = editMode;
}

function hideForm() {
    formEditMode = false;

    elements.formPanel.style.display = 'none';
    isFormActive = false;
}

function removeGreyMarker() {
    if (greyMarker) {
        mapContainer.removeLayer(greyMarker);
        greyMarker = null;
    }
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
registerButton.addEventListener('click', () => {
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

elements.filterButton.addEventListener("click", function() {
    elements.filtersPanel.classList.toggle("active");
    elements.filterButton.classList.toggle("active");
});

elements.filtersCloseButton.addEventListener("click", function() {
    elements.filtersPanel.classList.remove("active");
    elements.filterButton.classList.remove("active");
});

elements.statusButtons.forEach(btn => {
    btn.addEventListener("click", function() {
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

elements.startDateInput.addEventListener("change", function() {
    currentFilters.startDate = elements.startDateInput.value ? new Date(elements.startDateInput.value) : null;
});

elements.endDateInput.addEventListener("change", function() {
    currentFilters.endDate = elements.endDateInput.value ? new Date(elements.endDateInput.value) : null;
});

elements.filtersClearButton.addEventListener("click", function() {
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

    applyFilters();
  });

elements.quickDateButtons.forEach(btn => {
    btn.addEventListener("click", function() {

      btn.classList.add("clicked");
      // Remueve la clase después de la duración de la animación (300ms)
      setTimeout(() => {
        btn.classList.remove("clicked");
      }, 300);

      animateShrink(elements.startDateInput);
    })
})

elements.userFilter.addEventListener('click', toggleUserMultiSelect);

// Handle map clicks
mapContainer.on('click', function (e) {
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

        // Update coordinates in the form
        document.getElementById('coordinateLog').textContent = lng;
        document.getElementById('coordinateLat').textContent = lat;

        // Update timestamp
        const timestampElement = document.querySelector('.timestamp');
        timestampElement.textContent = timestamp;

        updateGreyMarker(e.latlng);

        // Perform reverse geocoding
        reverseGeocode(lat, lng);

        if (isOverlayActive) {
            hideOverlay();
            showForm(true);
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

// Add this new function for reverse geocoding
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
        const data = await response.json();

        // You can extract specific address components if needed
        const address = data.display_name;

        // Optionally, update the location input in the form
        const locationInput = document.getElementById('location');
        if (locationInput) {
            locationInput.value = address;
        }
    } catch (error) {
        console.error('Error performing reverse geocoding:', error);
    }
}

function validateForm() {
    const form = document.getElementById('sighting-form');
    const inputs = form.querySelectorAll('input, select, textarea');
    let isValid = true;

    inputs.forEach(input => {
        if (input.id === 'estimated-height') {
            validateHeight(input);
        } else if (input.required || input.value.trim() !== '') {
            validateField(input);
        }
        if (input.required && !input.validity.valid) {
            isValid = false;
        }
    });

    return isValid;
}

// Form validation and submission
document.getElementById('sighting-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const isValid = validateForm();


    if (isValid) {
        const form = document.getElementById('sighting-form');

        // Captura los datos del formulario
        const formData = {
            fecha_avistamiento: new Date().toISOString(),
            ubicacion: document.getElementById('location').value,
            latitud: lat,
            longitud: lng,
            altitud_estimada: parseFloat(document.getElementById('estimated-height').value),
            rumbo: document.getElementById('heading').value,
            tipo_aeronave: document.getElementById('aircraft-type').value,
            observaciones: document.getElementById('observations').value
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
            // Envía los datos al backend con fetch

            let response = await customFetch('/api/sightings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            
            hideForm();
            greyMarker.remove();

            if (response.ok) {
                const sighting = await response.json();
                addMarker(sighting.id, sighting);
                updateRedMarkersModal();

            } else {
                const error = await response.json();
                console.error('Error:', error.message);
            }
        } catch (err) {
            console.error('Error al conectar con el servidor:', err);
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

// Enable touch gestures for map
if (L.Browser.touch) {
    mapContainer.dragging.enable();
    mapContainer.touchZoom.enable();
    mapContainer.doubleClickZoom.enable();
    mapContainer.scrollWheelZoom.enable();
    mapContainer.boxZoom.enable();
    mapContainer.keyboard.enable();
    if (mapContainer.tap) mapContainer.tap.enable();
}

// Bottom navigation handling
const navItems = document.querySelectorAll('.sidebar-item');
navItems.forEach(item => {
    item.addEventListener('click', function () {
        navItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});

// Initialize map controls
const zoomInButton = document.querySelector('#zoom-in');
const zoomOutButton = document.querySelector('#zoom-out');

zoomInButton.addEventListener('click', () => mapContainer.zoomIn());
zoomOutButton.addEventListener('click', () => mapContainer.zoomOut());

function handleMobileFormVisibility() {
    const formPanel = document.getElementById('sighting-form');
    if (formPanel.classList.contains('visible')) {
        formPanel.classList.remove('visible');
    } else {
        formPanel.classList.add('visible');
    }
}

function initOverlayListeners() {
    const overlay = document.getElementById('new-sighting-overlay');
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hideOverlay();
        }
    });
}

function showOverlayMobile() {
    const overlay = document.getElementById('new-sighting-overlay');
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.classList.add('visible');
    }, 10);
    isOverlayActive = true;
}

function hideOverlayMobile() {
    const overlay = document.getElementById('new-sighting-overlay');
    overlay.classList.remove('visible');
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
    isOverlayActive = false;
}

function showFormMobile() {
    const formPanel = document.getElementById('sighting-form');
    formPanel.style.display = 'block';
    setTimeout(() => {
        formPanel.classList.add('visible');
    }, 10);
    isFormActive = true;
}

function hideFormMobile() {
    const formPanel = document.getElementById('sighting-form');
    formPanel.classList.remove('visible');
    setTimeout(() => {
        formPanel.style.display = 'none';
    }, 300);
    isFormActive = false;
    if (greyMarker) {
        mapContainer.removeLayer(greyMarker);
        greyMarker = null;
    }
}

function initMobileListeners() {
    const registerButton = document.getElementById('register-button');
    const closeFormButton = document.getElementById('close-form');
    const cancelButton = document.getElementById('cancel-button');

    registerButton.addEventListener('click', showOverlayMobile);
    closeFormButton.addEventListener('click', hideFormMobile);
    cancelButton.addEventListener('click', hideFormMobile);

    // Handle map clicks for mobile
    mapContainer.on('click', function (e) {
        if (isOverlayActive || isFormActive) {
            const lat = formatCoordinates(e.latlng.lat);
            const lng = formatCoordinates(e.latlng.lng);
            const timestamp = new Date().toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Update coordinates in the form
            const coordinates = document.querySelector('.coordinates');
            coordinates.innerHTML = `
                <div><label>Longitud:</label><span>${lng}</span></div>
                <div><label>Latitud:</label><span>${lat}</span></div>
            `;

            // Update timestamp
            const timestampElement = document.querySelector('.timestamp');
            timestampElement.textContent = timestamp;

            updateGreyMarker(e.latlng);

            if (isOverlayActive) {
                hideOverlayMobile();
                showFormMobile();
            }
        }
    });
}

// Check if it's a mobile device and initialize mobile listeners
if (window.innerWidth <= 768) {
    initMobileListeners();
}

// Add resize listener to handle orientation changes
window.addEventListener('resize', function () {
    if (window.innerWidth <= 768) {
        initMobileListeners();
    }
});

function updateGreyMarker(latlng) {
    if (greyMarker) {
        greyMarker.setLatLng(latlng);
        return;
    } 

    greyMarker = L.marker(latlng, { icon: greyIcon }).addTo(mapContainer);
}

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
        const response = await customFetch(url, {method: 'GET'});

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
                <span class="user-fullname">${user.fullName} <span class="user-dni">(${user.dni})</span>
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
            mapContainer.setView([lat, lon], zoomLevel);
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
}, 300);

function setMarkerColor(marker) {
    marker.leafletObject.setIcon(blueIconMarker);
    marker.isRed = false;
}

async function setMarkerAsSeen(sightingId, authorId, currentUserId) {
    console.log("Intento de marcar: ", currentUserId, authorId)
    if (currentUserId === authorId) return;

    const marker = markers.find(m => m.id === sightingId);
    if (marker) {
        setMarkerColor(marker)
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
    sightings.forEach(sighting => {
        const { id, validador } = sighting;

        addMarker(
            id,
            sighting,
            validador
        );

    });

    updateMarkersCount(sightings.length);
    updateRedMarkersModal();

}

function fillForm({ id, fecha_avistamiento, ubicacion, latitud, longitud, altitud_estimada, rumbo, tipo_aeronave, tipo_motor, cantidad_motores, color, observaciones }) {

    // obtener el formulario

    const form = document.querySelector('#sighting-form');

    const idLabel = form.querySelector("span.sighting-id").innerHTML = `AV-${String(id).padStart(5, '0')}`
    form.querySelector("span.timestamp").innerHTML = fecha_avistamiento
    form.querySelector("span#coordinateLog").innerHTML = longitud
    form.querySelector("span#coordinateLat").innerHTML = latitud
    form.querySelector("input#location").value = ubicacion
    form.querySelector("input#estimated-height").value = altitud_estimada
    form.querySelector("select#heading").value = rumbo
    form.querySelector("input#aircraft-type").value = tipo_aeronave
    form.querySelector("input#engine-type").value = tipo_motor
    form.querySelector("select#engine-count").value = cantidad_motores
    form.querySelector("input#color").value = color
    form.querySelector("textarea#observations").value = observaciones


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
    if (socket) {
        socket.on('NEW_SIGHTING', (sighting) => {
            if (userId !== sighting.usuario_id) {
                addMarker(sighting.id, sighting);
            }
        });

        socket.on('VALIDATE_SIGHTING', (sightingId) => {

            const marker = markers.find(m => m.id == sightingId);

            if (marker) {
                setMarkerColor(marker)
                updateRedMarkersModal();
            }
        });

    } else {
        console.error("No se pudo obtener la instancia del SocketClient. Problemas de autenticación.");
    }
}

document.addEventListener("DOMContentLoaded", async () => {

    await reloadUserProfile();
    const userProfile = JSON.parse(localStorage.getItem("user"));
    const userPermissions = userProfile.permissions || {};
    showNavItems(userPermissions);

    userId = getUserId();

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', debouncedBuscarUbicacion);

    initFilters();

    const sightings = await loadMarkers(currentFilters);
    /*
    processTimestamps(sightings);
    placeMarkersOnMap(sightings);
    filterMarkersByDateRange();
    */
    updateSightingsComponents(sightings);

    const urlParams = new URLSearchParams(window.location.search);
    const recordId = urlParams.get('sighting');

    if (recordId) {
        const sightingRecord = sightings.find(sighting => sighting.id === parseInt(recordId, 10));
        const { latitud, longitud } = sightingRecord || {};
        if (latitud !== undefined && longitud !== undefined) {
            mapContainer.setView([latitud, longitud], 10);
            fillForm(sightingRecord)
            showForm(false);
        }
    }

    setSocketEvents();

});

function updateSightingsComponents(sightings) {
    processTimestamps(sightings);
    placeMarkersOnMap(sightings);
    filterMarkersByDateRange();
}

function getCurrentRedMarkersCount() {
    return markers.filter(marker => marker.isRed).length;
}

function addMarker(id, sighting, isValidated = false) {
    const { latitud: lat, longitud: lng } = sighting;

    const icon = isValidated ? blueIconMarker : redIcon;
    const marker = L.marker([lat, lng], { icon }).addTo(mapContainer);

    const markerObject = {
        leafletObject: marker,
        sighting: sighting,
        isRed: !isValidated,
        id: id
    };

    markerObject.leafletObject.on('click', () => handleMarkerClick(markerObject, sighting));

    markers.push(markerObject);

    return markerObject;
}

function clearAllMarkers() {
    if (markers && markers.length) {
      markers.forEach(marker => {
        marker.leafletObject.remove();
      });

      markers = [];
    }
}

function handleMarkerClick(marker, sighting) {

    let formEditable = isFormActive && formEditMode;
    if (isOverlayActive || formEditable) {
        return;
    }

    if (marker.isRed) {
        setMarkerAsSeen(marker.id, marker.sighting.usuario_id, userId);
    }

    mapContainer.setView(marker.leafletObject.getLatLng(), 10);

    hideNotificationOverlay();
    fillForm(sighting);
    showForm(false);
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
  
    markers.forEach(marker => {
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
  
function updateMarkersVisibility(visibleMarkers) {
    markers.forEach(marker => {
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

let allUsers = [];

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
      
      const badgeText = `${abbreviateName(fullName)} (${dni})`;

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
      const dni = option.querySelector('.user-dni').textContent.toLowerCase();
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

document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('user-multi-select');
    const input = document.getElementById('user-filter');
    // Si el clic se produce fuera del dropdown y del input, se cierra el dropdown
    if (!dropdown.contains(event.target) && event.target !== input) {
      dropdown.style.display = 'none';
    }
  });