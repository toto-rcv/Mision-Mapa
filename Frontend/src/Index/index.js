let map = L.map("map", { doubleClickZoom: false, zoomControl: false }).setView([-34.6195398, -58.3913895], 4);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);


// Agregar funcionalidad al botón de acercar (zoom in)
document.getElementById("zoom-in").addEventListener("click", function () {
    map.zoomIn();  // Acerca el mapa
});

// Agregar funcionalidad al botón de alejar (zoom out)
document.getElementById("zoom-out").addEventListener("click", function () {
    map.zoomOut();  // Aleja el mapa
});

// Agregar mapa base
var carto_light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '©OpenStreetMap, ©CartoDB', subdomains: 'abcd', maxZoom: 24 });

// Agregar plugin MiniMap


//agrega escala para el minMapa
new L.control.scale({ imperial: false }).addTo(map);







//agregar coordenadas marcador

// Función para agregar marcadores según las opciones en el select


// Llamar a la función para mostrar todos los marcadores


//Creamos un marcador
/*function agregarMarcadores() {
    var select = document.getElementById("select-location");
    for (var i = 0; i < select.options.length; i++) {
        var option = select.options[i];
        if (option.value !== "-1") { // Ignorar la opción de "Seleccione un lugar"
            var coords = option.value.split(",");
            var lat = parseFloat(coords[0]);
            var lng = parseFloat(coords[1]);

            // Agregar marcador al mapa
            L.marker([lat, lng]).addTo(map).bindPopup(option.text);
        }
    }
}*/

// Llamar a la función para agregar todos los marcadores
//agregarMarcadores();

// agregamos todos los marcadores del HTML

map.on('click', function (e) {
    // Obtener latitud y longitud del punto clickeado
    var lat = e.latlng.lat;
    var lng = e.latlng.lng;



    // Mostrar latitud y longitud en la consola
    console.log("Latitud: " + lat + ", Longitud: " + lng);

    // Opcional: mostrar un marcador con un popup
    const marker = L.marker([lat, lng]).addTo(map)
        .bindPopup("Latitud: " + lat.toFixed(4) + "<br>Longitud: " + lng.toFixed(4))
        .openPopup();

    marker.on('dblclick', function () {
        map.removeLayer(marker); // Elimina el marcador del mapa
    });
});


// Función para buscar ubicaciones
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

            // Obtener las coordenadas de la primera coincidencia
            const { lat, lon, display_name } = data[0];

            // Mover el mapa a las coordenadas encontradas
            map.setView([lat, lon], 10);

            // Eliminar marcador previo si existe
            if (marker) {
                map.removeLayer(marker);
            }

            // Agregar marcador en la ubicación encontrada
            marker = L.marker([lat, lon]).addTo(map)
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



const registerButton = document.querySelector('.register-button');
const modal = document.getElementById('register-modal');
const closeModalButton = document.getElementById('close-modal');

// Función para mostrar el modal
registerButton.addEventListener('click', () => {
    modal.style.display = 'flex';
});

// Función para ocultar el modal
closeModalButton.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Cerrar el modal al hacer clic fuera de él
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});