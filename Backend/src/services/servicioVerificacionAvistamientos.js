const { Sighting } = require('../models');
const { Op } = require('sequelize');
const { calcularDistancia } = require('../utils/utilidadesGeo');

class ServicioVerificacionAvistamientos {
  static async verificarAvistamientos() {
    try {
      const avistamientos = await Sighting.findAll({
        where: {
          fue_eliminado: false
        },
        order: [['fecha_avistamiento', 'ASC']]
      });

      console.log(`Verificando ${avistamientos.length} avistamientos...`);

      for (const avistamiento of avistamientos) {
        const estaVerificado = await this.verificarAvistamientoIndividual(avistamiento);
        console.log(`Avistamiento ${avistamiento.id}: ${estaVerificado ? 'VERIFICADO' : 'NO_VERIFICADO'}`);
        await avistamiento.update({ 
          estado_verificacion: estaVerificado ? 'VERIFICADO' : 'NO_VERIFICADO' 
        });
      }
    } catch (error) {
      console.error('Error en verificarAvistamientos:', error);
      throw error;
    }
  }

  static async verificarAvistamientoIndividual(avistamiento) {
    try {
      const cincoMinutos = 5 * 60 * 1000; // 5 minutos en milisegundos
      
      // Solo buscar avistamientos 5 minutos o más DESPUÉS
      const fechaInicio = new Date(avistamiento.fecha_avistamiento.getTime() + cincoMinutos);
      const fechaFin = new Date(avistamiento.fecha_avistamiento.getTime() + (24 * 60 * 60 * 1000)); // Hasta 24 horas después

      console.log(`\nVerificando avistamiento ${avistamiento.id}:`);
      console.log(`Fecha: ${avistamiento.fecha_avistamiento}`);
      console.log(`Buscando avistamientos entre: ${fechaInicio.toISOString()} y ${fechaFin.toISOString()}`);
      console.log(`Ubicación: ${avistamiento.latitud}, ${avistamiento.longitud}`);
      console.log(`IP: ${avistamiento.ip_address}`);

      // Buscar avistamientos posteriores dentro de 100km
      const avistamientosCercanos = await Sighting.findAll({
        where: {
          id: { [Op.ne]: avistamiento.id },
          fue_eliminado: false,
          fecha_avistamiento: {
            [Op.between]: [fechaInicio, fechaFin]
          }
        }
      });

      console.log(`Encontrados ${avistamientosCercanos.length} avistamientos posteriores en tiempo`);

      // Filtrar avistamientos dentro de 100km y de diferentes IPs
      const avistamientosValidos = avistamientosCercanos.filter(cercano => {
        const distancia = calcularDistancia(
          avistamiento.latitud,
          avistamiento.longitud,
          cercano.latitud,
          cercano.longitud
        );
        
        const diferenciaTiempo = (
          new Date(cercano.fecha_avistamiento) - new Date(avistamiento.fecha_avistamiento)
        ) / 1000; // en segundos
        
        const esValido = distancia <= 100 && cercano.ip_address !== avistamiento.ip_address;
        
        if (distancia <= 100) {
          console.log(`Avistamiento ${cercano.id}:`);
          console.log(`  - Fecha: ${cercano.fecha_avistamiento}`);
          console.log(`  - Diferencia de tiempo: ${diferenciaTiempo.toFixed(1)} segundos después`);
          console.log(`  - Distancia: ${distancia.toFixed(2)}km`);
          console.log(`  - IP: ${cercano.ip_address}`);
          console.log(`  - Válido: ${esValido}`);
        }
        
        return esValido;
      });

      console.log(`Total de avistamientos válidos: ${avistamientosValidos.length}`);
      // Solo necesitamos 1 avistamiento válido para verificar
      return avistamientosValidos.length >= 1;
    } catch (error) {
      console.error('Error en verificarAvistamientoIndividual:', error);
      return false;
    }
  }
}

module.exports = ServicioVerificacionAvistamientos; 