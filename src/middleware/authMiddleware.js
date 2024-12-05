import { config, databases } from "../config/appwrite.js";
import rateLimit from "express-rate-limit";
import UsageTracker from "../services/usageService.js";
import { Query } from "node-appwrite";
import { PLAN_TYPES, Plans } from "../config/constants.js";

const PUBLIC_PATHS = [
  "/developer/keys",
  "/developer/keys/*",
  "/auth/validate-session",
  "/",
  ,
];

const TOKEN_LIFETIME = 60 * 1000;

// Convert wildcard pattern to regex pattern
const wildcardToRegex = (pattern) => {
  const escapedPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape special regex characters
    .replace(/\\\*/g, ".*"); // Replace escaped * with .*
  return new RegExp(`^${escapedPattern}$`);
};

// Check if a path matches any of the public paths
const isValidPath = (requestPath, paths) => {
  return paths.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = wildcardToRegex(pattern);
      return regex.test(requestPath);
    }
    return pattern === requestPath;
  });
};

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

const usageTracker = new UsageTracker(
  databases,
  config.databaseId,
  config.usageCollectionId
);

const validateApiKey = async (apiKey) => {
  try {
    const apiKeys = (await loadApiKeys()) || {};
    return apiKeys.some((userData) => userData.key === apiKey)
      ? apiKeys.find((key) => key.key === apiKey)
      : false;
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
  if (!isValid) {
    global.validAppTokens.delete(token);
  }

  return isValid;
};

export const authenticate = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const path = req.path;

    if (isValidPath(path, PUBLIC_PATHS)) {
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
    if (!apiKey) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const keyData = await validateApiKey(apiKey);
    if (!keyData) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const user = await databases.getDocument(
      config.databaseId,
      config.userCollectionId,
      keyData.user.$id
    );

    console.log(user.plan, Plans[user.plan]);
    const plan = Plans[user.plan || PLAN_TYPES.BASIC];

    if (!isValidPath(path, plan.allowedPaths)) {
      return res.status(403).json({
        error: "Path not allowed for your plan",
        message: "Upgrade to Pro plan for full API access",
        upgradeLink: `mailto:${SUPPORT_EMAIL_ADDRESS}?subject=Pro%20Plan%20Request`,
      });
    }

    const usage = await usageTracker.getUserUsage(
      user.$id,
      plan.rateLimitWindow
    );

    if (usage.totalRequests >= plan.rateLimit) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "Consider upgrading to Pro plan for higher limits",
        upgradeLink: `mailto:${SUPPORT_EMAIL_ADDRESS}?subject=Pro%20Plan%20Request`,
      });
    }

    if (usage.totalDataTransferred >= plan.maxDataSizeBytes) {
      return res.status(403).json({
        error: "Data transfer limit exceeded",
        message: "Upgrade to Pro plan for higher data limits",
        upgradeLink:
          "mailto:support-valheim-helper@gmail.com?subject=Pro%20Plan%20Request",
      });
    }

    req.user = user;
    req.apiKey = keyData;
    req.plan = plan;

    res.on("finish", () => {
      const responseTime = Date.now() - startTime;
      const dataSize = parseInt(res.get("Content-Length") || 0);

      usageTracker.trackRequest(user.$id, keyData.$id, {
        path: path,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        dataSize,
      });
    });

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
};
