import { useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  ScatterChart, Scatter,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Maximize2, Minimize2, RefreshCw, Clock,
  TrendingUp, TrendingDown, Minus, ArrowLeft, ZoomIn,
} from "lucide-react";
import { generateTimeSeriesData, generatePieData, generateSparklineData, TIME_RANGES, type PieSlice, type DrillDownNode } from "@/lib/metrics-data";
import type { MetricQuery, SubQuery } from "@shared/schema";

interface SeriesInfo {
  key: string;
  label: string;
  color: string;
  metricType: string;
  expression: string;
}

interface MetricChartProps {
  query: Partial<MetricQuery>;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  compact?: boolean;
}

interface DrillDownLevel {
  label: string;
  data: PieSlice[];
}

export function MetricChart({ query, isExpanded, onToggleExpand, compact }: MetricChartProps) {
  const [timeRange, setTimeRange] = useState("1h");
  const [refreshKey, setRefreshKey] = useState(0);
  const [drillDownStack, setDrillDownStack] = useState<DrillDownLevel[]>([]);

  const vizType = query.visualizationType || "line";
  const isPieOrDonut = vizType === "pie" || vizType === "donut";
  const isSparkline = vizType === "sparkline";
  const chartColor = query.color || "#E20074";

  const enabledSubQueries = useMemo(() =>
    ((query.subQueries as SubQuery[]) || []).filter((sq) => sq.enabled),
    [query.subQueries]
  );

  const allSeries: SeriesInfo[] = useMemo(() => {
    const primary: SeriesInfo = {
      key: "value_0",
      label: enabledSubQueries.length > 0 ? "A" : (query.name || query.metricName || "Query"),
      color: chartColor,
      metricType: query.metricType || "counter",
      expression: query.expression || "",
    };
    const subs = enabledSubQueries.map((sq, i) => ({
      key: `value_${i + 1}`,
      label: sq.letter || String.fromCharCode(66 + i),
      color: sq.color || "#FF6DB3",
      metricType: sq.metricType || "counter",
      expression: sq.expression || "",
    }));
    return [primary, ...subs];
  }, [chartColor, query.metricType, query.expression, query.name, query.metricName, enabledSubQueries]);

  const isMultiSeries = allSeries.length > 1;

  const mergedTimeSeriesData = useMemo(() => {
    if (isPieOrDonut || isSparkline) return [];
    const allData = allSeries.map((s) =>
      generateTimeSeriesData(s.metricType, timeRange)
    );
    return allData[0].map((point, i) => {
      const merged: Record<string, any> = { time: point.time };
      allData.forEach((seriesData, j) => {
        merged[`value_${j}`] = seriesData[i]?.value;
      });
      return merged;
    });
  }, [allSeries, timeRange, refreshKey, isPieOrDonut, isSparkline]);

  const pieData = useMemo(
    () => isPieOrDonut ? generatePieData(query.metricType || "counter") : [],
    [query.metricType, refreshKey, isPieOrDonut]
  );

  const sparkData = useMemo(
    () => isSparkline ? generateSparklineData(query.metricType || "counter") : [],
    [query.metricType, refreshKey, isSparkline]
  );

  const activePieData = drillDownStack.length > 0 ? drillDownStack[drillDownStack.length - 1].data : pieData;

  const primaryData = mergedTimeSeriesData;
  const currentValue = primaryData.length > 0 ? (primaryData[primaryData.length - 1]?.value_0 ?? 0) : 0;
  const prevValue = primaryData.length > 1 ? (primaryData[primaryData.length - 2]?.value_0 ?? currentValue) : currentValue;
  const trend = currentValue - prevValue;
  const trendPercent = prevValue !== 0 ? ((trend / prevValue) * 100).toFixed(1) : "0";

  const primaryValues = primaryData.map((d) => d.value_0 as number).filter(Boolean);
  const minValue = primaryValues.length > 0 ? Math.min(...primaryValues) : 0;
  const maxValue = primaryValues.length > 0 ? Math.max(...primaryValues) : 0;
  const avgValue = primaryValues.length > 0 ? primaryValues.reduce((sum, v) => sum + v, 0) / primaryValues.length : 0;

  const pieTotal = isPieOrDonut ? activePieData.reduce((sum, s) => sum + s.value, 0) : 0;

  const handlePieClick = useCallback((sliceData: PieSlice) => {
    if (sliceData.drillDown && sliceData.drillDown.length > 0) {
      const nextData: PieSlice[] = sliceData.drillDown.map((dd: DrillDownNode) => ({
        name: dd.name,
        value: dd.value,
        color: dd.color,
        drillDown: dd.children?.map((child: DrillDownNode) => ({
          name: child.name,
          value: child.value,
          color: child.color,
          metricType: child.metricType,
          expression: child.expression,
          children: child.children,
        })),
      }));
      setDrillDownStack((prev) => [...prev, { label: sliceData.name, data: nextData }]);
    }
  }, []);

  const handleDrillBack = useCallback(() => {
    setDrillDownStack((prev) => prev.slice(0, -1));
  }, []);

  const commonAxisProps = {
    tick: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
    axisLine: { stroke: "hsl(var(--border))" },
    tickLine: false,
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "6px",
      fontSize: "12px",
      padding: "8px 12px",
      color: "hsl(var(--foreground))",
    },
    labelStyle: { color: "hsl(var(--muted-foreground))", marginBottom: "4px" },
    itemStyle: { color: "hsl(var(--foreground))" },
  };

  const renderChart = () => {
    if (isSparkline) return renderSparkline();
    if (isPieOrDonut) return renderPieDonut();

    const commonProps = {
      data: mergedTimeSeriesData,
      margin: { top: 8, right: 8, left: 0, bottom: 0 },
    };

    const xAxis = (
      <XAxis dataKey="time" {...commonAxisProps} interval="preserveStartEnd" minTickGap={40} />
    );
    const yAxis = (
      <YAxis {...commonAxisProps} width={55} tickFormatter={(v: number) => {
        if (v >= 1e9) return `${(v / 1e9).toFixed(1)}G`;
        if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
        if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
        return v.toFixed(v < 1 ? 3 : 0);
      }} />
    );
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />;
    const tooltip = <Tooltip {...tooltipStyle} />;
    const legend = isMultiSeries ? <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} /> : null;

    switch (vizType) {
      case "area":
        return (
          <AreaChart {...commonProps}>
            {grid}{xAxis}{yAxis}{tooltip}{legend}
            <defs>
              {allSeries.map((s) => (
                <linearGradient key={s.key} id={`gradient-${s.color}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={isMultiSeries ? 0.2 : 0.3} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {allSeries.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                fill={`url(#gradient-${s.color}-${s.key})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: s.color, stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
            ))}
            {!isMultiSeries && <ReferenceLine y={avgValue} stroke={chartColor} strokeDasharray="4 4" opacity={0.4} />}
          </AreaChart>
        );
      case "bar":
        return (
          <BarChart {...commonProps}>
            {grid}{xAxis}{yAxis}{tooltip}{legend}
            {allSeries.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[2, 2, 0, 0]} opacity={0.8} />
            ))}
          </BarChart>
        );
      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            {grid}{xAxis}{yAxis}{tooltip}{legend}
            {allSeries.map((s) => (
              <Scatter key={s.key} dataKey={s.key} name={s.label} fill={s.color} opacity={0.7} />
            ))}
          </ScatterChart>
        );
      default:
        return (
          <LineChart {...commonProps}>
            {grid}{xAxis}{yAxis}{tooltip}{legend}
            {allSeries.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: s.color, stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
            ))}
            {!isMultiSeries && <ReferenceLine y={avgValue} stroke={chartColor} strokeDasharray="4 4" opacity={0.4} />}
          </LineChart>
        );
    }
  };

  const renderPieDonut = () => {
    const isDonut = vizType === "donut";
    const hasDD = activePieData.some((s) => s.drillDown && s.drillDown.length > 0);
    return (
      <PieChart>
        <Pie
          data={activePieData}
          cx="50%"
          cy="50%"
          innerRadius={isDonut ? (compact ? 30 : 50) : 0}
          outerRadius={compact ? 60 : 85}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={compact ? false : ({ name, percent }: { name: string; percent: number }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={!compact}
          style={{ cursor: hasDD ? "pointer" : "default" }}
        >
          {activePieData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.color}
              stroke="hsl(var(--background))"
              strokeWidth={2}
              style={{ cursor: hasDD ? "pointer" : "default" }}
              onClick={() => handlePieClick(entry)}
              data-testid={`pie-slice-${i}`}
            />
          ))}
        </Pie>
        <Tooltip
          {...tooltipStyle}
          formatter={(value: number, name: string) => [
            `${formatValue(value)} (${((value / pieTotal) * 100).toFixed(1)}%)`,
            name,
          ]}
        />
        {!compact && <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />}
      </PieChart>
    );
  };

  const renderSparkline = () => {
    const sparklineData = sparkData.map((v, i) => ({ idx: i, value: v }));
    return (
      <AreaChart data={sparklineData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id={`spark-gradient-${chartColor}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={chartColor} fill={`url(#spark-gradient-${chartColor})`} strokeWidth={1.5} dot={false} />
        {!compact && <Tooltip {...tooltipStyle} labelFormatter={() => ""} />}
      </AreaChart>
    );
  };

  if (compact) {
    const compactValue = isPieOrDonut
      ? formatValue(pieTotal)
      : isSparkline
        ? formatValue(sparkData[sparkData.length - 1] ?? 0)
        : formatValue(currentValue, query.metricType);

    return (
      <Card className="p-3 border-accent" data-testid={`dashboard-card-${query.metricName || "metric"}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-0.5 shrink-0">
              {allSeries.slice(0, 3).map((s) => (
                <div key={s.key} className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              ))}
            </div>
            <h4 className="text-xs font-semibold truncate">{query.name || query.metricName || "Metric"}</h4>
          </div>
          <div className="flex items-center gap-1">
            {isMultiSeries && (
              <Badge variant="outline" className="text-[8px] shrink-0 h-4 px-1">{allSeries.length} series</Badge>
            )}
            <Badge variant="secondary" className="text-[9px] shrink-0">{vizType}</Badge>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="shrink-0">
            <p className="text-lg font-bold font-mono tabular-nums">{compactValue}</p>
            {!isPieOrDonut && !isSparkline && (
              <span className={`text-[10px] flex items-center gap-0.5 ${trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                {trend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : trend < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                {trendPercent}%
              </span>
            )}
          </div>
          <div className="flex-1 h-[60px]">
            <ResponsiveContainer width="100%" height="100%">
              {isSparkline ? renderSparkline() : isPieOrDonut ? renderPieDonut() : (
                <AreaChart data={mergedTimeSeriesData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                  <defs>
                    {allSeries.map((s) => (
                      <linearGradient key={s.key} id={`compact-gradient-${s.color}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.color} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  {allSeries.map((s) => (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stroke={s.color}
                      fill={`url(#compact-gradient-${s.color}-${s.key})`}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  ))}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground truncate mt-1.5">{query.expression}</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-accent">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-0.5 shrink-0">
            {allSeries.map((s) => (
              <div key={s.key} className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            ))}
          </div>
          <h4 className="text-sm font-semibold truncate" data-testid="text-chart-title">
            {query.name || query.metricName || "Metric Query"}
          </h4>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {query.metricType}
          </Badge>
          {isMultiSeries && (
            <Badge variant="outline" className="text-[9px] shrink-0">
              {allSeries.length} series
            </Badge>
          )}
          {drillDownStack.length > 0 && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDrillBack} data-testid="button-drill-back">
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
              <Badge variant="outline" className="text-[9px] gap-0.5">
                <ZoomIn className="w-2.5 h-2.5" />
                {drillDownStack.map((l) => l.label).join(" > ")}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isPieOrDonut && !isSparkline && (
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-7 w-[70px] text-xs" data-testid="select-time-range">
                <Clock className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <UITooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setRefreshKey((k) => k + 1); setDrillDownStack([]); }} data-testid="button-refresh-chart">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh data</TooltipContent>
          </UITooltip>
          {onToggleExpand && (
            <UITooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onToggleExpand} data-testid="button-expand-chart">
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isExpanded ? "Collapse" : "Expand"}</TooltipContent>
            </UITooltip>
          )}
        </div>
      </div>

      {!isPieOrDonut && !isSparkline && (
        <div className="grid grid-cols-4 gap-3 mb-3">
          <StatCard label="Current" value={formatValue(currentValue, query.metricType)} trend={trend} trendPercent={trendPercent} />
          <StatCard label="Average" value={formatValue(avgValue, query.metricType)} />
          <StatCard label="Min" value={formatValue(minValue, query.metricType)} />
          <StatCard label="Max" value={formatValue(maxValue, query.metricType)} />
        </div>
      )}

      {isPieOrDonut && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatCard label="Total" value={formatValue(pieTotal)} />
          <StatCard label="Segments" value={String(activePieData.length)} />
          <StatCard label="Largest" value={activePieData.length > 0 ? activePieData.reduce((a, b) => a.value > b.value ? a : b).name : "—"} />
        </div>
      )}

      {isSparkline && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatCard label="Latest" value={formatValue(sparkData[sparkData.length - 1] ?? 0, query.metricType)} />
          <StatCard label="Min" value={formatValue(Math.min(...sparkData), query.metricType)} />
          <StatCard label="Max" value={formatValue(Math.max(...sparkData), query.metricType)} />
        </div>
      )}

      <div className={isExpanded ? "h-[400px]" : "h-[220px]"} data-testid="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {isPieOrDonut && activePieData.some((s) => s.drillDown && s.drillDown.length > 0) && (
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Click a segment to drill down into sub-metrics
        </p>
      )}

      <div className="mt-2 px-1 space-y-0.5">
        {isMultiSeries ? (
          allSeries.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[10px] font-semibold text-muted-foreground">{s.label}:</span>
              <p className="text-[10px] font-mono text-muted-foreground truncate">{s.expression}</p>
            </div>
          ))
        ) : (
          <p className="text-[10px] font-mono text-muted-foreground truncate" data-testid="text-chart-expression">
            {query.expression}
          </p>
        )}
      </div>
    </Card>
  );
}

function StatCard({ label, value, trend, trendPercent }: { label: string; value: string; trend?: number; trendPercent?: string }) {
  return (
    <div className="rounded-md bg-accent/40 p-2">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold font-mono tabular-nums truncate">{value}</span>
        {trend !== undefined && (
          <span className={`text-[10px] flex items-center gap-0.5 ${trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"}`}>
            {trend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : trend < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
            {trendPercent}%
          </span>
        )}
      </div>
    </div>
  );
}

function formatValue(value: number, metricType?: string): string {
  if (metricType === "histogram" || metricType === "summary") {
    return value.toFixed(4) + "s";
  }
  if (value >= 1e9) return (value / 1e9).toFixed(2) + "G";
  if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
  if (value >= 1e3) return (value / 1e3).toFixed(1) + "K";
  return value.toFixed(metricType === "gauge" ? 1 : 0);
}

export function DashboardCards({ charts }: { charts: Partial<MetricQuery>[] }) {
  const [drillDownChart, setDrillDownChart] = useState<{ query: Partial<MetricQuery>; slice: PieSlice } | null>(null);

  if (drillDownChart) {
    const drillQuery: Partial<MetricQuery> = {
      ...drillDownChart.query,
      name: `${drillDownChart.query.name} > ${drillDownChart.slice.name}`,
    };
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setDrillDownChart(null)} data-testid="button-drill-back-cards">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Button>
          <Badge variant="outline" className="text-xs gap-1">
            <ZoomIn className="w-3 h-3" />
            Drill Down: {drillDownChart.slice.name}
          </Badge>
        </div>
        <MetricChart query={drillQuery} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" data-testid="dashboard-cards-grid">
      {charts.map((chart, i) => (
        <MetricChart key={`${chart.expression}-${i}`} query={chart} compact />
      ))}
    </div>
  );
}
