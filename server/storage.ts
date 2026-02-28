import {
  metricQueries, type MetricQuery, type InsertMetricQuery,
  datasources, type Datasource, type InsertDatasource,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
    return db.select().from(metricQueries).orderBy(metricQueries.createdAt);
  }

  async getQuery(id: string): Promise<MetricQuery | undefined> {
    const [query] = await db.select().from(metricQueries).where(eq(metricQueries.id, id));
    return query;
  }

  async createQuery(query: InsertMetricQuery): Promise<MetricQuery> {
    const [created] = await db.insert(metricQueries).values(query).returning();
    return created;
  }

  async updateQuery(id: string, query: Partial<InsertMetricQuery>): Promise<MetricQuery | undefined> {
    const [updated] = await db
      .update(metricQueries)
      .set({ ...query, updatedAt: new Date() })
      .where(eq(metricQueries.id, id))
      .returning();
    return updated;
  }

  async deleteQuery(id: string): Promise<boolean> {
    const result = await db.delete(metricQueries).where(eq(metricQueries.id, id)).returning();
    return result.length > 0;
  }

  async getDatasources(): Promise<Datasource[]> {
    return db.select().from(datasources).orderBy(datasources.createdAt);
  }

  async getDatasource(id: string): Promise<Datasource | undefined> {
    const [ds] = await db.select().from(datasources).where(eq(datasources.id, id));
    return ds;
  }

  async createDatasource(ds: InsertDatasource): Promise<Datasource> {
    if (ds.isDefault) {
      await db.update(datasources).set({ isDefault: false });
    }
    const [created] = await db.insert(datasources).values(ds).returning();
    return created;
  }

  async updateDatasource(id: string, ds: Partial<InsertDatasource>): Promise<Datasource | undefined> {
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
    const result = await db.delete(datasources).where(eq(datasources.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
