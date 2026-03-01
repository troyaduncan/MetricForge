import * as fs from "fs";
import * as path from "path";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogConfig {
  level: LogLevel;
  consoleOutput: boolean;
  fileOutput: boolean;
  maxFiles: number;
  logApiRequests: boolean;
  logApiResponses: boolean;
  logDbQueries: boolean;
}

export interface AppLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface RequestLogEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  bytesReturned: number;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  userAgent?: string;
}

const LOG_DIR = path.join(process.cwd(), "logs");

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

let config: LogConfig = {
  level: "INFO",
  consoleOutput: true,
  fileOutput: true,
  maxFiles: 20,
  logApiRequests: true,
  logApiResponses: true,
  logDbQueries: false,
};

let currentLogFile: string = "";
let logStream: fs.WriteStream | null = null;
const inMemoryLogs: AppLogEntry[] = [];
const inMemoryRequestLogs: RequestLogEntry[] = [];
const MAX_IN_MEMORY = 1000;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function cleanOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter((f) => f.startsWith("app-") && f.endsWith(".log"))
      .sort()
      .reverse();
    for (let i = config.maxFiles; i < files.length; i++) {
      fs.unlinkSync(path.join(LOG_DIR, files[i]));
    }
  } catch {}
}

function createLogFile(): string {
  ensureLogDir();
  cleanOldLogs();
  const ts = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19);
  const filename = `app-${ts}.log`;
  const filepath = path.join(LOG_DIR, filename);

  if (logStream) {
    logStream.end();
  }
  logStream = fs.createWriteStream(filepath, { flags: "a" });
  currentLogFile = filename;
  return filepath;
}

function writeToFile(line: string) {
  if (!config.fileOutput) return;
  if (!logStream) {
    createLogFile();
  }
  logStream?.write(line + "\n");
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[config.level];
}

export function appLog(level: LogLevel, category: string, message: string, metadata?: Record<string, any>) {
  if (!shouldLog(level)) return;
  if (category === "storage" && !config.logDbQueries && level === "DEBUG") return;

  const entry: AppLogEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    metadata,
  };

  inMemoryLogs.push(entry);
  if (inMemoryLogs.length > MAX_IN_MEMORY) {
    inMemoryLogs.splice(0, inMemoryLogs.length - MAX_IN_MEMORY);
  }

  const line = `[${entry.timestamp}] [${level}] [${category}] ${message}${metadata ? " " + JSON.stringify(metadata) : ""}`;

  if (config.consoleOutput) {
    const colors: Record<LogLevel, string> = {
      DEBUG: "\x1b[36m",
      INFO: "\x1b[32m",
      WARN: "\x1b[33m",
      ERROR: "\x1b[31m",
    };
    console.log(`${colors[level]}${line}\x1b[0m`);
  }

  writeToFile(line);
}

export function logRequest(entry: Omit<RequestLogEntry, "id">) {
  if (!config.logApiRequests) return;

  const full: RequestLogEntry = { id: generateId(), ...entry };

  inMemoryRequestLogs.push(full);
  if (inMemoryRequestLogs.length > MAX_IN_MEMORY) {
    inMemoryRequestLogs.splice(0, inMemoryRequestLogs.length - MAX_IN_MEMORY);
  }

  const statusEmoji = full.statusCode < 400 ? "OK" : "ERR";
  const line = `[${full.timestamp}] [REQUEST] ${full.method} ${full.path} ${full.statusCode} ${statusEmoji} ${full.durationMs}ms ${full.bytesReturned}B`;

  if (config.consoleOutput) {
    const color = full.statusCode < 400 ? "\x1b[32m" : "\x1b[31m";
    console.log(`${color}${line}\x1b[0m`);
  }

  writeToFile(line);

  if (config.logApiResponses && full.responseBody) {
    const respLine = `[${full.timestamp}] [RESPONSE] ${full.method} ${full.path} :: ${JSON.stringify(full.responseBody).substring(0, 500)}`;
    writeToFile(respLine);
  }
}

export function getConfig(): LogConfig {
  return { ...config };
}

export function updateConfig(updates: Partial<LogConfig>) {
  config = { ...config, ...updates };
  appLog("INFO", "logger", "Logging configuration updated", updates);
}

