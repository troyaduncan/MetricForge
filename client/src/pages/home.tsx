import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { QueryBuilder } from "@/components/query-builder";
import { MetricChart, DashboardCards } from "@/components/metric-chart";
import { DatasourceRequestLog, generateLogEntry, type RequestLogEntry } from "@/components/datasource-request-log";
import { DatasourceManager } from "@/components/datasource-manager";
import { MetricsBrowser } from "@/components/metrics-browser";
import { ThemeToggle } from "@/components/theme-toggle";
import { HelpPanel } from "@/components/help-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContextualHelpTip } from "@/components/help-panel";
import {
  Activity, LayoutDashboard, Plus, Gauge, Layers, LayoutGrid, List, Database, Bug, PanelRightOpen, PanelRightClose,
} from "lucide-react";
import { Link } from "wouter";
import type { MetricQuery } from "@shared/schema";

const sidebarStyle = {
  "--sidebar-width": "18rem",
  "--sidebar-width-icon": "3rem",
};

const SAMPLE_DASHBOARD: Partial<MetricQuery>[] = [
  {
    name: "HTTP Request Rate",
    expression: 'rate(http_requests_total{job="api-server"}[5m])',
    metricName: "http_requests_total",
    metricType: "counter",
    visualizationType: "line",
    color: "#E20074",
  },
  {
    name: "CPU Utilization",
    expression: 'avg(rate(node_cpu_seconds_total{env="production"}[5m]))',
    metricName: "node_cpu_seconds_total",
    metricType: "gauge",
    visualizationType: "area",
    color: "#FF2D8A",
  },
  {
    name: "Error Rate by Service",
    expression: 'sum(rate(error_rate_total{env="production"}[5m]))',
    metricName: "error_rate_total",
    metricType: "counter",
    visualizationType: "bar",
    color: "#9B0050",
  },
  {
    name: "Latency Distribution",
    expression: 'histogram_quantile(0.95, rate(api_response_time_seconds{service="checkout"}[5m]))',
    metricName: "api_response_time_seconds",
    metricType: "histogram",
    visualizationType: "scatter",
    color: "#FF6DB3",
  },
  {
    name: "Traffic by Endpoint",
    expression: 'sum by (handler)(rate(http_requests_total[5m]))',
    metricName: "http_requests_total",
    metricType: "counter",
    visualizationType: "pie",
    color: "#E20074",
  },
  {
    name: "Memory by Region",
    expression: 'sum by (region)(process_resident_memory_bytes)',
    metricName: "process_resident_memory_bytes",
    metricType: "gauge",
    visualizationType: "donut",
    color: "#B5005C",
  },
  {
    name: "Active Connections",
    expression: 'database_connections_active{service="primary"}',
    metricName: "database_connections_active",
    metricType: "gauge",
    visualizationType: "sparkline",
    color: "#C7006A",
  },
  {
    name: "Request vs Error Rate",
    expression: 'rate(http_requests_total{job="api-server"}[5m])',
    metricName: "http_requests_total",
    metricType: "counter",
    visualizationType: "line",
    color: "#E20074",
    subQueries: [
      {
        id: "sq-1",
        letter: "B",
        enabled: true,
        metricName: "error_rate_total",
        metricType: "counter",
        labels: [{ label: "env", op: "=" as const, value: "production" }],
        operations: [{ id: "op-sq-1", type: "rate", params: { range: "5m" } }],
        expression: 'rate(error_rate_total{env="production"}[5m])',
        color: "#FF6DB3",
      },
      {
        id: "sq-2",
        letter: "C",
        enabled: true,
        metricName: "node_cpu_seconds_total",
        metricType: "gauge",
        labels: [],
        operations: [{ id: "op-sq-2", type: "avg", params: { by: [] } }],
        expression: 'avg(node_cpu_seconds_total)',
        color: "#9B0050",
      },
    ],
  },
];

