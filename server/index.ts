import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initLogger, appLog, logRequest } from "./logger";

initLogger();

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  let responseSize = 0;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    const jsonStr = JSON.stringify(bodyJson);
    responseSize = Buffer.byteLength(jsonStr, "utf-8");
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  const originalResSend = res.send;
  res.send = function (body, ...args) {
    if (responseSize === 0 && body) {
      responseSize = typeof body === "string" ? Buffer.byteLength(body, "utf-8") : Buffer.isBuffer(body) ? body.length : 0;
    }
    return originalResSend.apply(res, [body, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);

      logRequest({
        timestamp: new Date().toISOString(),
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs: duration,
        bytesReturned: responseSize,
        requestBody: req.method !== "GET" ? req.body : undefined,
        responseBody: capturedJsonResponse,
        userAgent: req.headers["user-agent"],
      });
    }
  });

  next();
});

(async () => {
  appLog("INFO", "startup", "MetricForge server starting...");

  const { seedDatabase } = await import("./seed");
  await seedDatabase();
  appLog("INFO", "startup", "Database seeded");

  await registerRoutes(httpServer, app);
  appLog("INFO", "startup", "Routes registered");

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    appLog("ERROR", "server", `Unhandled error: ${message}`, { status, stack: err.stack });
    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      appLog("INFO", "startup", `Server listening on port ${port}`);
    },
  );
})();
