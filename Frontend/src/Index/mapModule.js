export let map = null;
let markers = [];
let greyMarker = null;

// Definición de íconos.
export const redIcon = L.icon({
  iconUrl: "/static/img/marker-icon-red.png",
  shadowUrl: "/static/img/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const blueIconMarker = new L.Icon({
  iconUrl: '/static/img/marker-icon-blue.png',
  shadowUrl: '/static/img/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export const greyIcon = L.icon({
  iconUrl: '/static/img/marker-icon-grey.png',
  shadowUrl: '/static/img/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/**
 * Inicializa el mapa en el contenedor especificado.
 * @param {HTMLElement} container - Elemento del DOM donde se renderizará el mapa.
 * @param {Array<number>} [initialCoords=[-34.6037, -58.3816]] - Coordenadas iniciales [lat, lng].
 * @param {number} [initialZoom=12] - Nivel de zoom inicial.
 * @returns {L.Map} Instancia del mapa Leaflet.
 */
export function initMap(container, initialCoords = [-34.6037, -58.3816], initialZoom = 12) {
  map = L.map(container, { zoomControl: false }).setView(initialCoords, initialZoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Habilitar interacciones táctiles y de teclado si están disponibles.
  if (L.Browser.touch) {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
  }

  return map;
}

/**
 * Agrega un marcador al mapa.
 * @param {string|number} id - Identificador único del marcador.
 * @param {object} sighting - Objeto con los datos del avistamiento. Debe contener las propiedades "latitud" y "longitud".
 * @param {boolean} [isValidated=false] - Determina si el marcador es validado (usa icono azul) o no (usa icono rojo).
 * @param {function} onClickCallback - Función a ejecutar cuando se hace click en el marcador.
 * @returns {object} Objeto que representa el marcador, incluyendo la instancia de Leaflet.
 */
export function addMarker(id, sighting, isValidated = false, onClickCallback) {
  const { latitud, longitud } = sighting;
  const icon = isValidated ? blueIconMarker : redIcon;
  const markerInstance = L.marker([latitud, longitud], { icon }).addTo(map);

  const markerObject = {
    leafletObject: markerInstance,
    sighting: sighting,
    isRed: !isValidated,
    id: id
  };

  markerInstance.on('click', () => {
    if (typeof onClickCallback === 'function') {
      onClickCallback(markerObject, sighting);
    }
  });

  markers.push(markerObject);
  return markerObject;
}

/**
 * Elimina todos los marcadores del mapa.
 */
export function clearAllMarkers() {
  markers.forEach(marker => marker.leafletObject.remove());
  markers = [];
}

/**
 * Retorna el arreglo de marcadores actuales.
 * @returns {Array} Lista de objetos marcador.
 */
export function getMarkers() {
  return markers;
}

/**
 * Actualiza (o crea si no existe) el marcador gris en la posición indicada.
 * Este marcador se utiliza, por ejemplo, para indicar la posición seleccionada.
 * @param {L.LatLng} latlng - Objeto con las coordenadas (latitud y longitud).
 */
export function updateGreyMarker(latlng) {
  if (greyMarker) {
    greyMarker.setLatLng(latlng);
  } else {
    greyMarker = L.marker(latlng, { icon: greyIcon }).addTo(map);
  }
}

/**
 * Remueve el marcador gris del mapa.
 */
export function removeGreyMarker() {
  if (greyMarker) {
    map.removeLayer(greyMarker);
    greyMarker = null;
  }
}

/**
 * Realiza reverse geocoding utilizando el servicio Nominatim.
 * @param {number} lat - Latitud.
 * @param {number} lng - Longitud.
 * @returns {Promise<string|null>} Promesa que resuelve con la dirección (display_name) o null en caso de error.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
    const data = await response.json();
    return data.display_name;
  } catch (error) {
    console.error('Error performing reverse geocoding:', error);
    return null;
  }
}

/**
 * Cambia el color del marcador según su estado de validación.
 * @param {string|number} id - Identificador único del marcador.
 * @param {boolean} isValidated - Si es true, usa el ícono azul; si es false, usa el ícono rojo.
 */
export function setMarkerColor(id, isValidated) {
    const marker = markers.find(m => m.id === id);
    if (marker) {
      const newIcon = isValidated ? blueIconMarker : redIcon;
      marker.leafletObject.setIcon(newIcon);
      marker.isRed = !isValidated; // Actualiza el estado del marcador
    } else {
      console.warn(`Marcador con id ${id} no encontrado.`);
    }
}

/**
 * Ajusta la vista del mapa para que el marcador en las coordenadas dadas quede en una posición específica del viewport.
 * @param {L.LatLng} latlng - Coordenadas del marcador.
 * @param {number} [viewportPercentage=0.25] - Porcentaje del ancho del viewport donde posicionar el marcador (0 a 1).
 */
export function adjustMapViewToMarker(latlng, percentage, direction) {
  if (!map) {
      console.warn('El mapa no está inicializado.');
      return;
  }
  
  const point = map.latLngToContainerPoint(latlng);
  
  if (direction === 'horizontal') {
      // Cálculo en eje X para desktop
      const mapWidth = map.getSize().x;
      const offsetX = (mapWidth / 2) - (mapWidth * percentage / 100);
      const targetPoint = L.point(point.x + offsetX, point.y);
      const targetLatLng = map.containerPointToLatLng(targetPoint);
      map.setView(targetLatLng, map.getZoom());
  } else if (direction === 'vertical') {
      // Cálculo en eje Y para mobile
      const mapHeight = map.getSize().y;
      const offsetY = (mapHeight / 2) - (mapHeight * percentage / 100);
      const targetPoint = L.point(point.x, point.y + offsetY);
      const targetLatLng = map.containerPointToLatLng(targetPoint);
      map.setView(targetLatLng, map.getZoom());
  } else {
      console.warn('Dirección no reconocida. Usa "horizontal" o "vertical".');
  }
}

export function getLatLngFromMarker(marker) {
    if (marker && marker.leafletObject) {
      return marker.leafletObject.getLatLng();
    }
    console.warn("Marcador no válido.");
    return null;
}


export function staggerMarkers(markers) {
  markers.forEach((marker, i) => {
    setTimeout(() => {
      marker.leafletObject.getElement().classList.add('visible');
    }, i * 50);
  });
};