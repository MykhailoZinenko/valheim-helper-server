import express from "express";
import path from "path";
import cors from "cors";
import compression from "compression";
import bodyParser from "body-parser";
import { fileURLToPath } from "url";

import { bot } from "./config/telegram.js";
import itemRoutes from "./routes/itemRoutes.js";
import biomeRoutes from "./routes/biomeRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import foodRoutes from "./routes/foodRoutes.js";
import developerRoutes from "./routes/developerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { authenticate } from "./middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(compression());
app.use(bodyParser.json());
app.use(cors());
app.use("/public", express.static(path.join(__dirname, "../public")));

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "API is running",
    version: "1.0.0",
    endpoints: {
      items: "/api/items",
      biomes: "/api/biomes",
      feedback: "/api/feedback",
      food: "/api/food/",
    },
  });
});

app.use("/api", authenticate);

// API Routes
app.use("/api/items", itemRoutes);
app.use("/api/biomes", biomeRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api/auth", authRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Telegram Bot Setup
bot
  .launch()
  .then(() => console.log("Telegram bot started"))
  .catch((err) => console.error("Failed to start Telegram bot:", err));

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

export default app;
