import express from "express";
import { v4 as uuidv4 } from "uuid";
import { ID, Query } from "node-appwrite";
import { config, databases } from "../config/appwrite.js";

const router = express.Router();

async function loadApiKey(userId) {
  const data = await databases.listDocuments(
    config.databaseId,
    config.apiKeysCollectionId,
    [Query.equal("user", userId)]
  );

  return data.documents[0];
}

async function saveApiKey(apiKeyId, apiKey) {
  if (apiKeyId === null) {
    await databases.createDocument(
      config.databaseId,
      config.apiKeysCollectionId,
      ID.unique(),
      apiKey
    );
  } else {
    await databases.updateDocument(
      config.databaseId,
      config.apiKeysCollectionId,
      apiKeyId,
      { ...apiKey }
    );
  }
}

async function validateUserId(userId) {
  try {
    const usersList = await databases.listDocuments(
      config.databaseId,
      config.userCollectionId
    );

    const userExists = usersList.documents.some((user) => user.$id === userId);
    return userExists;
  } catch (error) {
    console.error("Error validating user ID:", error);
    return false;
  }
}

router.post("/keys", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    console.log("Received user ID:", userId);

    const isValidUser = await validateUserId(userId);
    if (!isValidUser) {
      return res.status(401).json({ error: "Unauthorized. Invalid user ID." });
    }

    const apiKeyDocument = await loadApiKey(userId);

    console.log(apiKeyDocument);

    const apiKey = `valheim_${uuidv4()}`;
    const createdAt = new Date().toISOString();

    await saveApiKey(apiKeyDocument ? apiKeyDocument.$id : null, {
      key: apiKey,
      created: createdAt,
      user: userId,
    });

    return res.json({ key: apiKey, created: createdAt });
  } catch (error) {
    console.error("Error creating API key:", error);
    res.status(500).json({ error: "Failed to create API key." });
  }
});

router.get("/keys", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("User ")) {
      return res
        .status(401)
        .json({ error: "Unauthorized. Missing user token." });
    }

    const userId = authHeader.split(" ")[1];
    console.log("User ID for retrieval:", userId);

    const isValidUser = await validateUserId(userId);
    if (!isValidUser) {
      return res.status(401).json({ error: "Unauthorized. Invalid user ID." });
    }

    const apiKey = await loadApiKey(userId);

    if (!apiKey) {
      return res.status(404).json({ error: "API key not found." });
    }

    return res.json(apiKey);
  } catch (error) {
    console.error("Error retrieving API key:", error);
    res.status(500).json({ error: "Failed to retrieve API key." });
  }
});

export default router;
