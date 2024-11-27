import { config, databases } from "../config/appwrite.js";
import rateLimit from "express-rate-limit";

const PUBLIC_PATHS = ["/developer/keys", "/auth/validate-session", "/"];

const TOKEN_LIFETIME = 60 * 1000;

async function loadApiKeys() {
  const apiKeys = await databases.listDocuments(
    config.databaseId,
    config.apiKeysCollectionId
  );
  return apiKeys.documents;
}

const tokenLimiter = rateLimit({
  windowMs: TOKEN_LIFETIME,
  max: 1000,
  keyGenerator: (req) => req.headers.authorization?.split(" ")[1],
});

const validateApiKey = async (apiKey) => {
  try {
    const apiKeys = (await loadApiKeys()) || {};
    return apiKeys.some((userData) => userData.key === apiKey);
  } catch (error) {
    console.error("Error validating API key:", error);
    return false;
  }
};

const validateAppToken = (token, req) => {
  if (!global.validAppTokens?.has(token)) {
    return false;
  }

  const tokenData = global.validAppTokens.get(token);

  const isValid =
    Date.now() <= tokenData.expires &&
    tokenData.origin === req.headers.origin &&
    tokenData.userAgent === req.headers["user-agent"];

  console.log(tokenData, req.headers.origin, req.headers["user-agent"]);

  if (!isValid) {
    global.validAppTokens.delete(token);
  }

  return isValid;
};

export const authenticate = async (req, res, next) => {
  try {
    if (PUBLIC_PATHS.includes(req.path)) {
      return next();
    }

    await tokenLimiter(req, res, () => {});

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (validateAppToken(token, req)) {
        return next();
      }
    }

    const apiKey = req.headers["x-api-key"];
    if (apiKey && (await validateApiKey(apiKey))) {
      return next();
    }

    res.status(401).json({ error: "Authentication required" });
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};
