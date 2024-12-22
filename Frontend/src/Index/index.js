// Initialize the map
const map = L.map('map', { zoomControl: false }).setView([-34.6037, -58.3816], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Initialize UI elements
const registerButton = document.getElementById('register-button');
const overlay = document.getElementById('new-sighting-overlay');
const formPanel = document.getElementById('sighting-form');
const closeFormButton = document.getElementById('close-form');
const cancelButton = document.getElementById('cancel-button');

let greyMarker = null;
let isOverlayActive = false;
let isFormActive = false;
let lat = null;
let lng = null;
function showOverlay() {
    const overlay = document.getElementById('new-sighting-overlay');
    overlay.style.display = 'flex';
    overlay.style.transform = 'translateY(0)';
    isOverlayActive = true;
}

function hideOverlay() {
    const overlay = document.getElementById('new-sighting-overlay');
    overlay.style.transform = 'translateY(100%)';
    overlay.style.display = 'none';
    isOverlayActive = false;
}

function showForm() {
    const formPanel = document.getElementById('sighting-form');
    formPanel.style.display = 'block';
    isFormActive = true;
}

function hideForm() {
    const formPanel = document.getElementById('sighting-form');
    formPanel.style.display = 'none';
    isFormActive = false;
    if (greyMarker) {
        map.removeLayer(greyMarker);
        greyMarker = null;
    }
}

function closeForm() {
    hideForm();
}

function formatCoordinates(value) {
    return Number(value).toFixed(6);
}

// Event Listeners
registerButton.addEventListener('click', showOverlay);
closeFormButton.addEventListener('click', closeForm);
cancelButton.addEventListener('click', closeForm);

// Handle map clicks
map.on('click', function (e) {
    if (isOverlayActive || isFormActive) {
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
        const coordinates = document.querySelector('.coordinates');
        coordinates.innerHTML = `
            <div><label>Longitud:</label><span>${lng}</span></div>
            <div><label>Latitud:</label><span>${lat}</span></div>
        `;

        // Update timestamp
        const timestampElement = document.querySelector('.timestamp');
        timestampElement.textContent = timestamp;

        updateGreyMarker(e.latlng);

        // Perform reverse geocoding
        reverseGeocode(lat, lng);

        if (isOverlayActive) {
            hideOverlay();
            showForm();
        }
    }
});

// Add this new function for reverse geocoding
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
        const data = await response.json();
        console.log('Nominatim reverse geocoding result:', data);

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

// Form validation and submission
document.getElementById('sighting-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    // Check if all required fields are filled
    const requiredFields = this.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('invalid');
        } else {
            field.classList.remove('invalid');
        }
    });

    if (isValid) {
        // Captura los datos del formulario
        const formData = {
            fecha_avistamiento: new Date().toISOString(),
            ubicacion: document.getElementById('location').value,
            latitud:lat,
            longitud: lng,
            altitud_estimada: parseFloat(document.getElementById('estimated-height').value),
            rumbo: document.getElementById('heading').value,
            tipo_aeronave: document.getElementById('aircraft-type').value,
            tipo_motor: document.getElementById('engine-type').value,
            cantidad_motores: parseInt(document.getElementById('engine-count').value),
            color: document.getElementById('color').value,
            observaciones: document.getElementById('observations').value
        };

        try {
            // Envía los datos al backend con fetch
            const accessToken = localStorage.getItem('accessToken');
            const response = await fetch('/api/sightings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}` // Agrega el token al encabezado
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                console.log('Form submitted successfully');
                hideForm();
            } else {
                const error = await response.json();
                console.error('Error:', error.message);
            }
        } catch (err) {
            console.error('Error al conectar con el servidor:', err);
        }
    }
});

// Remove invalid class on input
document.querySelectorAll('.form-group input, .form-group textarea').forEach(input => {
    input.addEventListener('input', function () {
        if (this.value.trim()) {
            this.classList.remove('invalid');
        }
    });
});

// Enable touch gestures for map
if (L.Browser.touch) {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
}

// Bottom navigation handling
const navItems = document.querySelectorAll('.sidebar-item');
navItems.forEach(item => {
    item.addEventListener('click', function () {
        navItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});

// Search functionality
const searchInput = document.querySelector('.search-input');
searchInput.addEventListener('input', function (e) {
    // Add search functionality here
    console.log('Searching for:', e.target.value);
});

// Initialize map controls
const zoomInButton = document.querySelector('#zoom-in');
const zoomOutButton = document.querySelector('#zoom-out');

zoomInButton.addEventListener('click', () => map.zoomIn());
zoomOutButton.addEventListener('click', () => map.zoomOut());

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
        map.removeLayer(greyMarker);
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
    map.on('click', function (e) {
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
    } else {
        // Reset to desktop behavior
        const overlay = document.getElementById('new-sighting-overlay');
        const formPanel = document.getElementById('sighting-form');
        overlay.style.display = 'none';
        overlay.classList.remove('visible');
        formPanel.style.display = 'none';
        formPanel.classList.remove('visible');
        isOverlayActive = false;
        isFormActive = false;
        if (greyMarker) {
            map.removeLayer(greyMarker);
            greyMarker = null;
        }
    }
});

function updateGreyMarker(latlng) {
    if (greyMarker) {
        greyMarker.setLatLng(latlng);
    } else {
        const greyIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
        greyMarker = L.marker(latlng, { icon: greyIcon }).addTo(map);
    }
}

function updateCoordinates(latlng) {
    const lat = formatCoordinates(latlng.lat);
    const lng = formatCoordinates(latlng.lng);
    const coordinates = document.querySelector('.coordinates');
    coordinates.innerHTML = `
        <div><label>Longitud:</label><span>${lng}</span></div>
        <div><label>Latitud:</label><span>${lat}</span></div>
    `;
}