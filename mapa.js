let map = L.map("map").setView([-34.6195398, -58.3913895], 4)

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

document.getElementById("select-location").addEventListener("change",function(e){
    let coords= e.target.value.split(",");

    map.flyTo(coords,16);
})
// Agregar mapa base
var carto_light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {attribution: '©OpenStreetMap, ©CartoDB',subdomains: 'abcd',maxZoom: 24});

// Agregar plugin MiniMap
var minimap = new L.Control.MiniMap(carto_light,
    {
        toggleDisplay: true,
        minimized: false,
        position: "bottomleft"
    }).addTo(map);

//agrega escala para el minMapa
new L.control.scale({imperial: false}).addTo(map);


//agregar coordenadas marcador

// Función para agregar marcadores según las opciones en el select
function addMarkersFromSelect() {
    const select = document.getElementById("select-location");
    const options = select.options;
    const markers = []; // Array para almacenar los marcadores

    for (let i = 0; i < options.length; i++) {
        const value = options[i].value;
        if (value !== "-1") { // Evitar la opción predeterminada
            const coords = value.split(",").map(parseFloat);
            const marker = L.circleMarker(L.latLng(coords[0], coords[1]), {
                radius: 6,
                fillColor: "#ff0000",
                color: "blue",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.6,
            }).addTo(map);
            markers.push(marker); // Guardar cada marcador en el array
        }
    }

    return markers; // Retornar el array con los marcadores
}

// Llamar a la función para mostrar todos los marcadores
const markers = addMarkersFromSelect();


