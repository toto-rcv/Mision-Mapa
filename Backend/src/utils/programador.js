const cron = require('node-cron');
const ServicioVerificacionAvistamientos = require('../services/servicioVerificacionAvistamientos');

function inicializarProgramadores() {
  // La verificación ahora solo se ejecutará manualmente a través del botón
  console.log('Programador de verificación automática desactivado');
}

module.exports = {
  inicializarProgramadores
}; 