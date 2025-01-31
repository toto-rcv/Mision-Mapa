const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth.routes");
const verifyRoutes = require("./routes/verify.routes");
const sightingsRoutes = require("./routes/sighting.routes");
const userRoutes = require("./routes/users.routes"); // <-- Importa la ruta de usuarios


const db = require("./models");

dotenv.config();
const app = express();

app.use(bodyParser.json());
db.sequelize.sync();

app.use("/api/sightings", sightingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/users", userRoutes); // <-- Agrega la ruta aquí

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
