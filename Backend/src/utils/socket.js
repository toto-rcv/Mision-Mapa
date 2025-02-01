const { Server } = require('socket.io');
const eventEmitter = require('./eventEmitter');

function initializeSocket(server) {
    const io = new Server(server, {
      cors: {
          origin: "*", // Si el frontend está en otro dominio, especifica la URL
          methods: ["GET", "POST"]
      }
  });
  
    // Escuchar eventos desde el bus de eventos
    eventEmitter.on('NEW_SIGHTING', (sighting) => {
      io.emit('NEW_SIGHTING', sighting); // <-- Enviar a todos los clientes
    });

  
    return io;
  }
  
module.exports = initializeSocket;