const express = require("express");
const http = require('http');

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

// Configurar trust proxy para obtener IPs reales
app.set('trust proxy', true);

initializeSocket(server);

app.use(bodyParser.json());

// Middleware para obtener la IP real del cliente
app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    req.realIP = clientIP;
    next();
});

app.use("/api/sightings", sightingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/users", userRoutes);
app.use("/api/geocode", geocodeRoutes);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
