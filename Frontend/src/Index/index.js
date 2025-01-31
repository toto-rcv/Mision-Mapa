import { reloadUserProfile } from '/utils/profile.js';
import { customFetch } from '/utils/auth.js';
import { showNavItems } from '/static/js/navigation.js';

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
    quantityMarkersModal: document.getElementById("quantityMarkers"),
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

async function loadMarkers() {
    try {
        // Obtén el token de localStorage
        const accessToken = localStorage.getItem('accessToken');

        // Realiza una solicitud GET para obtener los datos de los avistamientos
        const response = await customFetch('/api/sightings/all', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}` // Agrega el token al encabezado
            }
        });

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

function updateMarkersCount(count) {
    const markersCountSpan = document.querySelector('.markers-count');
    markersCountSpan.textContent = `${count} marcadores`;
}

// Función para buscar la ubicación
async function buscarUbicacion(nombreLugar) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(nombreLugar)}&addressdetails=1`);
        const resultados = await response.json();

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

async function setMarkerAsSeen(sightingId) {

    const marker = markers.find(m => m.id === sightingId);
    if (marker) {
        marker.leafletObject.setIcon(blueIconMarker);
        marker.isRed = false;
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
    markers = []

    // Itera sobre los datos y agrega marcadores al mapa
    sightings.forEach(sighting => {
        const { id, validador} = sighting;

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
    const modal = elements.quantityMarkersModal;

    if (count == 0) {
        hideNotificationOverlay();
        return;
    }

    modal.innerHTML = count > 0 ? `
        <div class="modal-content">
            <p>Tienes ${count} marcador${count !== 1 ? 'es' : ''} por validar</p>
        </div>
    ` : '';

    showNotificationOverlay();
}

document.addEventListener("DOMContentLoaded", async () => {

    await reloadUserProfile();
    const userProfile = JSON.parse(localStorage.getItem("user"));
    const userPermissions = userProfile.permissions || {};
    showNavItems(userPermissions);

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    searchInput.addEventListener('input', debouncedBuscarUbicacion);

    const sightings = await loadMarkers();
    placeMarkersOnMap(sightings);

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

});

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

function handleMarkerClick(marker, sighting) {

    let formEditable = isFormActive && formEditMode;
    if (isOverlayActive || formEditable) {
        return;
    }

    if (marker.isRed) {
        setMarkerAsSeen(marker.id);
    }

    mapContainer.setView(marker.leafletObject.getLatLng(), 10);

    hideNotificationOverlay();
    fillForm(sighting);
    showForm(false);
}