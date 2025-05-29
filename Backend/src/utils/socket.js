const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const eventEmitter = require('./eventEmitter');

function initializeSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: ['http://localhost:8070', 'http://localhost:3000'],
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            credentials: true,
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            exposedHeaders: ['Content-Range', 'X-Content-Range']
        },
        connectionStateRecovery: {
            maxDisconnectionDuration: 5000 // Aumentado a 5 segundos
        },
        transports: ['polling', 'websocket'],
        pingTimeout: 120000, // Aumentado a 2 minutos
        pingInterval: 30000, // Aumentado a 30 segundos
        upgradeTimeout: 60000, // Aumentado a 1 minuto
        allowUpgrades: true,
        maxHttpBufferSize: 1e8,
        connectTimeout: 45000, // 45 segundos para la conexión inicial
        cookie: {
            name: 'io',
            path: '/',
            httpOnly: true,
            sameSite: 'lax'
        }
    });
    
    // Middleware de autenticación JWT con reintentos
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token || token === "") {
                console.warn('Intento de conexión sin token');
                return next(new Error('Token no proporcionado'));
            }
            
            try {
                // Verificar y decodificar el token
                const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                socket.user = {
                    id: decoded.id,
                    role: decoded.rank
                };
                next();
            } catch (jwtError) {
                if (jwtError.name === 'TokenExpiredError') {
                    console.warn('Token expirado, intentando refresh...');
                    // Aquí podrías implementar la lógica de refresh token
                    return next(new Error('Token expirado'));
                }
                throw jwtError;
            }
        } catch (error) {
            console.error('Error de autenticación:', error.message);
            next(new Error('Autenticación fallida: ' + error.message));
        }
    });

    // Manejar errores de conexión
    io.engine.on("connection_error", (err) => {
        console.error('Error de conexión del engine:', err);
        if (err.code === 'transport_error') {
            console.warn('Error de transporte, intentando reconexión...');
        }
    });

    // Manejar errores de Socket.IO
    io.on('error', (error) => {
        console.error('Error general de Socket.IO:', error);
    });

    io.on('connection', (socket) => {
        console.log(`Usuario conectado: ${socket.user.id} (${socket.user.role})`);

        // Unir a room de administradores
        if (['DETECCION', 'JEFE DE DETECCION'].includes(socket.user.role)) {
            socket.join('admin-room');
            console.log(`Admin conectado: ${socket.user.id}`);
        }

        // Manejar desconexión
        socket.on('disconnect', (reason) => {
            console.log(`Usuario desconectado: ${socket.user.id} (${socket.user.role}) - Razón: ${reason}`);
            if (reason === 'transport close') {
                console.log('Conexión cerrada por el cliente');
            } else if (reason === 'ping timeout') {
                console.log('Timeout de ping');
            }
        });

        // Manejar errores
        socket.on('error', (error) => {
            console.error(`Error en socket de usuario ${socket.user.id}:`, error);
        });

        // Manejar reconexión
        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`Intento de reconexión #${attemptNumber} para usuario ${socket.user.id}`);
            // Aumentar el tiempo de espera entre intentos
            socket.io.opts.reconnectionDelay = Math.min(1000 * Math.pow(2, attemptNumber), 30000);
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log(`Reconexión exitosa después de ${attemptNumber} intentos para usuario ${socket.user.id}`);
            // Restaurar el delay por defecto
            socket.io.opts.reconnectionDelay = 1000;
        });

        // Manejar reconexión fallida
        socket.on('reconnect_failed', () => {
            console.error(`Reconexión fallida para usuario ${socket.user.id}`);
        });
    });

    // Escuchar eventos desde el bus de eventos con manejo de errores
    eventEmitter.on('NEW_SIGHTING', (sighting) => {
        try {
            console.log('Nuevo avistamiento emitido:', sighting.id);
            io.to('admin-room').emit('NEW_SIGHTING', sighting);
        } catch (error) {
            console.error('Error al emitir NEW_SIGHTING:', error);
        }
    });

    eventEmitter.on('VALIDATE_SIGHTING', (sighting_id) => {
        try {
            console.log('Avistamiento validado emitido:', sighting_id);
            io.to('admin-room').emit('VALIDATE_SIGHTING', sighting_id);
        } catch (error) {
            console.error('Error al emitir VALIDATE_SIGHTING:', error);
        }
    });
  
    return io;
}
  
module.exports = initializeSocket;