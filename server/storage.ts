import {
  metricQueries, type MetricQuery, type InsertMetricQuery,
  datasources, type Datasource, type InsertDatasource,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { appLog } from "./logger";

export interface IStorage {
  getQueries(): Promise<MetricQuery[]>;
  getQuery(id: string): Promise<MetricQuery | undefined>;
  createQuery(query: InsertMetricQuery): Promise<MetricQuery>;
  updateQuery(id: string, query: Partial<InsertMetricQuery>): Promise<MetricQuery | undefined>;
  deleteQuery(id: string): Promise<boolean>;

  getDatasources(): Promise<Datasource[]>;
  getDatasource(id: string): Promise<Datasource | undefined>;
  createDatasource(ds: InsertDatasource): Promise<Datasource>;
  updateDatasource(id: string, ds: Partial<InsertDatasource>): Promise<Datasource | undefined>;
  deleteDatasource(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getQueries(): Promise<MetricQuery[]> {
    appLog("DEBUG", "storage", "Fetching all queries");
    const result = await db.select().from(metricQueries).orderBy(metricQueries.createdAt);
    appLog("DEBUG", "storage", `Fetched ${result.length} queries`);
    return result;
  }

  async getQuery(id: string): Promise<MetricQuery | undefined> {
    appLog("DEBUG", "storage", `Fetching query: ${id}`);
    const [query] = await db.select().from(metricQueries).where(eq(metricQueries.id, id));
    return query;
  }

  async createQuery(query: InsertMetricQuery): Promise<MetricQuery> {
    appLog("INFO", "storage", `Creating query: ${query.name}`, { metricName: query.metricName });
    const [created] = await db.insert(metricQueries).values(query).returning();
    appLog("INFO", "storage", `Query created: ${created.id}`);
    return created;
  }

  async updateQuery(id: string, query: Partial<InsertMetricQuery>): Promise<MetricQuery | undefined> {
    appLog("INFO", "storage", `Updating query: ${id}`);
    const [updated] = await db
      .update(metricQueries)
      .set({ ...query, updatedAt: new Date() })
      .where(eq(metricQueries.id, id))
      .returning();
    return updated;
  }

  async deleteQuery(id: string): Promise<boolean> {
    appLog("INFO", "storage", `Deleting query: ${id}`);
    const result = await db.delete(metricQueries).where(eq(metricQueries.id, id)).returning();
    return result.length > 0;
  }

  async getDatasources(): Promise<Datasource[]> {
    appLog("DEBUG", "storage", "Fetching all datasources");
    const result = await db.select().from(datasources).orderBy(datasources.createdAt);
    appLog("DEBUG", "storage", `Fetched ${result.length} datasources`);
    return result;
  }

  async getDatasource(id: string): Promise<Datasource | undefined> {
    appLog("DEBUG", "storage", `Fetching datasource: ${id}`);
    const [ds] = await db.select().from(datasources).where(eq(datasources.id, id));
    return ds;
  }

  async createDatasource(ds: InsertDatasource): Promise<Datasource> {
    appLog("INFO", "storage", `Creating datasource: ${ds.name}`, { type: ds.type, url: ds.url });
    if (ds.isDefault) {
      await db.update(datasources).set({ isDefault: false });
    }
    const [created] = await db.insert(datasources).values(ds).returning();
    appLog("INFO", "storage", `Datasource created: ${created.id}`);
    return created;
  }

  async updateDatasource(id: string, ds: Partial<InsertDatasource>): Promise<Datasource | undefined> {
    appLog("INFO", "storage", `Updating datasource: ${id}`);
    if (ds.isDefault) {
      await db.update(datasources).set({ isDefault: false });
    }
    const [updated] = await db
      .update(datasources)
      .set({ ...ds, updatedAt: new Date() })
      .where(eq(datasources.id, id))
      .returning();
    return updated;
  }

  async deleteDatasource(id: string): Promise<boolean> {
    appLog("INFO", "storage", `Deleting datasource: ${id}`);
    const result = await db.delete(datasources).where(eq(datasources.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
