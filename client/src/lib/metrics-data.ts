import type { LabelMatcher, QueryOperation } from "@shared/schema";

export function generateTimeSeriesData(
  metricType: string,
  timeRange: string = "1h",
  points: number = 60
): { time: string; value: number; value2?: number }[] {
  const data: { time: string; value: number; value2?: number }[] = [];
  const now = new Date();
  
  let intervalMs: number;
  switch (timeRange) {
    case "5m": intervalMs = (5 * 60 * 1000) / points; break;
    case "15m": intervalMs = (15 * 60 * 1000) / points; break;
    case "30m": intervalMs = (30 * 60 * 1000) / points; break;
    case "1h": intervalMs = (60 * 60 * 1000) / points; break;
    case "3h": intervalMs = (3 * 60 * 60 * 1000) / points; break;
    case "6h": intervalMs = (6 * 60 * 60 * 1000) / points; break;
    case "12h": intervalMs = (12 * 60 * 60 * 1000) / points; break;
    case "24h": intervalMs = (24 * 60 * 60 * 1000) / points; break;
    default: intervalMs = (60 * 60 * 1000) / points;
  }

  let base: number;
  let amplitude: number;

  switch (metricType) {
    case "counter":
      base = 1000;
      for (let i = 0; i < points; i++) {
        const t = new Date(now.getTime() - (points - i) * intervalMs);
        base += Math.random() * 50 + 10;
        data.push({
          time: formatTime(t),
          value: Math.round(base),
        });
      }
      return data;
    case "gauge":
      base = 60 + Math.random() * 20;
      amplitude = 15;
      break;
    case "histogram":
      base = 0.2;
      amplitude = 0.15;
      break;
    case "summary":
      base = 0.5;
      amplitude = 0.3;
      break;
    default:
      base = 100;
      amplitude = 30;
  }

  for (let i = 0; i < points; i++) {
    const t = new Date(now.getTime() - (points - i) * intervalMs);
    const noise = (Math.random() - 0.5) * amplitude;
    const trend = Math.sin((i / points) * Math.PI * 2) * (amplitude * 0.5);
    const spike = Math.random() > 0.92 ? amplitude * 2 : 0;
    let value = base + noise + trend + spike;
    
    if (metricType === "histogram") {
      value = Math.max(0.01, value);
      data.push({
        time: formatTime(t),
        value: parseFloat(value.toFixed(4)),
        value2: parseFloat((value * (0.5 + Math.random() * 0.5)).toFixed(4)),
      });
    } else {
      data.push({
        time: formatTime(t),
        value: metricType === "gauge" ? parseFloat(value.toFixed(2)) : Math.round(Math.max(0, value)),
      });
    }
  }

  return data;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function buildLabelString(matchers: LabelMatcher[]): string {
  const parts = matchers
    .filter((m) => m.label && m.value)
    .map((m) => `${m.label}${m.op}"${m.value}"`);
  return parts.length > 0 ? `{${parts.join(", ")}}` : "";
}

export function buildPromQLFromOperations(
  metricName: string,
  labelMatchers: LabelMatcher[],
  operations: QueryOperation[]
): string {
  if (!metricName) return "";

  const labelStr = buildLabelString(labelMatchers);
  let expr = `${metricName}${labelStr}`;

  for (const op of operations) {
    expr = applyOperation(expr, op);
  }

  return expr;
}

function applyOperation(expr: string, op: QueryOperation): string {
  const range = op.params?.range || "5m";
  const byLabels = op.params?.by as string[] | undefined;
  const without = op.params?.without as boolean;

  switch (op.type) {
    case "rate":
    case "irate":
    case "increase":
    case "delta":
    case "changes":
    case "resets":
    case "deriv":
    case "avg_over_time":
    case "min_over_time":
    case "max_over_time":
    case "sum_over_time":
    case "count_over_time":
    case "last_over_time":
    case "stddev_over_time":
      return `${op.type}(${expr}[${range}])`;

    case "predict_linear": {
      const t = op.params?.t || 3600;
      return `predict_linear(${expr}[${range}], ${t})`;
    }

    case "quantile_over_time": {
      const q = op.params?.quantile ?? 0.95;
      return `quantile_over_time(${q}, ${expr}[${range}])`;
    }

    case "sum":
    case "avg":
    case "min":
    case "max":
    case "count":
    case "group":
    case "stddev":
    case "stdvar": {
      if (byLabels && byLabels.length > 0) {
        const clause = without ? "without" : "by";
        return `${op.type} ${clause} (${byLabels.join(", ")})(${expr})`;
      }
      return `${op.type}(${expr})`;
    }

    case "topk":
    case "bottomk": {
      const k = op.params?.k || 5;
      if (byLabels && byLabels.length > 0) {
        const clause = without ? "without" : "by";
        return `${op.type} ${clause} (${byLabels.join(", ")})(${k}, ${expr})`;
      }
      return `${op.type}(${k}, ${expr})`;
    }

    case "count_values": {
      const label = op.params?.label || "value";
      return `count_values("${label}", ${expr})`;
    }

    case "quantile": {
      const q = op.params?.quantile ?? 0.95;
      if (byLabels && byLabels.length > 0) {
        const clause = without ? "without" : "by";
        return `quantile ${clause} (${byLabels.join(", ")})(${q}, ${expr})`;
      }
      return `quantile(${q}, ${expr})`;
    }

    case "histogram_quantile": {
      const q = op.params?.quantile ?? 0.95;
      return `histogram_quantile(${q}, ${expr})`;
    }

    case "abs":
    case "ceil":
    case "floor":
    case "ln":
    case "log2":
    case "log10":
    case "exp":
    case "sqrt":
    case "sgn":
    case "sort":
    case "sort_desc":
    case "absent":
    case "timestamp":
    case "day_of_month":
    case "day_of_week":
    case "day_of_year":
    case "days_in_month":
    case "hour":
    case "minute":
    case "month":
    case "year":
      return `${op.type}(${expr})`;

    case "round": {
      const toNearest = op.params?.to_nearest;
      if (toNearest) return `round(${expr}, ${toNearest})`;
      return `round(${expr})`;
    }

    case "clamp":
      return `clamp(${expr}, ${op.params?.min ?? 0}, ${op.params?.max ?? 100})`;
    case "clamp_min":
      return `clamp_min(${expr}, ${op.params?.min ?? 0})`;
    case "clamp_max":
      return `clamp_max(${expr}, ${op.params?.max ?? 100})`;

    case "label_replace": {
      const dst = op.params?.dst_label || "dst";
      const replacement = op.params?.replacement || "$1";
      const src = op.params?.src_label || "src";
      const regex = op.params?.regex || "(.*)";
      return `label_replace(${expr}, "${dst}", "${replacement}", "${src}", "${regex}")`;
    }
    case "label_join": {
      const dst = op.params?.dst_label || "dst";
      const sep = op.params?.separator || ",";
      const srcLabels = op.params?.src_labels || "";
      const srcs = srcLabels.split(",").map((s: string) => `"${s.trim()}"`).join(", ");
      return `label_join(${expr}, "${dst}", "${sep}", ${srcs})`;
    }

    case "multiply":
      return `${expr} * ${op.params?.value ?? 1}`;
    case "divide":
      return `${expr} / ${op.params?.value ?? 1}`;
    case "add":
      return `${expr} + ${op.params?.value ?? 0}`;
    case "subtract":
      return `${expr} - ${op.params?.value ?? 0}`;
    case "modulo":
      return `${expr} % ${op.params?.value ?? 1}`;
    case "power":
      return `${expr} ^ ${op.params?.value ?? 2}`;

    default:
      return `${op.type}(${expr})`;
  }
}

export function buildPromQLExpression(
  metricName: string,
  labels: Record<string, string> | LabelMatcher[],
  aggregation?: string,
  range?: string
): string {
  let matchers: LabelMatcher[];
  if (Array.isArray(labels)) {
    matchers = labels;
  } else {
    matchers = Object.entries(labels).map(([k, v]) => ({
      label: k,
      op: "=" as const,
      value: v,
    }));
  }

  const labelStr = buildLabelString(matchers);
  let base = `${metricName}${labelStr}`;

  if (range) {
    base = `${base}[${range}]`;
  }

  if (aggregation) {
    if (["rate", "irate", "increase", "delta"].includes(aggregation)) {
      if (!range) {
        base = `${metricName}${labelStr}[5m]`;
      }
      return `${aggregation}(${base})`;
    }
    if (aggregation === "histogram_quantile") {
      return `histogram_quantile(0.95, rate(${metricName}${labelStr}[5m]))`;
    }
    return `${aggregation}(${base})`;
  }

  return base;
}

export const TIME_RANGES = [
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "30m", value: "30m" },
  { label: "1h", value: "1h" },
  { label: "3h", value: "3h" },
  { label: "6h", value: "6h" },
  { label: "12h", value: "12h" },
  { label: "24h", value: "24h" },
] as const;

