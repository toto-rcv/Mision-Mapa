const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const eventEmitter = require('./eventEmitter');
const db = require('../models');

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

        // Unir a room de usuarios autorizados
        if (['DETECCION', 'JEFE DE DETECCION', 'SUPERVISOR', 'ADMINDEVELOPER'].includes(socket.user.role)) {
            socket.join('authorized-room');
            console.log(`Usuario autorizado conectado: ${socket.user.id} (${socket.user.role})`);
        } else {
            console.log(`Usuario no autorizado conectado: ${socket.user.id} (${socket.user.role})`);
        }

        // Manejar desconexión
        socket.on('disconnect', async (reason) => {
            console.log(`Usuario desconectado: ${socket.user.id} (${socket.user.role}) - Razón: ${reason}`);
            
            try {
                // Buscar el registro de ingreso más reciente sin salida
                const lastEntry = await db.IncomeExit.findOne({
                    where: {
                        dni: socket.user.id,
                        exit: null
                    },
                    order: [['income', 'DESC']]
                });

                if (lastEntry) {
                    // Actualizar el registro con la hora de salida en horario argentino
                    const now = new Date();
                    const argentinaTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
                    
                    await lastEntry.update({
                        exit: argentinaTime
                    });
                    console.log(`Registro de salida actualizado para usuario ${socket.user.id}`);
                }
            } catch (error) {
                console.error('Error al actualizar registro de salida:', error);
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
            // Emitir solo a usuarios autorizados
            io.to('authorized-room').emit('NEW_SIGHTING', sighting);
            console.log('Evento NEW_SIGHTING enviado a usuarios autorizados');
        } catch (error) {
            console.error('Error al emitir NEW_SIGHTING:', error);
        }
    });

    eventEmitter.on('VALIDATE_SIGHTING', (sighting_id) => {
        try {
            console.log('Avistamiento validado emitido:', sighting_id);
            // Emitir solo a usuarios autorizados
            io.to('authorized-room').emit('VALIDATE_SIGHTING', sighting_id);
            console.log('Evento VALIDATE_SIGHTING enviado a usuarios autorizados');
        } catch (error) {
            console.error('Error al emitir VALIDATE_SIGHTING:', error);
        }
    });
  
    return io;
}
  
module.exports = initializeSocket;