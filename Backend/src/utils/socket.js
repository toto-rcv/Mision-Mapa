const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const eventEmitter = require('./eventEmitter');

function initializeSocket(server) {
    const io = new Server(server, {
      cors: {
          origin: "*", // Si el frontend está en otro dominio, especifica la URL
          methods: ["GET", "POST"]
      },
      connectionStateRecovery: {}
    });
    
     // Middleware de autenticación JWT
     io.use(async (socket, next) => {
      try {
          const token = socket.handshake.auth.token;
          if (!token || token === "") {
              throw new Error('Token no proporcionado');
          }
          
          // Verificar y decodificar el token
          const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
          socket.user = {
              id: decoded.id,
              role: decoded.rank
          };
          next();
        } catch (error) {
            next(new Error('Autenticación fallida: ' + error.message));
        }
    });

    io.on('connection', (socket) => {
      console.log(`Usuario conectado: ${socket.user.id} (${socket.user.role})`);

      // Unir a room de administradores
      if (['DETECCION', 'JEFE DE DETECCION'].includes(socket.user.role)) {
          socket.join('admin-room');
          console.log(`Admin conectado: ${socket.user.id}`);
      }
    });

    // Escuchar eventos desde el bus de eventos
    eventEmitter.on('NEW_SIGHTING', (sighting) => {
      io.to('admin-room').emit('NEW_SIGHTING', sighting);
    });

    eventEmitter.on('VALIDATE_SIGHTING', (sighting_id) => {
      io.to('admin-room').emit('VALIDATE_SIGHTING', sighting_id)
    })
  
    return io;
  }
  
module.exports = initializeSocket;