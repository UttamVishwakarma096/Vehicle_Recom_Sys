import { createApp, DEFAULT_PORT, SERVICE_NAME } from "./app.js";
import { createDatabase } from "./database.js";
import {
  createLogger,
  loadServiceConfig,
  registerGracefulShutdown,
} from "./foundation.js";

const logger = createLogger(SERVICE_NAME);
const database = createDatabase({ logger });

let config;
try {
  config = loadServiceConfig(SERVICE_NAME, DEFAULT_PORT);
} catch (error) {
  logger.error("server.configuration.failed", {
    category: "invalid_configuration",
    message: error.message,
  });
  process.exitCode = 1;
}

if (config) {
  const models = new Proxy(
    {},
    {
      get: (_target, prop) => database.models[prop],
    },
  );

  const app = createApp({
    logger,
    isReady: database.isReady,
    models,
  });

  const server = app.listen(config.port, config.host, () => {
    logger.info("server.started", {
      host: config.host,
      port: config.port,
    });
  });

  server.on("error", (error) => {
    logger.error("server.startup.failed", {
      category: "listen_failed",
      code: error.code,
    });
    process.exitCode = 1;
  });

  let shutdownTriggered = false;
  const connectDatabase = async () => {
    if (shutdownTriggered) return;
    const connected = await database.connect(config.databaseUri);
    if (!connected && !shutdownTriggered) {
      logger.warn("database.connection.retrying", {
        message: "Database connection failed. Retrying in 5 seconds...",
      });
      setTimeout(connectDatabase, 5000);
    }
  };

  void connectDatabase();
  registerGracefulShutdown(server, logger, {
    onShutdown: async () => {
      shutdownTriggered = true;
      await database.close();
    },
  });
}
