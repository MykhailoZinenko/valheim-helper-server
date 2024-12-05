import { ID, Query } from "node-appwrite";

class UsageTracker {
  constructor(databases, databaseId, usageCollectionId) {
    this.databases = databases;
    this.databaseId = databaseId;
    this.usageCollectionId = usageCollectionId;
  }

  async trackRequest(userId, apiKeyId, requestData) {
    const { path, method, responseTime, statusCode, dataSize } = requestData;

    await this.databases.createDocument(
      this.databaseId,
      this.usageCollectionId,
      ID.unique(),
      {
        userId,
        apiKeyId,
        timestamp: new Date().toISOString(),
        path,
        method,
        responseTime,
        statusCode,
        dataSize,
      }
    );
  }

  async getUserUsage(userId, windowMs) {
    const endTime = new Date();
    const startTime = new Date(endTime - windowMs);

    const usage = await this.databases.listDocuments(
      this.databaseId,
      this.usageCollectionId,
      [
        Query.equal("userId", userId),
        Query.greaterThan("timestamp", startTime.toISOString()),
        Query.lessThan("timestamp", endTime.toISOString()),
      ]
    );

    return {
      totalRequests: usage.documents.length,
      totalDataTransferred: usage.documents.reduce(
        (sum, doc) => sum + doc.dataSize,
        0
      ),
    };
  }
}

export default UsageTracker;
