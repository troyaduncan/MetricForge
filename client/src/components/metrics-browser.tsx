import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Search, Database, Tag, ArrowLeft, Clock, Activity,
  Hash, Gauge, BarChart3, Timer, ChevronRight, Layers, Zap, X,
} from "lucide-react";
import type { MetricMetadata } from "@shared/schema";
import { OPERATION_DEFINITIONS } from "@shared/schema";
import { cn } from "@/lib/utils";

interface MetricsCatalogResponse {
  datasource: { id: string; name: string; type: string; url: string } | null;
  metrics: MetricMetadata[];
}

const typeIcons: Record<string, React.ReactNode> = {
  counter: <Hash className="w-3.5 h-3.5" />,
  gauge: <Gauge className="w-3.5 h-3.5" />,
  histogram: <BarChart3 className="w-3.5 h-3.5" />,
  summary: <Timer className="w-3.5 h-3.5" />,
};

const typeColors: Record<string, string> = {
  counter: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  gauge: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  histogram: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  summary: "text-purple-500 bg-purple-500/10 border-purple-500/20",
};

function formatValue(value: number, unit: string): string {
  if (unit === "bytes") {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)} GB`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)} MB`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)} KB`;
    return `${value} B`;
  }
  if (unit === "seconds") return `${value.toFixed(3)}s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
}

