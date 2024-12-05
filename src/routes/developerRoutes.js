import express from "express";
import { v4 as uuidv4 } from "uuid";
import { ID, Query } from "node-appwrite";
import { config, databases } from "../config/appwrite.js";
import { PLAN_TYPES, Plans } from "../config/constants.js";

const router = express.Router();

// Helper function to load all API keys for a user
async function loadApiKeys(userId) {
  try {
    const data = await databases.listDocuments(
      config.databaseId,
      config.apiKeysCollectionId,
      [Query.equal("user", userId)]
    );
    return data.documents;
  } catch (error) {
    console.error("Error loading API keys:", error);
    throw error;
  }
}

// Helper function to validate user existence
async function validateUserId(userId) {
  try {
    const usersList = await databases.listDocuments(
      config.databaseId,
      config.userCollectionId
    );
    return usersList.documents.some((user) => user.$id === userId);
  } catch (error) {
    console.error("Error validating user ID:", error);
    return false;
  }
}

// Create new API key
router.post("/keys", async (req, res) => {
  try {
    const { userId, name } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    if (!name) {
      return res.status(400).json({ error: "Key name is required." });
    }

    const isValidUser = await validateUserId(userId);
    if (!isValidUser) {
      return res.status(401).json({ error: "Unauthorized. Invalid user ID." });
    }

    const user = await databases.getDocument(
      config.databaseId,
      config.userCollectionId,
      userId
    );

    const userPlan = Plans[user.plan || PLAN_TYPES.BASIC];

    const existingKeys = await databases.listDocuments(
      config.databaseId,
      config.apiKeysCollectionId,
      [Query.equal("user", userId), Query.equal("status", "active")]
    );

    if (existingKeys.documents.length >= userPlan.allowedApiKeys) {
      return res.status(403).json({
        error: "API key limit reached for your plan",
        message: "Please upgrade to Pro plan for more API keys",
        upgradeLink: `mailto:${SUPPORT_EMAIL_ADDRESS}?subject=Pro%20Plan%20Request`,
      });
    }

    const apiKey = `valheim_${uuidv4()}`;
    const createdAt = new Date().toISOString();

    const newKey = await databases.createDocument(
      config.databaseId,
      config.apiKeysCollectionId,
      ID.unique(),
      {
        key: apiKey,
        name: name,
        created: createdAt,
        user: userId,
        status: "active",
        lastUsed: null,
      }
    );

    return res.json(newKey);
  } catch (error) {
    console.error("Error creating API key:", error);
    res.status(500).json({ error: "Failed to create API key." });
  }
});

// Get all API keys for a user
router.get("/keys", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("User ")) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Missing user token." });
    }

    const userId = authHeader.split(" ")[1];

    const isValidUser = await validateUserId(userId);
    if (!isValidUser) {
      return res.status(401).json({ error: "Unauthorized. Invalid user ID." });
    }

    const user = await databases.getDocument(
      config.databaseId,
      config.userCollectionId,
      userId
    );

    const userPlan = Plans[user.plan || PLAN_TYPES.BASIC];

    const apiKeys = await loadApiKeys(userId);
    return res.json({ keysData: apiKeys, userPlan });
  } catch (error) {
    console.error("Error retrieving API keys:", error);
    res.status(500).json({ error: "Failed to retrieve API keys." });
  }
});

// Revoke an API key
router.post("/keys/:keyId/revoke", async (req, res) => {
  try {
    const { keyId } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("User ")) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Missing user token." });
    }

    const userId = authHeader.split(" ")[1];

    const isValidUser = await validateUserId(userId);
    if (!isValidUser) {
      return res.status(401).json({ error: "Unauthorized. Invalid user ID." });
    }

    // Verify the key belongs to the user
    const key = await databases.getDocument(
      config.databaseId,
      config.apiKeysCollectionId,
      keyId
    );

    if (key.user.$id !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden. Key doesn't belong to user." });
    }

    // Update the key status to revoked
    await databases.updateDocument(
      config.databaseId,
      config.apiKeysCollectionId,
      keyId,
      {
        status: "revoked",
      }
    );

    return res.json({ message: "API key revoked successfully" });
  } catch (error) {
    console.error("Error revoking API key:", error);
    res.status(500).json({ error: "Failed to revoke API key." });
  }
});

// Get single API key details
router.get("/keys/:keyId", async (req, res) => {
  try {
    const { keyId } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("User ")) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Missing user token." });
    }

    const userId = authHeader.split(" ")[1];

    const isValidUser = await validateUserId(userId);
    if (!isValidUser) {
      return res.status(401).json({ error: "Unauthorized. Invalid user ID." });
    }

    const key = await databases.getDocument(
      config.databaseId,
      config.apiKeysCollectionId,
      keyId
    );

    if (key.user !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden. Key doesn't belong to user." });
    }

    return res.json(key);
  } catch (error) {
    console.error("Error retrieving API key details:", error);
    res.status(500).json({ error: "Failed to retrieve API key details." });
  }
});

export default router;
