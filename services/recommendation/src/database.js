import dns from "node:dns";
import mongoose from "mongoose";
import { registerModels } from "./models.js";

// try {
//   dns.setServers(["8.8.8.8", "1.1.1.1"]);
// } catch {
//   // Best-effort DNS server fallback
// }

const DATABASE_NAME = "vehicle_recommendations";

export function createDatabase({ logger }) {
  const connection = mongoose.createConnection();
  let indexesReady = false;
  let indexesCreated = false;
  connection.on("disconnected", () => {
    indexesReady = false;
    logger.warn("database.disconnected", { category: "database_unavailable" });
  });
  connection.on("connected", () => {
    indexesReady = indexesCreated;
    logger.info("database.connected", { database: DATABASE_NAME });
  });
  connection.on("error", (error) => {
    logger.error("database.connection.failed", {
      category: "database_connection_failed",
      code: error.code,
    });
  });
  let models = {};

  return Object.freeze({
    isReady: () => connection.readyState === 1 && indexesReady,
    get models() {
      return models;
    },
    get connection() {
      return connection;
    },
    async connect(uri) {
      if (!uri) {
        logger.warn("database.configuration.missing", { category: "database_not_configured" });
        return false;
      }
      try {
        await connection.openUri(uri, {
          dbName: DATABASE_NAME,
          serverSelectionTimeoutMS: 15000,
          autoIndex: false,
        });
        models = registerModels(connection);
        await Promise.all(Object.values(models).map((model) => model.createIndexes()));
        indexesCreated = true;
        indexesReady = true;
        logger.info("database.ready", { database: DATABASE_NAME });
        return true;
      } catch (error) {
        models = {};
        indexesCreated = false;
        indexesReady = false;
        logger.error("database.initialization.failed", {
          category: "database_initialization_failed",
          code: error.code,
          message: error.message,
        });
        await connection.close().catch(() => {});
        return false;
      }
    },
    close: () => connection.close(),
  });
}
