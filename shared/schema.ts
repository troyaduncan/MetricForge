import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export interface LabelMatcher {
  label: string;
  op: "=" | "!=" | "=~" | "!~";
  value: string;
}

export interface QueryOperation {
  id: string;
  type: string;
  params: Record<string, any>;
}

export interface SubQuery {
  id: string;
  letter: string;
  enabled: boolean;
  metricName: string;
  metricType: string;
  labels: LabelMatcher[];
  operations: QueryOperation[];
  expression: string;
  color: string;
}

export const datasources = pgTable("datasources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("prometheus"),
  url: text("url").notNull(),
  access: text("access").notNull().default("proxy"),
  basicAuth: boolean("basic_auth").notNull().default(false),
  basicAuthUser: text("basic_auth_user"),
  isDefault: boolean("is_default").notNull().default(false),
  customHeaders: jsonb("custom_headers").$type<Record<string, string>>().default({}),
  scrapeInterval: text("scrape_interval").default("15s"),
  queryTimeout: text("query_timeout").default("60s"),
  httpMethod: text("http_method").default("POST"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDatasourceSchema = createInsertSchema(datasources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDatasource = z.infer<typeof insertDatasourceSchema>;
export type Datasource = typeof datasources.$inferSelect;

export const metricQueries = pgTable("metric_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  expression: text("expression").notNull(),
  metricName: text("metric_name").notNull(),
  metricType: text("metric_type").notNull().default("counter"),
  labels: jsonb("labels").$type<LabelMatcher[]>().default([]),
  aggregation: text("aggregation"),
  range: text("range"),
  operations: jsonb("operations").$type<QueryOperation[]>().default([]),
  legendFormat: text("legend_format"),
  step: text("step"),
  queryType: text("query_type").default("range"),
  visualizationType: text("visualization_type").notNull().default("line"),
  subQueries: jsonb("sub_queries").$type<SubQuery[]>().default([]),
  datasourceId: varchar("datasource_id"),
  color: text("color").notNull().default("#E20074"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMetricQuerySchema = createInsertSchema(metricQueries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMetricQuery = z.infer<typeof insertMetricQuerySchema>;
export type MetricQuery = typeof metricQueries.$inferSelect;

export function normalizeLabelMatchers(labels: any): LabelMatcher[] {
  if (!labels) return [];
  if (Array.isArray(labels)) return labels as LabelMatcher[];
  if (typeof labels === "object") {
    return Object.entries(labels).map(([k, v]) => ({
      label: k,
      op: "=" as const,
      value: String(v),
    }));
  }
  return [];
}

export const METRIC_TYPES = ["counter", "gauge", "histogram", "summary"] as const;
export type MetricType = typeof METRIC_TYPES[number];

export const AGGREGATIONS = [
  "sum", "avg", "min", "max", "count", "stddev", "rate", "irate",
  "increase", "delta", "absent", "histogram_quantile",
] as const;
export type Aggregation = typeof AGGREGATIONS[number];

export const LABEL_OPERATORS = ["=", "!=", "=~", "!~"] as const;
export type LabelOperator = typeof LABEL_OPERATORS[number];

export const VISUALIZATION_TYPES = ["line", "area", "bar", "scatter", "pie", "donut", "sparkline"] as const;
export type VisualizationType = typeof VISUALIZATION_TYPES[number];

export const COMMON_LABELS = [
  "instance", "job", "env", "region", "cluster", "namespace",
  "pod", "container", "service", "method", "status_code", "handler", "endpoint",
] as const;

export const COMMON_METRICS = [
  { name: "http_requests_total", type: "counter", description: "Total number of HTTP requests" },
  { name: "http_request_duration_seconds", type: "histogram", description: "HTTP request duration in seconds" },
  { name: "node_cpu_seconds_total", type: "counter", description: "Total CPU time spent in each mode" },
  { name: "node_memory_bytes_total", type: "gauge", description: "Total memory in bytes" },
  { name: "node_disk_io_time_seconds_total", type: "counter", description: "Total disk I/O time" },
  { name: "process_resident_memory_bytes", type: "gauge", description: "Resident memory size in bytes" },
  { name: "go_goroutines", type: "gauge", description: "Number of goroutines" },
  { name: "up", type: "gauge", description: "Target up/down status" },
  { name: "prometheus_http_requests_total", type: "counter", description: "Prometheus HTTP requests" },
  { name: "container_cpu_usage_seconds_total", type: "counter", description: "Container CPU usage" },
  { name: "container_memory_usage_bytes", type: "gauge", description: "Container memory usage" },
  { name: "kube_pod_status_phase", type: "gauge", description: "Kubernetes pod status" },
  { name: "api_response_time_seconds", type: "histogram", description: "API response time" },
  { name: "database_connections_active", type: "gauge", description: "Active database connections" },
  { name: "error_rate_total", type: "counter", description: "Total error count" },
] as const;

export const CHART_COLORS = [
  "#E20074", "#FF2D8A", "#B5005C", "#FF6DB3", "#9B0050",
  "#FF99CC", "#C7006A", "#FF4DA6", "#A30060", "#D4007F",
] as const;

export const RANGE_INTERVALS = [
  "1m", "5m", "10m", "15m", "30m", "1h", "2h", "6h", "12h", "24h", "2d", "7d", "30d",
] as const;

export interface OperationParamDef {
  name: string;
  type: "range" | "labels" | "number" | "string";
  default?: any;
  required?: boolean;
  label?: string;
}

export interface OperationDef {
  category: string;
  description: string;
  params: OperationParamDef[];
  requiresRange?: boolean;
}

export const OPERATION_DEFINITIONS: Record<string, OperationDef> = {
  rate: { category: "Range functions", description: "Per-second rate of increase", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  irate: { category: "Range functions", description: "Per-second instant rate", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  increase: { category: "Range functions", description: "Total increase over range", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  delta: { category: "Range functions", description: "Difference between first and last", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  changes: { category: "Range functions", description: "Number of value changes", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  resets: { category: "Range functions", description: "Number of counter resets", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  deriv: { category: "Range functions", description: "Per-second derivative using linear regression", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  avg_over_time: { category: "Range functions", description: "Average value over time range", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  min_over_time: { category: "Range functions", description: "Minimum value over time range", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  max_over_time: { category: "Range functions", description: "Maximum value over time range", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  sum_over_time: { category: "Range functions", description: "Sum of values over time range", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  count_over_time: { category: "Range functions", description: "Count of samples over time range", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  last_over_time: { category: "Range functions", description: "Most recent value over time range", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  quantile_over_time: { category: "Range functions", description: "Quantile of values over time range", params: [{ name: "quantile", type: "number", default: 0.95, required: true, label: "Quantile" }, { name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  stddev_over_time: { category: "Range functions", description: "Standard deviation over time range", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }], requiresRange: true },
  predict_linear: { category: "Range functions", description: "Predict value using linear regression", params: [{ name: "range", type: "range", default: "5m", required: true, label: "Range" }, { name: "t", type: "number", default: 3600, required: true, label: "Seconds ahead" }], requiresRange: true },

  sum: { category: "Aggregations", description: "Sum of values", params: [{ name: "by", type: "labels", label: "Group by" }] },
  avg: { category: "Aggregations", description: "Average of values", params: [{ name: "by", type: "labels", label: "Group by" }] },
  min: { category: "Aggregations", description: "Minimum value", params: [{ name: "by", type: "labels", label: "Group by" }] },
  max: { category: "Aggregations", description: "Maximum value", params: [{ name: "by", type: "labels", label: "Group by" }] },
  count: { category: "Aggregations", description: "Count of elements", params: [{ name: "by", type: "labels", label: "Group by" }] },
  group: { category: "Aggregations", description: "Group elements (returns 1 per group)", params: [{ name: "by", type: "labels", label: "Group by" }] },
  stddev: { category: "Aggregations", description: "Standard deviation", params: [{ name: "by", type: "labels", label: "Group by" }] },
  stdvar: { category: "Aggregations", description: "Standard variance", params: [{ name: "by", type: "labels", label: "Group by" }] },
  topk: { category: "Aggregations", description: "Top K elements by value", params: [{ name: "k", type: "number", default: 5, required: true, label: "K" }, { name: "by", type: "labels", label: "Group by" }] },
  bottomk: { category: "Aggregations", description: "Bottom K elements by value", params: [{ name: "k", type: "number", default: 5, required: true, label: "K" }, { name: "by", type: "labels", label: "Group by" }] },
  count_values: { category: "Aggregations", description: "Count occurrences of each unique value", params: [{ name: "label", type: "string", default: "value", required: true, label: "Output label" }] },
  quantile: { category: "Aggregations", description: "Calculate quantile over dimensions", params: [{ name: "quantile", type: "number", default: 0.95, required: true, label: "Quantile" }, { name: "by", type: "labels", label: "Group by" }] },
  histogram_quantile: { category: "Aggregations", description: "Calculate histogram quantile from buckets", params: [{ name: "quantile", type: "number", default: 0.95, required: true, label: "Quantile" }] },

  abs: { category: "Math", description: "Absolute value", params: [] },
  ceil: { category: "Math", description: "Round up to nearest integer", params: [] },
  floor: { category: "Math", description: "Round down to nearest integer", params: [] },
  round: { category: "Math", description: "Round to nearest integer", params: [{ name: "to_nearest", type: "number", label: "To nearest (optional)" }] },
  clamp: { category: "Math", description: "Clamp values between min and max", params: [{ name: "min", type: "number", default: 0, required: true, label: "Min" }, { name: "max", type: "number", default: 100, required: true, label: "Max" }] },
  clamp_min: { category: "Math", description: "Clamp values to minimum", params: [{ name: "min", type: "number", default: 0, required: true, label: "Min" }] },
  clamp_max: { category: "Math", description: "Clamp values to maximum", params: [{ name: "max", type: "number", default: 100, required: true, label: "Max" }] },
  ln: { category: "Math", description: "Natural logarithm", params: [] },
  log2: { category: "Math", description: "Base-2 logarithm", params: [] },
  log10: { category: "Math", description: "Base-10 logarithm", params: [] },
  exp: { category: "Math", description: "Exponential function", params: [] },
  sqrt: { category: "Math", description: "Square root", params: [] },
  sgn: { category: "Math", description: "Sign function (-1, 0, or 1)", params: [] },
  sort: { category: "Math", description: "Sort by value ascending", params: [] },
  sort_desc: { category: "Math", description: "Sort by value descending", params: [] },
  absent: { category: "Math", description: "Returns 1 if metric is absent", params: [] },

  timestamp: { category: "Time functions", description: "Timestamp of each sample", params: [] },
  day_of_month: { category: "Time functions", description: "Day of month (1-31)", params: [] },
  day_of_week: { category: "Time functions", description: "Day of week (0=Sunday)", params: [] },
  day_of_year: { category: "Time functions", description: "Day of year (1-366)", params: [] },
  days_in_month: { category: "Time functions", description: "Number of days in current month", params: [] },
  hour: { category: "Time functions", description: "Hour of the day (0-23)", params: [] },
  minute: { category: "Time functions", description: "Minute of the hour (0-59)", params: [] },
  month: { category: "Time functions", description: "Month of the year (1-12)", params: [] },
  year: { category: "Time functions", description: "Year", params: [] },

  label_replace: { category: "Label functions", description: "Replace label values using regex", params: [{ name: "dst_label", type: "string", required: true, label: "Destination label" }, { name: "replacement", type: "string", required: true, label: "Replacement" }, { name: "src_label", type: "string", required: true, label: "Source label" }, { name: "regex", type: "string", default: "(.*)", required: true, label: "Regex" }] },
  label_join: { category: "Label functions", description: "Join label values into a new label", params: [{ name: "dst_label", type: "string", required: true, label: "Destination label" }, { name: "separator", type: "string", default: ",", required: true, label: "Separator" }, { name: "src_labels", type: "string", required: true, label: "Source labels (comma-separated)" }] },

  multiply: { category: "Binary operations", description: "Multiply by scalar", params: [{ name: "value", type: "number", default: 1, required: true, label: "Value" }] },
  divide: { category: "Binary operations", description: "Divide by scalar", params: [{ name: "value", type: "number", default: 1, required: true, label: "Value" }] },
  add: { category: "Binary operations", description: "Add scalar", params: [{ name: "value", type: "number", default: 0, required: true, label: "Value" }] },
  subtract: { category: "Binary operations", description: "Subtract scalar", params: [{ name: "value", type: "number", default: 0, required: true, label: "Value" }] },
  modulo: { category: "Binary operations", description: "Modulo by scalar", params: [{ name: "value", type: "number", default: 1, required: true, label: "Value" }] },
  power: { category: "Binary operations", description: "Raise to power", params: [{ name: "value", type: "number", default: 2, required: true, label: "Exponent" }] },
};

export const OPERATION_CATEGORIES = [
  "Range functions",
  "Aggregations",
  "Math",
  "Time functions",
  "Label functions",
  "Binary operations",
] as const;
