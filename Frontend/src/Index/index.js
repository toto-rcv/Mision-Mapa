let map = L.map("map", { doubleClickZoom: false, zoomControl: false }).setView([-34.6195398, -58.3913895], 4);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

document.getElementById("zoom-in").addEventListener("click", function () {
    map.zoomIn();
});

document.getElementById("zoom-out").addEventListener("click", function () {
    map.zoomOut();
});

new L.control.scale({ imperial: false }).addTo(map);

const overlay = document.getElementById('new-sighting-overlay');
const formPanel = document.getElementById('sighting-form');
const registerButton = document.querySelector('.register-button');
const cancelButton = document.getElementById('cancel-button');
const saveButton = document.getElementById('save-button');

// Ensure overlay and formPanel are hidden initially
overlay.style.display = 'none';
formPanel.style.display = 'none';

registerButton.addEventListener('click', () => {
    overlay.style.display = 'flex';
    formPanel.style.display = 'none'; // Ensure form panel is hidden when overlay is shown
});

map.on('click', function (e) {
    if (overlay.style.display === 'flex') {
        overlay.style.display = 'none';
        formPanel.style.display = 'block';
        
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        const timestamp = new Date().toLocaleString();

        document.getElementById('longitude').value = lng;
        document.getElementById('latitude').value = lat;
        document.getElementById('timestamp').value = timestamp;

        // Generate a unique ID for the sighting
        const sightingId = `#AV-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        document.getElementById('sighting-id').textContent = sightingId;
    }
});

cancelButton.addEventListener('click', () => {
    formPanel.style.display = 'none';
    // Reset the form fields here if needed
});

document.getElementById('sighting-form').addEventListener('submit', (e) => {
    e.preventDefault();
    // Here you would typically send the form data to a server
    console.log('Form submitted');
    formPanel.style.display = 'none';
});

function searchLocation() {
    const query = document.getElementById('search-field').value;

    if (!query) {
        alert('Por favor, ingresa una ubicación para buscar.');
        return;
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                alert('No se encontraron resultados.');
                return;
            }

            const { lat, lon, display_name } = data[0];
            map.setView([lat, lon], 10);

            L.marker([lat, lon]).addTo(map)
                .bindPopup(display_name)
                .openPopup();
        })
        .catch(error => console.error('Error al buscar la ubicación:', error));
}

document.getElementById('search-field').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        searchLocation();
    }
});

const closeFormButton = document.getElementById('close-form');

function closeForm() {
    formPanel.style.display = 'none';
}

function formatCoordinates(value) {
    return Number(value).toFixed(7);
}

closeFormButton.addEventListener('click', closeForm);
cancelButton.addEventListener('click', closeForm);

map.on('click', function (e) {
    if (overlay.style.display === 'flex') {
        overlay.style.display = 'none';
        formPanel.style.display = 'block';
        
        const lat = formatCoordinates(e.latlng.lat);
        const lng = formatCoordinates(e.latlng.lng);
        const timestamp = new Date().toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Update coordinates in the form header
        const coordinates = formPanel.querySelector('.coordinates');
        coordinates.innerHTML = `
            <div><label>Longitud:</label><span>${lng}</span></div>
            <div><label>Latitud:</label><span>${lat}</span></div>
        `;

        // Update timestamp
        const timestampElement = formPanel.querySelector('.timestamp');
        timestampElement.textContent = timestamp;
    }
});

// Prevent form submission if required fields are empty
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
        formPanel.style.display = 'none';
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

