import { Client, Databases, Account } from "node-appwrite";

export const config = {
  projectId: process.env.APPWRITE_PROJECT_ID,
  apiKey: process.env.APPWRITE_API_KEY,
  url: process.env.APPWRITE_ENDPOINT,
  databaseId: process.env.APPWRITE_DATABASE_ID,
  userCollectionId: process.env.APPWRITE_USER_COLLECTION_ID,
  apiKeysCollectionId: process.env.APPWRITE_API_KEYS_COLLECTION_ID,
};

export const adminClient = new Client()
  .setEndpoint(config.url)
  .setProject(config.projectId)
  .setKey(config.apiKey);

export const sessionClient = new Client()
  .setEndpoint(config.url)
  .setProject(config.projectId);

export const account = new Account(sessionClient);
export const databases = new Databases(adminClient);
