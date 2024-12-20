// Initialize the map
const map = L.map('map').setView([-34.6037, -58.3816], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Initialize UI elements
const registerButton = document.getElementById('register-button');
const overlay = document.getElementById('new-sighting-overlay');
const formPanel = document.getElementById('sighting-form');
const closeFormButton = document.getElementById('close-form');
const cancelButton = document.getElementById('cancel-button');

// Animation handling functions
function showOverlay() {
    const overlay = document.getElementById('new-sighting-overlay');
    overlay.style.display = 'flex';
    // Force reflow
    overlay.offsetHeight;
    overlay.classList.add('visible');
}

function hideOverlay() {
    const overlay = document.getElementById('new-sighting-overlay');
    overlay.classList.remove('visible');
    overlay.addEventListener('transitionend', function handler() {
        overlay.style.display = 'none';
        overlay.removeEventListener('transitionend', handler);
    });
}

function showForm() {
    const formPanel = document.getElementById('sighting-form');
    formPanel.style.display = 'block';
    // Force reflow
    formPanel.offsetHeight;
    formPanel.classList.add('visible');
}

function hideForm() {
    const formPanel = document.getElementById('sighting-form');
    formPanel.classList.remove('visible');
    formPanel.addEventListener('transitionend', function handler() {
        formPanel.style.display = 'none';
        formPanel.removeEventListener('transitionend', handler);
    });
}

function closeForm() {
    hideForm();
}

function formatCoordinates(value) {
    return Number(value).toFixed(7);
}

// Event Listeners
registerButton.addEventListener('click', showOverlay);
closeFormButton.addEventListener('click', closeForm);
cancelButton.addEventListener('click', closeForm);

// Handle map clicks
map.on('click', function (e) {
    if (document.getElementById('new-sighting-overlay').classList.contains('visible')) {
        hideOverlay();
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

        showForm();
    }
});

// Form validation and submission
document.getElementById('sighting-form').addEventListener('submit', function(e) {
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
        console.log('Form submitted successfully');
        hideForm();
    }
});

// Remove invalid class on input
document.querySelectorAll('.form-group input, .form-group textarea').forEach(input => {
    input.addEventListener('input', function() {
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
    item.addEventListener('click', function() {
        navItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');
    });
});

// Search functionality
const searchInput = document.querySelector('.search-input');
searchInput.addEventListener('input', function(e) {
    // Add search functionality here
    console.log('Searching for:', e.target.value);
});

// Initialize map controls
const zoomInButton = document.querySelector('#zoom-in');
const zoomOutButton = document.querySelector('#zoom-out');


zoomInButton.addEventListener('click', () => map.zoomIn());
zoomOutButton.addEventListener('click', () => map.zoomOut());
