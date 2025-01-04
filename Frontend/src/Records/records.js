import { loadUserProfile } from '/utils/profile.js';
loadUserProfile();
import { customFetch } from '../utils/auth.js';

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

function displaySightings(sightings) {
    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = ''; // Clear any existing content

    const table = document.createElement('table');
    table.classList.add('sightings-table');

    const thead = document.createElement('thead');
    thead.innerHTML = `
            <tr>
                <th>ID</th>
                <th>Latitud</th>
                <th>Longitud</th>
                <th>Descripción</th>
                <th>Fecha</th>
                <th>Altitud Estimada</th>
                <th>Rumbo</th>
                <th>Tipo de Aeronave</th>
                <th>Tipo de Motor</th>
                <th>Cantidad de Motores</th>
                <th>Color</th>
            </tr>
        `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    sightings.forEach(sighting => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sighting.id}</td>
            <td>${sighting.latitud}</td>
            <td>${sighting.longitud}</td>
            <td class="description-cell">${sighting.observaciones}</td>
            <td>${formatDate(new Date(sighting.fecha_avistamiento))}</td>
            <td>${sighting.altitud_estimada}</td>
            <td>${sighting.rumbo}</td>
            <td>${sighting.tipo_aeronave}</td>
            <td>${sighting.tipo_motor}</td>
            <td>${sighting.cantidad_motores}</td>
            <td>${sighting.color}</td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    mapContainer.appendChild(table);

    updateMarkersCount(sightings.length);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
}

function updateMarkersCount(count) {
    const markersCountSpan = document.querySelector('.markers-count');
    markersCountSpan.textContent = `${count} marcadores`;
}