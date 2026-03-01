import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMetricQuerySchema, insertDatasourceSchema, METRICS_CATALOG } from "@shared/schema";
import {
  appLog, getConfig, updateConfig, getLogs, getRequestLogs,
  getLogFiles, getLogFileContent, clearLogs, getCurrentLogFile,
  type LogLevel,
} from "./logger";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/queries", async (_req, res) => {
    try {
      const queries = await storage.getQueries();
      res.json(queries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch queries" });
    }
  });

  app.get("/api/queries/:id", async (req, res) => {
    try {
      const query = await storage.getQuery(req.params.id);
      if (!query) {
        return res.status(404).json({ error: "Query not found" });
      }
      res.json(query);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch query" });
    }
  });

  app.post("/api/queries", async (req, res) => {
    try {
      const parsed = insertMetricQuerySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const query = await storage.createQuery(parsed.data);
      res.status(201).json(query);
    } catch (error) {
      res.status(500).json({ error: "Failed to create query" });
    }
  });

  app.patch("/api/queries/:id", async (req, res) => {
    try {
      const partialSchema = insertMetricQuerySchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const query = await storage.updateQuery(req.params.id, parsed.data);
      if (!query) {
        return res.status(404).json({ error: "Query not found" });
      }
      res.json(query);
    } catch (error) {
      res.status(500).json({ error: "Failed to update query" });
    }
  });

  app.delete("/api/queries/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteQuery(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Query not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete query" });
    }
  });

  app.get("/api/datasources", async (_req, res) => {
    try {
      const ds = await storage.getDatasources();
      res.json(ds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch datasources" });
    }
  });

  app.get("/api/datasources/:id", async (req, res) => {
    try {
      const ds = await storage.getDatasource(req.params.id);
      if (!ds) {
        return res.status(404).json({ error: "Datasource not found" });
      }
      res.json(ds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch datasource" });
    }
  });

  app.post("/api/datasources", async (req, res) => {
    try {
      const parsed = insertDatasourceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const ds = await storage.createDatasource(parsed.data);
      res.status(201).json(ds);
    } catch (error) {
      res.status(500).json({ error: "Failed to create datasource" });
    }
  });

  app.patch("/api/datasources/:id", async (req, res) => {
    try {
      const partialSchema = insertDatasourceSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const ds = await storage.updateDatasource(req.params.id, parsed.data);
      if (!ds) {
        return res.status(404).json({ error: "Datasource not found" });
      }
      res.json(ds);
    } catch (error) {
      res.status(500).json({ error: "Failed to update datasource" });
    }
  });

  app.delete("/api/datasources/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDatasource(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Datasource not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete datasource" });
    }
  });

  app.post("/api/datasources/:id/test", async (req, res) => {
    try {
      const ds = await storage.getDatasource(req.params.id);
      if (!ds) {
        return res.status(404).json({ error: "Datasource not found" });
      }
      appLog("INFO", "datasource", `Testing connectivity to datasource "${ds.name}" at ${ds.url}`);
      const startTime = Date.now();
      const timeoutMs = ds.queryTimeout ? parseInt(ds.queryTimeout) * 1000 || 5000 : 5000;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, 10000));
        const headers: Record<string, string> = { "Accept": "application/json" };
        if (ds.basicAuth && ds.basicAuthUser) {
          headers["Authorization"] = `Basic ${Buffer.from(`${ds.basicAuthUser}:`).toString("base64")}`;
        }
        if (ds.customHeaders && typeof ds.customHeaders === "object") {
          Object.entries(ds.customHeaders).forEach(([k, v]) => { headers[k] = v; });
        }
        const response = await fetch(`${ds.url}/api/v1/status/buildinfo`, {
          method: "GET",
          signal: controller.signal,
          headers,
        });
        clearTimeout(timeout);
        const latency = Date.now() - startTime;
        if (response.ok) {
          const data = await response.json().catch(() => null);
          appLog("INFO", "datasource", `Connectivity test PASSED for "${ds.name}" (${latency}ms)`);
          res.json({
            success: true,
            message: `Successfully connected to ${ds.name}`,
            latencyMs: latency,
            statusCode: response.status,
            version: data?.data?.version || data?.version || null,
          });
        } else {
          appLog("WARN", "datasource", `Connectivity test returned status ${response.status} for "${ds.name}"`);
          res.json({
            success: false,
            message: `Connection returned HTTP ${response.status}: ${response.statusText}`,
            latencyMs: latency,
            statusCode: response.status,
          });
        }
      } catch (fetchError: any) {
        const latency = Date.now() - startTime;
        const errorMsg = fetchError.name === "AbortError"
          ? "Connection timed out after 5 seconds"
          : fetchError.code === "ECONNREFUSED"
            ? `Connection refused at ${ds.url}`
            : fetchError.code === "ENOTFOUND"
              ? `DNS lookup failed for ${ds.url}`
              : fetchError.message || "Unknown connection error";
        appLog("WARN", "datasource", `Connectivity test FAILED for "${ds.name}": ${errorMsg}`);
        res.json({
          success: false,
          message: errorMsg,
          latencyMs: latency,
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to test datasource connectivity" });
    }
  });

  app.get("/api/metrics/catalog", async (_req, res) => {
    try {
      const allDs = await storage.getDatasources();
      const defaultDs = allDs.find((d) => d.isDefault) || (allDs.length > 0 ? allDs[0] : null);
      res.json({
        datasource: defaultDs ? { id: defaultDs.id, name: defaultDs.name, type: defaultDs.type, url: defaultDs.url } : null,
        metrics: METRICS_CATALOG,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics catalog" });
    }
  });

  app.get("/api/logs/config", (_req, res) => {
    res.json(getConfig());
  });

  app.patch("/api/logs/config", (req, res) => {
    try {
      const allowed: (keyof import("./logger").LogConfig)[] = [
        "level", "consoleOutput", "fileOutput", "maxFiles",
        "logApiRequests", "logApiResponses", "logDbQueries",
      ];
      const updates: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      }
      updateConfig(updates);
      res.json(getConfig());
    } catch (error) {
      res.status(500).json({ error: "Failed to update log config" });
    }
  });

  app.get("/api/logs/app", (req, res) => {
    const { level, category, limit, offset, search } = req.query;
    const result = getLogs({
      level: level as LogLevel | undefined,
      category: category as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      search: search as string | undefined,
    });
    res.json(result);
  });

  app.get("/api/logs/requests", (req, res) => {
    const { limit, offset, method, statusCode, path: filterPath } = req.query;
    const result = getRequestLogs({
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      method: method as string | undefined,
      statusCode: statusCode ? parseInt(statusCode as string) : undefined,
      path: filterPath as string | undefined,
    });
    res.json(result);
  });

  app.get("/api/logs/files", (_req, res) => {
    res.json(getLogFiles());
  });

  app.get("/api/logs/files/:filename", (req, res) => {
    const content = getLogFileContent(req.params.filename);
    if (content === null) {
      return res.status(404).json({ error: "Log file not found" });
    }
    res.json({ filename: req.params.filename, content });
  });

  app.get("/api/logs/current", (_req, res) => {
    res.json({ filename: getCurrentLogFile() });
  });

  app.post("/api/logs/clear", (_req, res) => {
    clearLogs();
    appLog("INFO", "api", "Logs cleared via admin API");
    res.json({ message: "Logs cleared" });
  });

  return httpServer;
}
