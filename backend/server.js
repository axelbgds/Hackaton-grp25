import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

// Importation des routes
import userRoutes from "./routes/userRoutes.js";
import tweetRoutes from "./routes/tweetRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

app.get("/status", (req, res) => {
    res.json({ 
        status: "🟢 Serveur en ligne",
        database: connectDB ? "🟢 Connecté à MongoDB" : "🔴 Erreur de connexion MongoDB",
        timestamp: new Date().toISOString()
    });
});

// Routes API
app.use("/api/users", userRoutes);
app.use("/api/tweets", tweetRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
