import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMetricQuerySchema, insertDatasourceSchema } from "@shared/schema";

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

  return httpServer;
}
