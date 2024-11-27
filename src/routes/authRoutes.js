// src/routes/authRoutes.js
import express from "express";
import { sessionClient, account } from "../config/appwrite.js";
import crypto from "crypto";

const TOKEN_LIFETIME = 60 * 1000;

const router = express.Router();

router.post("/validate-session", async (req, res) => {
  try {
    const { appwriteJWT } = req.body;
    if (!appwriteJWT) {
      return res.status(401).json({ error: "No session token provided" });
    }

    sessionClient.setJWT(appwriteJWT);
    const user = await account.get();
    const appToken = crypto.randomBytes(32).toString("hex");

    global.validAppTokens = global.validAppTokens || new Map();
    global.validAppTokens.set(appToken, {
      userId: user.$id,
      expires: Date.now() + TOKEN_LIFETIME,
      origin: req.headers.origin,
      userAgent: req.headers["user-agent"],
    });

    res.json({ token: appToken });
  } catch (error) {
    console.error("Session validation error:", error);
    res.status(401).json({ error: "Invalid session" });
  }
});

export default router;