export function MetricsBrowser({ onSelectMetric }: { onSelectMetric?: (metric: MetricMetadata) => void }) {
  const [search, setSearch] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<MetricMetadata | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const { data, isLoading } = useQuery<MetricsCatalogResponse>({
    queryKey: ["/api/metrics/catalog"],
  });

  const metrics = data?.metrics || [];
  const datasource = data?.datasource;

  const filtered = metrics.filter((m) => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const typeCounts = metrics.reduce<Record<string, number>>((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {});

  const handleSelectMetric = (metric: MetricMetadata) => {
    setSelectedMetric(metric);
    onSelectMetric?.(metric);
  };

  if (selectedMetric) {
    return <MetricDetail metric={selectedMetric} onBack={() => setSelectedMetric(null)} datasource={datasource} />;
  }

  return (
    <div className="flex flex-col h-full" data-testid="metrics-browser">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Metrics Browser</h3>
          <Badge variant="secondary" className="text-[9px] h-4 ml-auto">{metrics.length}</Badge>
        </div>
        {datasource ? (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2">
            <Database className="w-3 h-3" />
            <span className="truncate">{datasource.name}</span>
            <Badge variant="outline" className="text-[9px] h-3.5 px-1">{datasource.type}</Badge>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground mb-2">
            No datasource configured
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter metrics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-7 text-xs"
            data-testid="input-filter-metrics"
          />
        </div>
        <div className="flex items-center gap-1 mt-2">
          <Button
            variant={typeFilter === null ? "secondary" : "ghost"}
            size="sm"
            className="h-5 text-[10px] px-1.5"
            onClick={() => setTypeFilter(null)}
            data-testid="filter-type-all"
          >
            All
          </Button>
          {Object.entries(typeCounts).map(([type, count]) => (
            <Button
              key={type}
              variant={typeFilter === type ? "secondary" : "ghost"}
              size="sm"
              className="h-5 text-[10px] px-1.5 gap-0.5"
              onClick={() => setTypeFilter(typeFilter === type ? null : type)}
              data-testid={`filter-type-${type}`}
            >
              {typeIcons[type]}
              {type}
              <span className="text-muted-foreground">({count})</span>
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="w-6 h-6 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No metrics found</p>
            </div>
          ) : (
            filtered.map((metric) => (
              <button
                key={metric.name}
                className={cn(
                  "w-full text-left px-2.5 py-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer group",
                  "focus:outline-none focus:ring-1 focus:ring-primary/30"
                )}
                onClick={() => handleSelectMetric(metric)}
                data-testid={`metric-item-${metric.name}`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-mono font-medium truncate">{metric.name}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className={cn("text-[9px] h-3.5 px-1 gap-0.5 border", typeColors[metric.type])}>
                    {typeIcons[metric.type]}
                    {metric.type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate">{metric.description}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function MetricDetail({
  metric,
  onBack,
  datasource,
}: {
  metric: MetricMetadata;
  onBack: () => void;
  datasource?: { id: string; name: string; type: string; url: string } | null;
}) {
  return (
    <div className="flex flex-col h-full" data-testid="metric-detail">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1 px-1.5 -ml-1 mb-1"
          onClick={onBack}
          data-testid="button-metric-back"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to metrics
        </Button>
        <h3 className="text-sm font-mono font-semibold break-all">{metric.name}</h3>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 gap-0.5 border", typeColors[metric.type])}>
            {typeIcons[metric.type]}
            {metric.type}
          </Badge>
          {metric.unit && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{metric.unit}</Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</h4>
            <p className="text-xs leading-relaxed" data-testid="text-metric-description">{metric.description}</p>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Metadata</h4>
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                  <Database className="w-3 h-3" />
                  Job
                </div>
                <span className="text-xs font-mono font-medium" data-testid="text-metric-job">{metric.job}</span>
              </Card>
              <Card className="p-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                  <Clock className="w-3 h-3" />
                  Scrape Interval
                </div>
                <span className="text-xs font-mono font-medium" data-testid="text-metric-scrape">{metric.scrapeInterval}</span>
              </Card>
              <Card className="p-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                  <Activity className="w-3 h-3" />
                  Sample Value
                </div>
                <span className="text-xs font-mono font-medium" data-testid="text-metric-sample">{formatValue(metric.sampleValue, metric.unit)}</span>
              </Card>
              {datasource && (
                <Card className="p-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                    <Database className="w-3 h-3" />
                    Datasource
                  </div>
                  <span className="text-xs font-medium truncate block" data-testid="text-metric-datasource">{datasource.name}</span>
                </Card>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3 h-3" />
              Labels ({metric.labels.length})
            </h4>
            <div className="flex flex-wrap gap-1" data-testid="metric-labels">
              {metric.labels.map((label) => (
                <Badge key={label} variant="outline" className="text-[10px] h-5 px-1.5 font-mono gap-0.5">
                  <Tag className="w-2.5 h-2.5 text-muted-foreground" />
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              Suggested Operations ({metric.suggestedOperations.length})
            </h4>
            <div className="space-y-1.5" data-testid="metric-operations">
              {metric.suggestedOperations.map((opName) => {
                const opDef = OPERATION_DEFINITIONS[opName];
                return (
                  <div key={opName} className="flex items-start gap-2 p-2 rounded-md bg-accent/30">
                    <Zap className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-medium">{opName}()</span>
                      {opDef && (
                        <>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{opDef.description}</p>
                          <Badge variant="secondary" className="text-[9px] h-3.5 px-1 mt-1">{opDef.category}</Badge>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Example PromQL</h4>
            <div className="space-y-1.5" data-testid="metric-examples">
              <ExampleQuery metric={metric} expression={metric.name} label="Raw metric" />
              {metric.type === "counter" && (
                <>
                  <ExampleQuery metric={metric} expression={`rate(${metric.name}[5m])`} label="Per-second rate" />
                  <ExampleQuery metric={metric} expression={`increase(${metric.name}[1h])`} label="Hourly increase" />
                </>
              )}
              {metric.type === "gauge" && (
                <>
                  <ExampleQuery metric={metric} expression={`avg(${metric.name})`} label="Average value" />
                  <ExampleQuery metric={metric} expression={`max(${metric.name})`} label="Maximum value" />
                </>
              )}
              {metric.type === "histogram" && (
                <>
                  <ExampleQuery metric={metric} expression={`histogram_quantile(0.95, rate(${metric.name}_bucket[5m]))`} label="P95 latency" />
                  <ExampleQuery metric={metric} expression={`rate(${metric.name}_count[5m])`} label="Request rate" />
                </>
              )}
              {metric.labels.length > 0 && (
                <ExampleQuery metric={metric} expression={`${metric.name}{${metric.labels[0]}="${metric.labels[0] === "job" ? metric.job : "value"}"}`} label={`Filter by ${metric.labels[0]}`} />
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function ExampleQuery({ expression, label }: { metric: MetricMetadata; expression: string; label: string }) {
  return (
    <div className="p-2 rounded-md bg-accent/30 border border-border/50">
      <span className="text-[10px] text-muted-foreground block mb-0.5">{label}</span>
      <code className="text-[11px] font-mono break-all">{expression}</code>
    </div>
  );
}