export interface PieSlice {
  name: string;
  value: number;
  color: string;
  drillDown?: DrillDownNode[];
}

export interface DrillDownNode {
  name: string;
  value: number;
  color: string;
  metricType: string;
  expression: string;
  children?: DrillDownNode[];
}

const SLICE_COLORS = [
  "#E20074", "#FF2D8A", "#B5005C", "#FF6DB3", "#9B0050",
  "#FF99CC", "#C7006A", "#FF4DA6", "#A30060", "#D4007F",
];

const PIE_CATEGORIES: Record<string, { slices: { name: string; baseValue: number }[]; drillDowns: Record<string, { name: string; baseValue: number; metricType: string }[]> }> = {
  counter: {
    slices: [
      { name: "GET /api/v1", baseValue: 4200 },
      { name: "POST /api/v1", baseValue: 1800 },
      { name: "GET /api/v2", baseValue: 2600 },
      { name: "DELETE /api", baseValue: 400 },
      { name: "PUT /api", baseValue: 900 },
      { name: "PATCH /api", baseValue: 600 },
    ],
    drillDowns: {
      "GET /api/v1": [
        { name: "/users", baseValue: 1500, metricType: "counter" },
        { name: "/products", baseValue: 1200, metricType: "counter" },
        { name: "/orders", baseValue: 800, metricType: "counter" },
        { name: "/health", baseValue: 700, metricType: "counter" },
      ],
      "POST /api/v1": [
        { name: "/users", baseValue: 600, metricType: "counter" },
        { name: "/orders", baseValue: 500, metricType: "counter" },
        { name: "/payments", baseValue: 400, metricType: "counter" },
        { name: "/auth/login", baseValue: 300, metricType: "counter" },
      ],
    },
  },
  gauge: {
    slices: [
      { name: "us-east-1", baseValue: 65 },
      { name: "us-west-2", baseValue: 72 },
      { name: "eu-west-1", baseValue: 58 },
      { name: "ap-south-1", baseValue: 45 },
      { name: "eu-central-1", baseValue: 52 },
    ],
    drillDowns: {
      "us-east-1": [
        { name: "web-server-1", baseValue: 28, metricType: "gauge" },
        { name: "web-server-2", baseValue: 22, metricType: "gauge" },
        { name: "api-server-1", baseValue: 15, metricType: "gauge" },
      ],
      "us-west-2": [
        { name: "web-server-3", baseValue: 30, metricType: "gauge" },
        { name: "api-server-2", baseValue: 25, metricType: "gauge" },
        { name: "worker-1", baseValue: 17, metricType: "gauge" },
      ],
    },
  },
  histogram: {
    slices: [
      { name: "<100ms", baseValue: 3500 },
      { name: "100-250ms", baseValue: 2200 },
      { name: "250-500ms", baseValue: 900 },
      { name: "500ms-1s", baseValue: 300 },
      { name: ">1s", baseValue: 100 },
    ],
    drillDowns: {
      "<100ms": [
        { name: "/health", baseValue: 1500, metricType: "counter" },
        { name: "/status", baseValue: 1200, metricType: "counter" },
        { name: "/ping", baseValue: 800, metricType: "counter" },
      ],
      ">1s": [
        { name: "/reports/generate", baseValue: 40, metricType: "histogram" },
        { name: "/export/csv", baseValue: 35, metricType: "histogram" },
        { name: "/analytics/compute", baseValue: 25, metricType: "histogram" },
      ],
    },
  },
  summary: {
    slices: [
      { name: "p50", baseValue: 120 },
      { name: "p75", baseValue: 250 },
      { name: "p90", baseValue: 480 },
      { name: "p95", baseValue: 650 },
      { name: "p99", baseValue: 980 },
    ],
    drillDowns: {
      "p99": [
        { name: "checkout-service", baseValue: 350, metricType: "summary" },
        { name: "payment-gateway", baseValue: 380, metricType: "summary" },
        { name: "inventory-sync", baseValue: 250, metricType: "summary" },
      ],
    },
  },
};

