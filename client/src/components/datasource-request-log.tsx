import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowDownUp, Clock, Database, Trash2, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, AlertTriangle, Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RequestLogEntry {
  id: string;
  timestamp: Date;
  method: "GET" | "POST";
  endpoint: string;
  query: string;
  statusCode: number;
  statusText: string;
  latencyMs: number;
  bytesReturned: number;
  resultType: string;
  resultCount: number;
  step: string;
  start: string;
  end: string;
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
  });
}

export function generateLogEntry(expression: string, metricType: string): RequestLogEntry {
  const isRangeQuery = expression.includes("[");
  const endpoint = isRangeQuery ? "/api/v1/query_range" : "/api/v1/query";
  const method = isRangeQuery ? "POST" : "GET";

  const now = new Date();
  const end = now.toISOString();
  const startDate = new Date(now.getTime() - 3600000);
  const start = startDate.toISOString();

  const isSuccess = Math.random() > 0.08;
  const statusCode = isSuccess ? 200 : (Math.random() > 0.5 ? 400 : 504);
  const statusText = statusCode === 200 ? "OK" : statusCode === 400 ? "Bad Request" : "Gateway Timeout";

  const baseLatency = metricType === "histogram" ? 80 : metricType === "gauge" ? 35 : 45;
  const latencyMs = Math.round(baseLatency + Math.random() * 120 + (Math.random() > 0.9 ? 200 : 0));

  const resultCount = isSuccess ? Math.round(30 + Math.random() * 90) : 0;
  const baseBytesPerSample = metricType === "histogram" ? 48 : 24;
  const bytesReturned = isSuccess
    ? Math.round(256 + resultCount * baseBytesPerSample + Math.random() * 512)
    : Math.round(80 + Math.random() * 120);

  const resultType = isSuccess
    ? (isRangeQuery ? "matrix" : "vector")
    : "error";

  const step = isRangeQuery ? "15s" : "instant";

  return {
    id: generateRequestId(),
    timestamp: now,
    method,
    endpoint,
    query: expression,
    statusCode,
    statusText,
    latencyMs,
    bytesReturned,
    resultType,
    resultCount,
    step,
    start,
    end,
  };
}

interface DatasourceRequestLogProps {
  entries: RequestLogEntry[];
  onClear: () => void;
}

function StatusBadge({ code }: { code: number }) {
  if (code >= 200 && code < 300) {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
        <CheckCircle2 className="w-2.5 h-2.5" />
        {code}
      </Badge>
    );
  }
  if (code >= 400 && code < 500) {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">
        <AlertTriangle className="w-2.5 h-2.5" />
        {code}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] gap-1 bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20">
      <XCircle className="w-2.5 h-2.5" />
      {code}
    </Badge>
  );
}

function LatencyBadge({ ms }: { ms: number }) {
  const color = ms < 100
    ? "text-emerald-600 dark:text-emerald-400"
    : ms < 250
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";
  return (
    <span className={cn("text-[11px] font-mono tabular-nums", color)}>
      {ms}ms
    </span>
  );
}