export function getLogs(options?: {
  level?: LogLevel;
  category?: string;
  limit?: number;
  offset?: number;
  search?: string;
}): { entries: AppLogEntry[]; total: number } {
  let filtered = [...inMemoryLogs];

  if (options?.level) {
    const minLevel = LOG_LEVELS[options.level];
    filtered = filtered.filter((e) => LOG_LEVELS[e.level] >= minLevel);
  }
  if (options?.category) {
    filtered = filtered.filter((e) => e.category === options.category);
  }
  if (options?.search) {
    const term = options.search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.message.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term) ||
        (e.metadata && JSON.stringify(e.metadata).toLowerCase().includes(term))
    );
  }

  const total = filtered.length;
  filtered.reverse();
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;
  return { entries: filtered.slice(offset, offset + limit), total };
}

export function getRequestLogs(options?: {
  limit?: number;
  offset?: number;
  method?: string;
  statusCode?: number;
  path?: string;
}): { entries: RequestLogEntry[]; total: number; stats: RequestStats } {
  let filtered = [...inMemoryRequestLogs];

  if (options?.method) {
    filtered = filtered.filter((e) => e.method === options.method);
  }
  if (options?.statusCode) {
    filtered = filtered.filter((e) => e.statusCode === options.statusCode);
  }
  if (options?.path) {
    const p = options.path.toLowerCase();
    filtered = filtered.filter((e) => e.path.toLowerCase().includes(p));
  }

  const total = filtered.length;
  const stats = computeRequestStats(filtered);
  filtered.reverse();
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;
  return { entries: filtered.slice(offset, offset + limit), total, stats };
}

export interface RequestStats {
  totalRequests: number;
  avgLatencyMs: number;
  totalBytes: number;
  successCount: number;
  errorCount: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  methodBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

function computeRequestStats(entries: RequestLogEntry[]): RequestStats {
  if (entries.length === 0) {
    return {
      totalRequests: 0,
      avgLatencyMs: 0,
      totalBytes: 0,
      successCount: 0,
      errorCount: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      methodBreakdown: {},
      statusBreakdown: {},
    };
  }

  const latencies = entries.map((e) => e.durationMs).sort((a, b) => a - b);
  const methodBreakdown: Record<string, number> = {};
  const statusBreakdown: Record<string, number> = {};
  let totalBytes = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const e of entries) {
    totalBytes += e.bytesReturned;
    if (e.statusCode < 400) successCount++;
    else errorCount++;
    const mKey = e.method;
    methodBreakdown[mKey] = (methodBreakdown[mKey] || 0) + 1;
    const sKey = String(e.statusCode);
    statusBreakdown[sKey] = (statusBreakdown[sKey] || 0) + 1;
  }

  const p95Idx = Math.min(Math.floor(latencies.length * 0.95), latencies.length - 1);
  const p99Idx = Math.min(Math.floor(latencies.length * 0.99), latencies.length - 1);

  return {
    totalRequests: entries.length,
    avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    totalBytes,
    successCount,
    errorCount,
    p95LatencyMs: latencies[p95Idx],
    p99LatencyMs: latencies[p99Idx],
    methodBreakdown,
    statusBreakdown,
  };
}

export function getLogFiles(): { name: string; size: number; created: string }[] {
  ensureLogDir();
  try {
    return fs.readdirSync(LOG_DIR)
      .filter((f) => f.endsWith(".log"))
      .map((f) => {
        const stat = fs.statSync(path.join(LOG_DIR, f));
        return { name: f, size: stat.size, created: stat.birthtime.toISOString() };
      })
      .sort((a, b) => b.created.localeCompare(a.created));
  } catch {
    return [];
  }
}

export function getLogFileContent(filename: string): string | null {
  const sanitized = path.basename(filename);
  if (!/^app-.*\.log$/.test(sanitized)) return null;
  const filepath = path.join(LOG_DIR, sanitized);
  if (!fs.existsSync(filepath)) return null;
  return fs.readFileSync(filepath, "utf-8");
}

export function clearLogs() {
  inMemoryLogs.length = 0;
  inMemoryRequestLogs.length = 0;
  appLog("INFO", "logger", "In-memory logs cleared");
}

export function getCurrentLogFile(): string {
  return currentLogFile;
}

export function initLogger() {
  createLogFile();
  appLog("INFO", "logger", "Application logger initialized", {
    logFile: currentLogFile,
    config: { level: config.level, consoleOutput: config.consoleOutput, fileOutput: config.fileOutput },
  });
}
