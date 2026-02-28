import { db } from "./db";
import { metricQueries } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(metricQueries);
  if (Number(existing[0].count) > 0) return;

  const seedQueries: (typeof metricQueries.$inferInsert)[] = [
    {
      name: "HTTP Request Rate",
      description: "Rate of incoming HTTP requests per second across all instances",
      expression: 'rate(http_requests_total{job="api-server"}[5m])',
      metricName: "http_requests_total",
      metricType: "counter",
      labels: [{ label: "job", op: "=", value: "api-server" }],
      operations: [{ id: "op-1", type: "rate", params: { range: "5m" } }],
      visualizationType: "line",
      color: "#E20074",
      isFavorite: true,
      queryType: "range",
    },
    {
      name: "CPU Usage",
      description: "Average CPU seconds consumed per node",
      expression: 'avg(rate(node_cpu_seconds_total{env="production"}[5m]))',
      metricName: "node_cpu_seconds_total",
      metricType: "counter",
      labels: [{ label: "env", op: "=", value: "production" }],
      operations: [
        { id: "op-2", type: "rate", params: { range: "5m" } },
        { id: "op-3", type: "avg", params: { by: [] } },
      ],
      visualizationType: "area",
      color: "#FF2D8A",
      isFavorite: true,
      queryType: "range",
    },
    {
      name: "Memory Usage",
      description: "Current resident memory per service",
      expression: 'process_resident_memory_bytes{namespace="default"}',
      metricName: "process_resident_memory_bytes",
      metricType: "gauge",
      labels: [{ label: "namespace", op: "=", value: "default" }],
      operations: [],
      visualizationType: "area",
      color: "#B5005C",
      isFavorite: false,
      queryType: "range",
    },
    {
      name: "API Response Latency P95",
      description: "95th percentile API response time",
      expression: 'histogram_quantile(0.95, rate(api_response_time_seconds{service="checkout"}[5m]))',
      metricName: "api_response_time_seconds",
      metricType: "histogram",
      labels: [{ label: "service", op: "=", value: "checkout" }],
      operations: [
        { id: "op-4", type: "rate", params: { range: "5m" } },
        { id: "op-5", type: "histogram_quantile", params: { quantile: 0.95 } },
      ],
      visualizationType: "line",
      color: "#FF6DB3",
      isFavorite: true,
      queryType: "range",
    },
    {
      name: "Error Rate",
      description: "Total error rate across all services",
      expression: 'sum(rate(error_rate_total{env="production"}[5m]))',
      metricName: "error_rate_total",
      metricType: "counter",
      labels: [{ label: "env", op: "=", value: "production" }],
      operations: [
        { id: "op-6", type: "rate", params: { range: "5m" } },
        { id: "op-7", type: "sum", params: { by: [] } },
      ],
      visualizationType: "bar",
      color: "#9B0050",
      isFavorite: false,
      queryType: "range",
    },
    {
      name: "Traffic by Endpoint",
      description: "Request distribution across API endpoints with drill-down",
      expression: 'sum by (handler)(rate(http_requests_total[5m]))',
      metricName: "http_requests_total",
      metricType: "counter",
      labels: [],
      operations: [
        { id: "op-8", type: "rate", params: { range: "5m" } },
        { id: "op-9", type: "sum", params: { by: ["handler"] } },
      ],
      visualizationType: "pie",
      color: "#E20074",
      isFavorite: true,
      queryType: "range",
    },
    {
      name: "Memory by Region",
      description: "Memory usage distribution across infrastructure regions",
      expression: 'sum by (region)(process_resident_memory_bytes)',
      metricName: "process_resident_memory_bytes",
      metricType: "gauge",
      labels: [],
      operations: [
        { id: "op-10", type: "sum", params: { by: ["region"] } },
      ],
      visualizationType: "donut",
      color: "#B5005C",
      isFavorite: false,
      queryType: "range",
    },
    {
      name: "Active Connections",
      description: "Live database connection count trend",
      expression: 'database_connections_active{service="primary"}',
      metricName: "database_connections_active",
      metricType: "gauge",
      labels: [{ label: "service", op: "=", value: "primary" }],
      operations: [],
      visualizationType: "sparkline",
      color: "#C7006A",
      isFavorite: false,
      queryType: "range",
    },
    {
      name: "Latency Scatter",
      description: "API response latency distribution scatter plot",
      expression: 'histogram_quantile(0.95, rate(http_request_duration_seconds[5m]))',
      metricName: "http_request_duration_seconds",
      metricType: "histogram",
      labels: [],
      operations: [
        { id: "op-11", type: "rate", params: { range: "5m" } },
        { id: "op-12", type: "histogram_quantile", params: { quantile: 0.95 } },
      ],
      visualizationType: "scatter",
      color: "#FF4DA6",
      isFavorite: false,
      queryType: "range",
    },
  ];

  await db.insert(metricQueries).values(seedQueries);
  console.log("Seeded database with sample metric queries");
}
