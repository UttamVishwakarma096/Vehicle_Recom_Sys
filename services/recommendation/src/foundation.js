import express from "express";
import { randomUUID } from "node:crypto";
import { isIP } from "node:net";

const BODY_LIMIT_BYTES = 64 * 1024;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const DATABASE_NAME = "vehicle_recommendations";

export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export class HttpError extends Error {
  constructor(status, code, message, fieldErrors) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function loadServiceConfig(service, defaultPort, env = process.env) {
  const host = env.HOST ?? "127.0.0.1";
  if (
    typeof host !== "string" ||
    host.length === 0 ||
    host.length > 255 ||
    !(isIP(host) || /^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(host))
  ) {
    throw new ConfigurationError("HOST must be a valid hostname or IP address.");
  }

  const rawPort = env.PORT ?? String(defaultPort);
  if (!/^\d+$/.test(rawPort)) {
    throw new ConfigurationError("PORT must be an integer from 1 through 65535.");
  }

  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new ConfigurationError("PORT must be an integer from 1 through 65535.");
  }

  const databaseUri = env.MONGODB_URI ?? "";
  if (databaseUri) {
    let parsedUri;
    let targetDatabase;
    try {
      parsedUri = new URL(databaseUri);
      targetDatabase = decodeURIComponent(parsedUri.pathname.slice(1));
    } catch {
      throw new ConfigurationError("MONGODB_URI must be a valid MongoDB connection URI.");
    }
    if (
      !["mongodb:", "mongodb+srv:"].includes(parsedUri.protocol) ||
      targetDatabase !== DATABASE_NAME
    ) {
      throw new ConfigurationError(`MONGODB_URI must target the ${DATABASE_NAME} database.`);
    }
  }
  return Object.freeze({ service, host, port, databaseUri, databaseName: DATABASE_NAME });
}

export function createLogger(service, write = (line) => console.log(line)) {
  function log(level, event, details = {}) {
    write(
      JSON.stringify({
        ...details,
        timestamp: new Date().toISOString(),
        level,
        service,
        event,
      }),
    );
  }

  return Object.freeze({
    info: (event, details) => log("info", event, details),
    warn: (event, details) => log("warn", event, details),
    error: (event, details) => log("error", event, details),
  });
}

export function createRequestContextMiddleware(logger) {
  return (request, response, next) => {
    const receivedId = request.get("X-Correlation-ID");
    request.correlationId =
      receivedId && CORRELATION_ID_PATTERN.test(receivedId)
        ? receivedId
        : randomUUID();
    response.setHeader("X-Correlation-ID", request.correlationId);

    const startedAt = Date.now();
    response.on("finish", () => {
      if (response.statusCode < 400 && !request.path.startsWith("/health")) {
        return;
      }

      const details = {
        correlationId: request.correlationId,
        method: request.method,
        route: request.route?.path ?? "<unmatched>",
        status: response.statusCode,
        durationMs: Date.now() - startedAt,
        ...(response.locals.errorCode
          ? { category: response.locals.errorCode }
          : {}),
      };

      if (response.statusCode >= 500) {
        logger.error("http.request.completed", details);
      } else if (response.statusCode >= 400) {
        logger.warn("http.request.completed", details);
      } else {
        logger.info("http.request.completed", details);
      }
    });

    next();
  };
}

function hasRequestBody(request) {
  return (
    request.headers["transfer-encoding"] !== undefined ||
    Number(request.headers["content-length"] ?? 0) > 0
  );
}

function parseJsonBody(request, _response, next) {
  if (!hasRequestBody(request)) {
    return next();
  }

  if (!request.is("application/json")) {
    return next(
      new HttpError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Requests with a body must use application/json.",
      ),
    );
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(request.body);
    const body = JSON.parse(text);
    if (body === null || typeof body !== "object") {
      throw new SyntaxError("JSON request body must be an object or array.");
    }
    request.body = body;
    return next();
  } catch {
    return next(
      new HttpError(400, "INVALID_JSON", "The request body contains invalid JSON."),
    );
  }
}

function publicError(error) {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }

  if (error?.type === "entity.too.large") {
    return {
      status: 413,
      code: "REQUEST_TOO_LARGE",
      message: "The request body exceeds the 64 KiB limit.",
    };
  }

  if (
    error?.type === "charset.unsupported" ||
    error?.type === "encoding.unsupported"
  ) {
    return {
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "The request body encoding is not supported.",
    };
  }

  return {
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  };
}

export function createErrorHandler() {
  return (error, request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }

    const safeError = publicError(error);
    response.locals.errorCode = safeError.code;
    const errorBody = {
      code: safeError.code,
      message: safeError.message,
      correlationId: request.correlationId,
    };
    if (safeError.fieldErrors !== undefined) {
      errorBody.fieldErrors = safeError.fieldErrors;
    }

    return response.status(safeError.status).json({ error: errorBody });
  };
}

export function createFoundationApp(service, logger, registerRoutes, { isReady = () => true } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(createRequestContextMiddleware(logger));
  app.use(express.raw({ type: () => true, limit: BODY_LIMIT_BYTES }));
  app.use(parseJsonBody);

  const health = (_request, response) => {
    response.json({ service, status: "ok" });
  };
  app.get("/health", health);
  app.get("/health/live", health);
  app.get("/health/ready", (request, response) => {
    if (!isReady()) {
      return response.status(503).json({ error: {
        code: "SERVICE_NOT_READY",
        message: "A required service dependency is unavailable.",
        correlationId: request.correlationId,
      } });
    }
    return health(request, response);
  });
  registerRoutes(app);

  app.use((_request, _response, next) => {
    next(new HttpError(404, "NOT_FOUND", "The requested resource was not found."));
  });
  app.use(createErrorHandler());
  return app;
}

export function registerGracefulShutdown(
  server,
  logger,
  { processRef = process, timeoutMs = 10_000, onShutdown } = {},
) {
  let shutdownPromise;

  const shutdown = (signal) => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    logger.info("server.shutdown.started", { signal });
    shutdownPromise = new Promise((resolve) => {
      const forceCloseTimer = setTimeout(() => {
        server.closeAllConnections();
      }, timeoutMs);
      forceCloseTimer.unref();

      server.close(async (error) => {
        clearTimeout(forceCloseTimer);
        if (error) {
          logger.error("server.shutdown.failed", {
            signal,
            category: "server_close_failed",
          });
          processRef.exitCode = 1;
        } else {
          logger.info("server.stopped", { signal });
        }
        try {
          await onShutdown?.();
        } catch {
          logger.error("server.shutdown.failed", {
            signal,
            category: "dependency_close_failed",
          });
          processRef.exitCode = 1;
        }
        resolve();
      });
    });

    return shutdownPromise;
  };

  processRef.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  processRef.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  return shutdown;
}