export default function Home() {
  const { toast } = useToast();
  const [editingQuery, setEditingQuery] = useState<MetricQuery | null>(null);
  const [activeCharts, setActiveCharts] = useState<Partial<MetricQuery>[]>(SAMPLE_DASHBOARD);
  const [selectedQueryId, setSelectedQueryId] = useState<string>();
  const [expandedChart, setExpandedChart] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [requestLog, setRequestLog] = useState<RequestLogEntry[]>([]);
  const [dashboardView, setDashboardView] = useState<"grid" | "cards">("grid");
  const [metricsPanelOpen, setMetricsPanelOpen] = useState(true);

  const saveMutation = useMutation({
    mutationFn: async (query: Partial<MetricQuery>) => {
      if (editingQuery) {
        const res = await apiRequest("PATCH", `/api/queries/${editingQuery.id}`, query);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/queries", query);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queries"] });
      toast({ title: editingQuery ? "Query updated" : "Query saved", description: "Your metric query has been saved." });
      setEditingQuery(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleExecute = useCallback((query: Partial<MetricQuery>) => {
    const logEntry = generateLogEntry(query.expression || "", query.metricType || "counter");
    setRequestLog((prev) => [logEntry, ...prev]);
    setActiveCharts((prev) => {
      const exists = prev.findIndex((c) => c.expression === query.expression);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = query;
        return updated;
      }
      return [...prev, query];
    });
    setActiveTab("dashboard");
  }, []);

  const handleSelectQuery = useCallback((query: MetricQuery) => {
    setSelectedQueryId(query.id);
    handleExecute(query);
  }, [handleExecute]);

  const handleEditQuery = useCallback((query: MetricQuery) => {
    setEditingQuery(query);
    setActiveTab("builder");
  }, []);

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          onSelectQuery={handleSelectQuery}
          onEditQuery={handleEditQuery}
          selectedId={selectedQueryId}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <header className="h-12 border-b border-border flex items-center justify-between gap-2 px-4 shrink-0 bg-card/30">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="h-8">
                  <TabsTrigger value="builder" className="text-xs gap-1.5 px-3" data-testid="tab-builder">
                    <Layers className="w-3.5 h-3.5" />
                    Builder
                  </TabsTrigger>
                  <TabsTrigger value="dashboard" className="text-xs gap-1.5 px-3" data-testid="tab-dashboard">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Dashboard
                    {activeCharts.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1">{activeCharts.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="datasources" className="text-xs gap-1.5 px-3" data-testid="tab-datasources">
                    <Database className="w-3.5 h-3.5" />
                    Datasources
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] gap-1">
                <Gauge className="w-3 h-3" />
                Prometheus
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMetricsPanelOpen(!metricsPanelOpen)}
                data-testid="button-toggle-metrics-panel"
              >
                {metricsPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </Button>
              <Link href="/admin/debug">
                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-admin-debug">
                  <Bug className="w-4 h-4" />
                </Button>
              </Link>
              <HelpPanel />
              <ThemeToggle />
            </div>
          </header>

          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 overflow-hidden min-w-0">
              {activeTab === "datasources" ? (
                <ScrollArea className="h-full">
                  <div className="max-w-4xl mx-auto p-6">
                    <DatasourceManager />
                  </div>
                </ScrollArea>
              ) : activeTab === "builder" ? (
                <ScrollArea className="h-full">
                  <div className="max-w-4xl mx-auto p-6">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold tracking-tight mb-1">
                        {editingQuery ? "Edit Query" : "Create New Query"}
                      </h2>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        Build PromQL expressions with an intuitive interface and visualize metrics in real-time.
                        <ContextualHelpTip content="Use Builder mode to visually select metrics, labels, and operations. Switch to Code mode to write raw PromQL. Click Run Query to preview the chart, or Save Query to persist it. Click the ? icon in the header for full documentation." />
                      </p>
                    </div>
                    <QueryBuilder
                      onExecute={handleExecute}
                      onSave={(q) => saveMutation.mutate(q)}
                      editingQuery={editingQuery}
                      isSaving={saveMutation.isPending}
                    />

                    {activeCharts.length > 0 && (
                      <div className="mt-8">
                        <div className="flex items-center gap-2 mb-4">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold text-muted-foreground">Preview</h3>
                        </div>
                        <MetricChart query={activeCharts[activeCharts.length - 1]} />
                      </div>
                    )}

                    <div className="mt-8">
                      <DatasourceRequestLog
                        entries={requestLog}
                        onClear={() => setRequestLog([])}
                      />
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-2 mb-6">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight mb-1">Metrics Dashboard</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                          {activeCharts.length > 0
                            ? `Viewing ${activeCharts.length} metric${activeCharts.length > 1 ? "s" : ""}`
                            : "Run queries to see visualizations here"}
                          <ContextualHelpTip content="Toggle between Grid and Cards view using the buttons on the right. Click any chart's expand icon for full-width detail. On pie/donut charts, click segments to drill down into sub-metrics." />
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeCharts.length > 0 && (
                          <div className="flex items-center border rounded-md">
                            <Button
                              variant={dashboardView === "grid" ? "secondary" : "ghost"}
                              size="icon"
                              className="h-7 w-7 rounded-r-none"
                              onClick={() => setDashboardView("grid")}
                              data-testid="button-view-grid"
                            >
                              <List className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant={dashboardView === "cards" ? "secondary" : "ghost"}
                              size="icon"
                              className="h-7 w-7 rounded-l-none"
                              onClick={() => setDashboardView("cards")}
                              data-testid="button-view-cards"
                            >
                              <LayoutGrid className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setActiveTab("builder")}
                          data-testid="button-new-query"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Query
                        </Button>
                      </div>
                    </div>

                    {activeCharts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-accent/50 flex items-center justify-center mb-4">
                          <LayoutDashboard className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-base font-semibold mb-1">No metrics yet</h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                          Create a query in the Builder tab and run it to see your metrics visualized here.
                        </p>
                        <Button
                          variant="default"
                          size="sm"
                          className="mt-4 gap-1.5"
                          onClick={() => setActiveTab("builder")}
                          data-testid="button-go-to-builder"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Create Query
                        </Button>
                      </div>
                    ) : dashboardView === "cards" ? (
                      <DashboardCards charts={activeCharts} />
                    ) : (
                      <div className={expandedChart !== null ? "" : "grid grid-cols-1 xl:grid-cols-2 gap-4"}>
                        {activeCharts.map((chart, i) => (
                          (expandedChart === null || expandedChart === i) && (
                            <MetricChart
                              key={`${chart.expression}-${i}`}
                              query={chart}
                              isExpanded={expandedChart === i}
                              onToggleExpand={() => setExpandedChart(expandedChart === i ? null : i)}
                            />
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </main>

            {metricsPanelOpen && (
              <aside className="w-72 border-l border-border bg-card/30 shrink-0 overflow-hidden" data-testid="metrics-panel">
                <MetricsBrowser />
              </aside>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
