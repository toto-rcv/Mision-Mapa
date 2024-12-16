const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth.routes");
const verifyRoutes = require("./routes/verify.routes");
const db = require("./models");

dotenv.config();
const app = express();

app.use(bodyParser.json());
db.sequelize.sync();

app.use("/api/auth", authRoutes);
app.use("/api/verify", verifyRoutes)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