export function generatePieData(metricType: string): PieSlice[] {
  const config = PIE_CATEGORIES[metricType] || PIE_CATEGORIES.counter;
  return config.slices.map((slice, i) => {
    const jitter = 1 + (Math.random() - 0.5) * 0.3;
    const drillDownConfig = config.drillDowns[slice.name];
    const drillDown: DrillDownNode[] | undefined = drillDownConfig?.map((dd, j) => ({
      name: dd.name,
      value: Math.round(dd.baseValue * (1 + (Math.random() - 0.5) * 0.3)),
      color: SLICE_COLORS[(i * 3 + j) % SLICE_COLORS.length],
      metricType: dd.metricType,
      expression: `rate(${slice.name.replace(/[^a-z0-9_]/gi, "_")}${dd.name.replace(/[^a-z0-9_]/gi, "_")}[5m])`,
      children: generateDrillDownChildren(dd.name, dd.baseValue, i + j),
    }));
    return {
      name: slice.name,
      value: Math.round(slice.baseValue * jitter),
      color: SLICE_COLORS[i % SLICE_COLORS.length],
      drillDown,
    };
  });
}

function generateDrillDownChildren(parentName: string, parentValue: number, seed: number): DrillDownNode[] {
  const instances = ["pod-a", "pod-b", "pod-c"];
  return instances.map((inst, i) => ({
    name: `${parentName}/${inst}`,
    value: Math.round((parentValue / 3) * (1 + (Math.random() - 0.5) * 0.4)),
    color: SLICE_COLORS[(seed + i + 3) % SLICE_COLORS.length],
    metricType: "gauge",
    expression: `${parentName}{instance="${inst}"}`,
  }));
}

export function generateSparklineData(metricType: string, points: number = 20): number[] {
  const data: number[] = [];
  let base: number;
  let amplitude: number;

  switch (metricType) {
    case "counter": base = 100; amplitude = 30; break;
    case "gauge": base = 60; amplitude = 15; break;
    case "histogram": base = 0.2; amplitude = 0.1; break;
    case "summary": base = 0.5; amplitude = 0.2; break;
    default: base = 100; amplitude = 30;
  }

  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * amplitude;
    const trend = Math.sin((i / points) * Math.PI * 2) * (amplitude * 0.3);
    data.push(parseFloat((base + noise + trend).toFixed(2)));
  }
  return data;
}
