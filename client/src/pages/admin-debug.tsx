import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import {
  ArrowLeft, Bug, FileText, Activity, Settings, Trash2, RefreshCw,
  Download, Filter, Clock, HardDrive, Wifi, AlertTriangle, CheckCircle2,
  XCircle, ChevronDown, ChevronRight,
} from "lucide-react";

interface LogConfig {
  level: string;
  consoleOutput: boolean;
  fileOutput: boolean;
  maxFiles: number;
  logApiRequests: boolean;
  logApiResponses: boolean;
  logDbQueries: boolean;
}

interface AppLogEntry {
  id: string;
  timestamp: string;
  level: string;
  category: string;
  message: string;
  metadata?: Record<string, any>;
}

interface RequestLogEntry {
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

interface RequestStats {
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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function LevelBadge({ level }: { level: string }) {
  const variants: Record<string, string> = {
    DEBUG: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600",
    INFO: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600",
    WARN: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600",
    ERROR: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-300 dark:border-red-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${variants[level] || variants.INFO}`}>
      {level}
    </span>
  );
}

function StatusBadge({ code }: { code: number }) {
  const color = code < 300 ? "text-emerald-600 dark:text-emerald-400" : code < 400 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  return <span className={`font-mono text-xs font-semibold ${color}`}>{code}</span>;
}

function LatencyBadge({ ms }: { ms: number }) {
  const color = ms < 50 ? "text-emerald-600 dark:text-emerald-400" : ms < 200 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  return <span className={`font-mono text-xs ${color}`}>{ms}ms</span>;
}

function AppLogsTab() {
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<{ entries: AppLogEntry[]; total: number }>({
    queryKey: ["/api/logs/app", levelFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "200" });
      if (levelFilter !== "all") params.set("level", levelFilter);
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/logs/app?${params}`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2" data-testid="app-logs-filters">
        <div className="relative flex-1">
          <Filter className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
            data-testid="input-log-search"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-32 h-9 text-sm" data-testid="select-log-level">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="DEBUG">Debug</SelectItem>
            <SelectItem value="INFO">Info</SelectItem>
            <SelectItem value="WARN">Warning</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()} data-testid="button-refresh-logs">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {data?.entries.length || 0} of {data?.total || 0} entries
      </div>

      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-1">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading logs...</div>
          ) : data?.entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No log entries found</div>
          ) : (
            data?.entries.map((entry) => (
              <div
                key={entry.id}
                className="group rounded-md border border-border/50 hover:border-border bg-card/30 hover:bg-card/60 transition-colors cursor-pointer"
                onClick={() => setExpandedLog(expandedLog === entry.id ? null : entry.id)}
                data-testid={`log-entry-${entry.id}`}
              >
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  {expandedLog === entry.id ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                  <span className="font-mono text-muted-foreground shrink-0 w-44">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                  <LevelBadge level={entry.level} />
                  <span className="text-muted-foreground font-mono shrink-0">[{entry.category}]</span>
                  <span className="truncate">{entry.message}</span>
                </div>
                {expandedLog === entry.id && entry.metadata && (
                  <div className="px-3 pb-2 pt-0">
                    <pre className="text-[10px] font-mono bg-muted/50 rounded p-2 overflow-x-auto">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function RequestLogsTab() {
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [pathFilter, setPathFilter] = useState("");
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<{ entries: RequestLogEntry[]; total: number; stats: RequestStats }>({
    queryKey: ["/api/logs/requests", methodFilter, pathFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "200" });
      if (methodFilter !== "all") params.set("method", methodFilter);
      if (pathFilter) params.set("path", pathFilter);
      const res = await fetch(`/api/logs/requests?${params}`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  const stats = data?.stats;

  return (
    <div className="space-y-4">
      {stats && stats.totalRequests > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase">Total Requests</span>
              </div>
              <div className="text-xl font-bold" data-testid="text-total-requests">{stats.totalRequests}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase">Avg Latency</span>
              </div>
              <div className="text-xl font-bold" data-testid="text-avg-latency">{stats.avgLatencyMs}ms</div>
              <div className="text-[10px] text-muted-foreground">p95: {stats.p95LatencyMs}ms · p99: {stats.p99LatencyMs}ms</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase">Bytes Transferred</span>
              </div>
              <div className="text-xl font-bold" data-testid="text-total-bytes">{formatBytes(stats.totalBytes)}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase">Success Rate</span>
              </div>
              <div className="text-xl font-bold" data-testid="text-success-rate">
                {stats.totalRequests > 0 ? Math.round((stats.successCount / stats.totalRequests) * 100) : 0}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                <span className="text-emerald-500">{stats.successCount} ok</span> · <span className="text-red-500">{stats.errorCount} err</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Filter className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter by path..."
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
            className="pl-8 h-9 text-sm"
            data-testid="input-request-path-filter"
          />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-28 h-9 text-sm" data-testid="select-method-filter">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()} data-testid="button-refresh-requests">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="space-y-1">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading request logs...</div>
          ) : data?.entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No request logs yet. Make some API calls to see them here.</div>
          ) : (
            data?.entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-md border border-border/50 hover:border-border bg-card/30 hover:bg-card/60 transition-colors cursor-pointer"
                onClick={() => setExpandedReq(expandedReq === entry.id ? null : entry.id)}
                data-testid={`request-entry-${entry.id}`}
              >
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs">
                  {expandedReq === entry.id ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                  <span className="font-mono text-muted-foreground shrink-0 w-44">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono h-5 px-1.5 shrink-0">
                    {entry.method}
                  </Badge>
                  <span className="font-mono truncate text-muted-foreground">{entry.path}</span>
                  <StatusBadge code={entry.statusCode} />
                  <LatencyBadge ms={entry.durationMs} />
                  <span className="text-muted-foreground font-mono shrink-0">{formatBytes(entry.bytesReturned)}</span>
                </div>
                {expandedReq === entry.id && (
                  <div className="px-3 pb-2 pt-0 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {entry.requestBody && (
                        <div>
                          <div className="text-[10px] font-semibold text-muted-foreground mb-1">Request Body</div>
                          <pre className="text-[10px] font-mono bg-muted/50 rounded p-2 overflow-x-auto max-h-40">
                            {JSON.stringify(entry.requestBody, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.responseBody && (
                        <div>
                          <div className="text-[10px] font-semibold text-muted-foreground mb-1">Response Body</div>
                          <pre className="text-[10px] font-mono bg-muted/50 rounded p-2 overflow-x-auto max-h-40">
                            {JSON.stringify(entry.responseBody, null, 2).substring(0, 1000)}
                          </pre>
                        </div>
                      )}
                    </div>
                    {entry.userAgent && (
                      <div className="text-[10px] text-muted-foreground">
                        <span className="font-semibold">User-Agent:</span> {entry.userAgent}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function LogFilesTab() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { data: files, isLoading } = useQuery<{ name: string; size: number; created: string }[]>({
    queryKey: ["/api/logs/files"],
  });

  const { data: fileContent } = useQuery<{ filename: string; content: string }>({
    queryKey: ["/api/logs/files", selectedFile],
    queryFn: async () => {
      const res = await fetch(`/api/logs/files/${selectedFile}`);
      return res.json();
    },
    enabled: !!selectedFile,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <h3 className="text-sm font-semibold mb-2">Log Files</h3>
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-1">
              {isLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
              ) : files?.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">No log files</div>
              ) : (
                files?.map((f) => (
                  <div
                    key={f.name}
                    className={`rounded-md border p-2 cursor-pointer transition-colors text-xs ${
                      selectedFile === f.name ? "border-primary bg-primary/5" : "border-border/50 hover:border-border bg-card/30"
                    }`}
                    onClick={() => setSelectedFile(f.name)}
                    data-testid={`log-file-${f.name}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono truncate">{f.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 ml-5">
                      {formatBytes(f.size)} · {new Date(f.created).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        <div className="md:col-span-2">
          <h3 className="text-sm font-semibold mb-2">
            {selectedFile ? selectedFile : "Select a log file to view"}
          </h3>
          <ScrollArea className="h-[calc(100vh-300px)]">
            {fileContent ? (
              <pre className="text-[10px] font-mono bg-muted/30 rounded-md p-3 whitespace-pre-wrap break-all" data-testid="text-log-file-content">
                {fileContent.content}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                {selectedFile ? "Loading..." : "Select a file from the list"}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function LogConfigTab() {
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<LogConfig>({
    queryKey: ["/api/logs/config"],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<LogConfig>) => {
      const res = await apiRequest("PATCH", "/api/logs/config", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs/config"] });
      toast({ title: "Configuration updated", description: "Logging settings have been saved." });
    },
  });

  if (isLoading || !config) {
    return <div className="text-center py-8 text-muted-foreground">Loading configuration...</div>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Log Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={config.level}
            onValueChange={(v) => updateMutation.mutate({ level: v as LogConfig["level"] })}
          >
            <SelectTrigger className="w-40" data-testid="select-config-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DEBUG">Debug</SelectItem>
              <SelectItem value="INFO">Info</SelectItem>
              <SelectItem value="WARN">Warning</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-2">
            Controls the minimum severity level for logged messages. Debug shows everything, Error shows only errors.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Output Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Console Output</Label>
              <p className="text-[11px] text-muted-foreground">Print logs to the server console</p>
            </div>
            <Switch
              checked={config.consoleOutput}
              onCheckedChange={(v) => updateMutation.mutate({ consoleOutput: v })}
              data-testid="switch-console-output"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">File Output</Label>
              <p className="text-[11px] text-muted-foreground">Write logs to files on disk</p>
            </div>
            <Switch
              checked={config.fileOutput}
              onCheckedChange={(v) => updateMutation.mutate({ fileOutput: v })}
              data-testid="switch-file-output"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Max Log Files</Label>
              <p className="text-[11px] text-muted-foreground">Maximum number of log files to keep</p>
            </div>
            <Input
              type="number"
              value={config.maxFiles}
              onChange={(e) => updateMutation.mutate({ maxFiles: parseInt(e.target.value) || 20 })}
              className="w-20 h-8 text-sm"
              data-testid="input-max-files"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">API Logging</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Log API Requests</Label>
              <p className="text-[11px] text-muted-foreground">Log method, path, status, latency, and bytes for each API call</p>
            </div>
            <Switch
              checked={config.logApiRequests}
              onCheckedChange={(v) => updateMutation.mutate({ logApiRequests: v })}
              data-testid="switch-api-requests"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Log API Responses</Label>
              <p className="text-[11px] text-muted-foreground">Log response body content for API calls (may increase log size)</p>
            </div>
            <Switch
              checked={config.logApiResponses}
              onCheckedChange={(v) => updateMutation.mutate({ logApiResponses: v })}
              data-testid="switch-api-responses"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Log Database Queries</Label>
              <p className="text-[11px] text-muted-foreground">Log database operations (may impact performance)</p>
            </div>
            <Switch
              checked={config.logDbQueries}
              onCheckedChange={(v) => updateMutation.mutate({ logDbQueries: v })}
              data-testid="switch-db-queries"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminDebug() {
  const { toast } = useToast();

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logs/clear");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs/app"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs/requests"] });
      toast({ title: "Logs cleared", description: "In-memory logs have been cleared." });
    },
  });

  const { data: currentFile } = useQuery<{ filename: string }>({
    queryKey: ["/api/logs/current"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/30">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-primary" />
            <h1 className="text-sm font-semibold">Admin Debug Console</h1>
          </div>
          {currentFile && (
            <Badge variant="outline" className="text-[10px] font-mono gap-1">
              <FileText className="w-3 h-3" />
              {currentFile.filename}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-destructive hover:text-destructive"
            onClick={() => clearMutation.mutate()}
            data-testid="button-clear-logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Logs
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto">
        <Tabs defaultValue="app-logs">
          <TabsList className="h-9 mb-4">
            <TabsTrigger value="app-logs" className="text-xs gap-1.5 px-3" data-testid="tab-app-logs">
              <FileText className="w-3.5 h-3.5" />
              Application Logs
            </TabsTrigger>
            <TabsTrigger value="request-logs" className="text-xs gap-1.5 px-3" data-testid="tab-request-logs">
              <Activity className="w-3.5 h-3.5" />
              Request Logs
            </TabsTrigger>
            <TabsTrigger value="log-files" className="text-xs gap-1.5 px-3" data-testid="tab-log-files">
              <HardDrive className="w-3.5 h-3.5" />
              Log Files
            </TabsTrigger>
            <TabsTrigger value="config" className="text-xs gap-1.5 px-3" data-testid="tab-log-config">
              <Settings className="w-3.5 h-3.5" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="app-logs">
            <AppLogsTab />
          </TabsContent>
          <TabsContent value="request-logs">
            <RequestLogsTab />
          </TabsContent>
          <TabsContent value="log-files">
            <LogFilesTab />
          </TabsContent>
          <TabsContent value="config">
            <LogConfigTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