function LogEntryRow({ entry }: { entry: RequestLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/40 transition-colors"
        data-testid={`log-entry-${entry.id}`}
      >
        {expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />}
        <span className="text-[10px] text-muted-foreground font-mono w-20 shrink-0">
          {formatTimestamp(entry.timestamp)}
        </span>
        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 shrink-0">
          {entry.method}
        </Badge>
        <span className="text-xs font-mono text-muted-foreground truncate flex-1 min-w-0">
          {entry.endpoint}
        </span>
        <StatusBadge code={entry.statusCode} />
        <LatencyBadge ms={entry.latencyMs} />
        <span className="text-[10px] font-mono text-muted-foreground w-16 text-right shrink-0">
          {formatBytes(entry.bytesReturned)}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 ml-5 space-y-2">
          <Card className="p-2.5 bg-muted/30 text-xs space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Query:</span>
              <span className="font-mono text-foreground break-all">{entry.query}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Status:</span>
              <span className="font-mono">{entry.statusCode} {entry.statusText}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Result Type:</span>
              <Badge variant="secondary" className="text-[10px]">{entry.resultType}</Badge>
              {entry.resultCount > 0 && (
                <span className="text-muted-foreground">({entry.resultCount} samples)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Step:</span>
              <span className="font-mono">{entry.step}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Time Range:</span>
              <span className="font-mono text-[10px]">{entry.start} &rarr; {entry.end}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Latency:</span>
              <LatencyBadge ms={entry.latencyMs} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Bytes:</span>
              <span className="font-mono">{formatBytes(entry.bytesReturned)} ({entry.bytesReturned.toLocaleString()} bytes)</span>
            </div>
          </Card>

          <Card className="p-2.5 bg-muted/30 text-xs">
            <div className="text-[10px] text-muted-foreground mb-1 font-medium">Response Preview</div>
            <pre className="font-mono text-[10px] text-foreground overflow-x-auto whitespace-pre">
{JSON.stringify({
  status: entry.statusCode === 200 ? "success" : "error",
  data: {
    resultType: entry.resultType,
    result: entry.statusCode === 200
      ? [{ metric: { __name__: entry.query.split(/[{[(]/)[0] }, values: `[...${entry.resultCount} samples]` }]
      : [],
  },
  ...(entry.statusCode !== 200 ? { error: entry.statusText, errorType: entry.statusCode >= 500 ? "timeout" : "bad_data" } : {}),
  stats: {
    timings: { evalTotalTime: entry.latencyMs / 1000, resultSortTime: 0.001, queryPreparationTime: 0.002 },
    samples: { totalQueryableSamples: entry.resultCount, peakSamples: Math.round(entry.resultCount * 1.2) },
  },
}, null, 2)}
            </pre>
          </Card>
        </div>
      )}
    </div>
  );
}

export function DatasourceRequestLog({ entries, onClear }: DatasourceRequestLogProps) {
  const totalBytes = entries.reduce((sum, e) => sum + e.bytesReturned, 0);
  const avgLatency = entries.length > 0
    ? Math.round(entries.reduce((sum, e) => sum + e.latencyMs, 0) / entries.length)
    : 0;
  const successCount = entries.filter((e) => e.statusCode >= 200 && e.statusCode < 300).length;
  const errorCount = entries.length - successCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Datasource Request Log</h3>
          {entries.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{entries.length} requests</Badge>
          )}
        </div>
        {entries.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} className="gap-1 text-xs h-7" data-testid="button-clear-log">
            <Trash2 className="w-3 h-3" />
            Clear
          </Button>
        )}
      </div>

      {entries.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-2 text-center">
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <ArrowDownUp className="w-2.5 h-2.5" />
              Total Requests
            </div>
            <div className="text-sm font-bold font-mono" data-testid="stat-total-requests">{entries.length}</div>
          </Card>
          <Card className="p-2 text-center">
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              Avg Latency
            </div>
            <div className="text-sm font-bold font-mono" data-testid="stat-avg-latency">{avgLatency}ms</div>
          </Card>
          <Card className="p-2 text-center">
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Database className="w-2.5 h-2.5" />
              Bytes Returned
            </div>
            <div className="text-sm font-bold font-mono" data-testid="stat-total-bytes">{formatBytes(totalBytes)}</div>
          </Card>
          <Card className="p-2 text-center">
            <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              {errorCount > 0 ? <XCircle className="w-2.5 h-2.5 text-red-500" /> : <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />}
              Success / Error
            </div>
            <div className="text-sm font-bold font-mono" data-testid="stat-success-error">
              <span className="text-emerald-600 dark:text-emerald-400">{successCount}</span>
              <span className="text-muted-foreground mx-0.5">/</span>
              <span className={errorCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}>{errorCount}</span>
            </div>
          </Card>
        </div>
      )}

      <Card className="overflow-hidden">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Wifi className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No requests yet. Run a query to see datasource activity.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="text-[11px] font-medium text-muted-foreground px-3 py-1.5 border-b bg-muted/30 flex items-center gap-2">
              <span className="w-3" />
              <span className="w-20">Time</span>
              <span className="w-12">Method</span>
              <span className="flex-1">Endpoint</span>
              <span className="w-12">Status</span>
              <span className="w-12 text-right">Latency</span>
              <span className="w-16 text-right">Size</span>
            </div>
            {entries.map((entry) => (
              <LogEntryRow key={entry.id} entry={entry} />
            ))}
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
