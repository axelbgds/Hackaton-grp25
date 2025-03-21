import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import userRoutes from "./routes/userRoutes.js";
import tweetRoutes from "./routes/tweetRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import emotionRoutes from "./routes/emotionRoutes.js"; // Import des routes d'émotion

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Créer un dossier 'uploads' pour stocker les images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

dotenv.config();
connectDB();

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(cors());

app.get("/status", (req, res) => {
    res.json({ 
        status: "🟢 Serveur en ligne",
        database: connectDB ? "🟢 Connecté à MongoDB" : "🔴 Erreur de connexion MongoDB",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/users", userRoutes);
app.use("/api/tweets", tweetRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use('/api', emotionRoutes); // Intégrez les routes d'émotion

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));