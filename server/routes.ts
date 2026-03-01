import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMetricQuerySchema, insertDatasourceSchema } from "@shared/schema";
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
