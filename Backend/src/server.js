const express = require("express");
const http = require('http');
const cors = require('cors');

const initializeSocket = require('./utils/socket');

const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth.routes");
const verifyRoutes = require("./routes/verify.routes");
const sightingsRoutes = require("./routes/sighting.routes");
const userRoutes = require("./routes/users.routes");
const geocodeRoutes = require("./routes/geocode.routes");

const db = require("./models");

dotenv.config();
const app = express();
const server = http.createServer(app);

// Configurar CORS con opciones más permisivas para desarrollo
app.use(cors({
    origin: ['http://localhost:8070', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400 // 24 horas
}));

// Configurar trust proxy para obtener IPs locales
app.set('trust proxy', true);

// Inicializar Socket.IO antes de las rutas
const io = initializeSocket(server);

// Aumentar el límite de tamaño del body
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Middleware para obtener la IP local del cliente
app.use((req, res, next) => {
    try {
        // Intentar obtener la IP real del cliente
        let ip = req.headers['x-real-ip'] || 
                 req.headers['x-forwarded-for']?.split(',')[0] || 
                 req.connection.remoteAddress;

        // Si la IP es IPv6, convertirla a IPv4
        if (ip && ip.startsWith('::ffff:')) {
            ip = ip.substring(7);
        }

        // Si la IP es localhost o la IP de Docker, intentar obtener la IP real
        if (ip === '127.0.0.1' || ip === 'localhost' || (ip && ip.startsWith('172.18.'))) {
            ip = req.headers['x-forwarded-for']?.split(',')[0] || ip;
        }

        req.realIP = ip;
        next();
    } catch (error) {
        console.error('Error al procesar IP:', error);
        req.realIP = req.connection.remoteAddress;
        next();
    }
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
    console.error('Error global:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Error interno del servidor',
            status: err.status || 500
        }
    });
});

// Endpoint de prueba para ver la IP
app.get('/api/test-ip', (req, res) => {
    res.json({
        localIP: req.realIP,
        rawIP: req.connection.remoteAddress,
        headers: {
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-real-ip': req.headers['x-real-ip'],
            'x-forwarded-host': req.headers['x-forwarded-host'],
            'x-forwarded-port': req.headers['x-forwarded-port']
        }
    });
});

// Endpoint de prueba para verificar que el servidor está funcionando
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

app.use("/api/sightings", sightingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/geocode", geocodeRoutes);

const PORT = process.env.PORT || 3000;

// Manejar errores del servidor
server.on('error', (error) => {
    console.error('Error del servidor:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`El puerto ${PORT} está en uso. Intentando reiniciar...`);
        setTimeout(() => {
            server.close();
            server.listen(PORT, '0.0.0.0');
        }, 1000);
    }
});

// Manejar señales de terminación
process.on('SIGTERM', () => {
    console.log('Recibida señal SIGTERM. Cerrando servidor...');
    server.close(() => {
        console.log('Servidor cerrado.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Recibida señal SIGINT. Cerrando servidor...');
    server.close(() => {
        console.log('Servidor cerrado.');
        process.exit(0);
    });
});

// Iniciar el servidor
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server is ready for connections`);
});
