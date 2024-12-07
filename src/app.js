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
import { items } from "../items.js";
import { loadJsonFile } from "./utils/fileUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let langCache = null;

export async function loadLanguageFile() {
  if (!langCache) {
    langCache = await loadJsonFile("public/lang/en.json");
  }
  return langCache;
}

const app = express();

// Middleware
app.use(compression());
app.use(bodyParser.json());
app.use(cors());
app.use("/public", express.static(path.join(__dirname, "../public")));

console.log(Object.values(items).length);

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

const initBot = async () => {
  const isLocalEnvironment =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "local" ||
    process.env.IS_LOCAL === "true";

  if (isLocalEnvironment) {
    console.log("Skipping bot initialization in local environment");
    return;
  }

  try {
    const botInfo = await bot.telegram.getMe().catch(() => null);
    if (!botInfo) {
      console.log("Starting Telegram bot...");
      await bot.launch();
      console.log("Telegram bot successfully started");
    } else {
      console.log("Bot instance already running, skipping launch");
    }
  } catch (error) {
    if (error.response?.error_code === 409) {
      console.log(
        "Conflict: Another bot instance is running. Skipping launch."
      );
    } else {
      console.error("Failed to start Telegram bot:", error.message);
    }
  }
};

initBot();

const gracefulShutdown = () => {
  console.log("Received shutdown signal");
  try {
    bot.stop("SIGTERM");
    console.log("Bot shutdown completed");
  } catch (error) {
    console.error("Error during bot shutdown:", error);
  }
};

process.once("SIGINT", gracefulShutdown);
process.once("SIGTERM", gracefulShutdown);

export default app;
