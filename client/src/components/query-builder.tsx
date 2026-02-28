import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Plus, X, Play, Save, Code, Palette,
  Activity, BarChart3, LineChart, ScatterChart, AreaChart,
  Search, ChevronDown, Zap, Database, Hash, Braces, Copy, Check,
  PieChart, Circle, TrendingUp, Layers, Filter, Settings2,
  GripVertical, ArrowRight, Eye, EyeOff, ChevronUp, Trash2, Server,
} from "lucide-react";
import {
  METRIC_TYPES, VISUALIZATION_TYPES,
  COMMON_LABELS, COMMON_METRICS, CHART_COLORS,
  LABEL_OPERATORS, RANGE_INTERVALS,
  OPERATION_DEFINITIONS, OPERATION_CATEGORIES,
  normalizeLabelMatchers,
  type MetricQuery, type LabelMatcher, type QueryOperation, type SubQuery,
  type Datasource,
} from "@shared/schema";
import { buildPromQLFromOperations } from "@/lib/metrics-data";
import { ContextualHelpTip } from "@/components/help-panel";
import { cn } from "@/lib/utils";

const queryFormSchema = z.object({
  name: z.string().min(1, "Query name is required"),
  description: z.string().optional(),
  visualizationType: z.string().min(1),
  datasourceId: z.string().optional(),
  legendFormat: z.string().optional(),
  step: z.string().optional(),
  queryType: z.string().optional(),
});

type QueryFormValues = z.infer<typeof queryFormSchema>;

interface QueryBuilderProps {
  onExecute: (query: Partial<MetricQuery>) => void;
  onSave: (query: Partial<MetricQuery>) => void;
  editingQuery?: MetricQuery | null;
  isSaving?: boolean;
}

interface QueryPanelState {
  id: string;
  letter: string;
  enabled: boolean;
  collapsed: boolean;
  metricName: string;
  metricType: string;
  labelMatchers: LabelMatcher[];
  operations: QueryOperation[];
  color: string;
  rawExpression: string;
  metricSearchOpen: boolean;
}

const vizIcons: Record<string, React.ReactNode> = {
  line: <LineChart className="w-4 h-4" />,
  area: <AreaChart className="w-4 h-4" />,
  bar: <BarChart3 className="w-4 h-4" />,
  scatter: <ScatterChart className="w-4 h-4" />,
  pie: <PieChart className="w-4 h-4" />,
  donut: <Circle className="w-4 h-4" />,
  sparkline: <TrendingUp className="w-4 h-4" />,
};

const typeIcons: Record<string, React.ReactNode> = {
  counter: <Hash className="w-3.5 h-3.5" />,
  gauge: <Activity className="w-3.5 h-3.5" />,
  histogram: <BarChart3 className="w-3.5 h-3.5" />,
  summary: <Database className="w-3.5 h-3.5" />,
};

let nextOpId = 1;
function generateOpId(): string {
  return `op-${nextOpId++}-${Date.now()}`;
}

let nextPanelId = 1;
function generatePanelId(): string {
  return `panel-${nextPanelId++}-${Date.now()}`;
}

function createPanel(letter: string, colorIndex: number): QueryPanelState {
  return {
    id: generatePanelId(),
    letter,
    enabled: true,
    collapsed: false,
    metricName: "",
    metricType: "counter",
    labelMatchers: [],
    operations: [],
    color: CHART_COLORS[colorIndex % CHART_COLORS.length],
    rawExpression: "",
    metricSearchOpen: false,
  };
}

function getNextLetter(panels: QueryPanelState[]): string {
  const usedLetters = new Set(panels.map((p) => p.letter));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!usedLetters.has(letter)) return letter;
  }
  return "Z";
}

function JsonPreview({ query, expressions, labelMatchers }: { query: Partial<MetricQuery>; expressions: { letter: string; expression: string }[]; labelMatchers: LabelMatcher[] }) {
  const [collapsed, setCollapsed] = useState(true);
  const [copied, setCopied] = useState(false);

  const jsonObj = useMemo(() => ({
    name: query.name || "",
    description: query.description || null,
    expressions: expressions.map((e) => ({ query: e.letter, expression: e.expression })),
    metric: {
      name: query.metricName || "",
      type: query.metricType || "counter",
    },
    labels: labelMatchers.length > 0 ? labelMatchers : [],
    operations: query.operations || [],
    subQueries: (query.subQueries || []).length,
    options: {
      legendFormat: query.legendFormat || null,
      step: query.step || null,
      queryType: query.queryType || "range",
    },
    visualization: {
      type: query.visualizationType || "line",
    },
  }), [query, expressions, labelMatchers]);

  const jsonStr = JSON.stringify(jsonObj, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-3 bg-muted/30 border-muted">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-toggle-json"
        >
          <Braces className="w-3.5 h-3.5" />
          <span>JSON Representation</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", collapsed && "-rotate-90")} />
        </button>
        {!collapsed && (
          <Button type="button" variant="ghost" size="sm" onClick={handleCopy} className="h-6 text-[10px] gap-1 px-2" data-testid="button-copy-json">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
      </div>
      {!collapsed && (
        <pre
          className="font-mono text-xs p-3 bg-background rounded-md border text-foreground overflow-x-auto max-h-[300px] overflow-y-auto"
          data-testid="text-json-representation"
        >
          {jsonStr}
        </pre>
      )}
    </Card>
  );
}

function LabelMatcherRow({
  matcher,
  index,
  onChange,
  onRemove,
}: {
  matcher: LabelMatcher;
  index: number;
  onChange: (index: number, field: keyof LabelMatcher, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5" data-testid={`label-matcher-row-${index}`}>
      <Select value={matcher.label} onValueChange={(v) => onChange(index, "label", v)}>
        <SelectTrigger className="h-8 text-xs w-[130px] font-mono" data-testid={`select-label-key-${index}`}>
          <SelectValue placeholder="Label..." />
        </SelectTrigger>
        <SelectContent>
          {COMMON_LABELS.map((l) => (
            <SelectItem key={l} value={l}>
              <span className="font-mono">{l}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={matcher.op} onValueChange={(v) => onChange(index, "op", v)}>
        <SelectTrigger className="h-8 text-xs w-[65px] font-mono" data-testid={`select-label-op-${index}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LABEL_OPERATORS.map((op) => (
            <SelectItem key={op} value={op}>
              <span className="font-mono">{op}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={matcher.value}
        onChange={(e) => onChange(index, "value", e.target.value)}
        placeholder="Value..."
        className="h-8 text-xs font-mono flex-1"
        data-testid={`input-label-value-${index}`}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(index)}
        data-testid={`button-remove-label-${index}`}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function OperationCard({
  operation,
  index,
  onUpdate,
  onRemove,
}: {
  operation: QueryOperation;
  index: number;
  onUpdate: (index: number, params: Record<string, any>) => void;
  onRemove: (index: number) => void;
}) {
  const def = OPERATION_DEFINITIONS[operation.type];
  if (!def) return null;

  const categoryColors: Record<string, string> = {
    "Range functions": "border-blue-500/30 bg-blue-500/5",
    "Aggregations": "border-purple-500/30 bg-purple-500/5",
    "Math": "border-green-500/30 bg-green-500/5",
    "Time functions": "border-orange-500/30 bg-orange-500/5",
    "Label functions": "border-yellow-500/30 bg-yellow-500/5",
    "Binary operations": "border-red-500/30 bg-red-500/5",
  };

  const updateParam = (name: string, value: any) => {
    onUpdate(index, { ...operation.params, [name]: value });
  };

  const addByLabel = (label: string) => {
    const current = (operation.params.by as string[]) || [];
    if (!current.includes(label)) {
      updateParam("by", [...current, label]);
    }
  };

  const removeByLabel = (label: string) => {
    const current = (operation.params.by as string[]) || [];
    updateParam("by", current.filter((l) => l !== label));
  };

  const toggleWithout = () => {
    updateParam("without", !operation.params.without);
  };

  return (
    <div className="flex items-start gap-1.5">
      {index > 0 && (
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mt-2.5 shrink-0" />
      )}
      <Card
        className={cn("p-2.5 min-w-[140px] border", categoryColors[def.category] || "border-border")}
        data-testid={`operation-card-${index}`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <GripVertical className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-xs font-semibold font-mono">{operation.type}()</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(index)}
            data-testid={`button-remove-op-${index}`}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>

        <div className="space-y-1.5">
          {def.params.map((paramDef) => {
            if (paramDef.type === "range") {
              return (
                <div key={paramDef.name} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-12 shrink-0">{paramDef.label || paramDef.name}:</span>
                  <Select
                    value={operation.params[paramDef.name] || paramDef.default || "5m"}
                    onValueChange={(v) => updateParam(paramDef.name, v)}
                  >
                    <SelectTrigger className="h-6 text-[11px] font-mono" data-testid={`select-op-${index}-${paramDef.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RANGE_INTERVALS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }

            if (paramDef.type === "number") {
              return (
                <div key={paramDef.name} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-12 shrink-0">{paramDef.label || paramDef.name}:</span>
                  <Input
                    type="number"
                    step="any"
                    value={operation.params[paramDef.name] ?? paramDef.default ?? ""}
                    onChange={(e) => updateParam(paramDef.name, e.target.value === "" ? undefined : parseFloat(e.target.value))}
                    className="h-6 text-[11px] font-mono w-20"
                    data-testid={`input-op-${index}-${paramDef.name}`}
                  />
                </div>
              );
            }

            if (paramDef.type === "string") {
              return (
                <div key={paramDef.name} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-12 shrink-0">{paramDef.label || paramDef.name}:</span>
                  <Input
                    value={operation.params[paramDef.name] ?? paramDef.default ?? ""}
                    onChange={(e) => updateParam(paramDef.name, e.target.value)}
                    className="h-6 text-[11px] font-mono"
                    data-testid={`input-op-${index}-${paramDef.name}`}
                  />
                </div>
              );
            }

            if (paramDef.type === "labels") {
              const byLabels = (operation.params.by as string[]) || [];
              const isWithout = !!operation.params.without;
              return (
                <div key={paramDef.name} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground shrink-0">{isWithout ? "without" : "by"}:</span>
                    <button
                      type="button"
                      onClick={toggleWithout}
                      className="text-[9px] text-primary hover:underline"
                      data-testid={`button-toggle-without-${index}`}
                    >
                      switch to {isWithout ? "by" : "without"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 items-center">
                    {byLabels.map((l) => (
                      <Badge key={l} variant="secondary" className="text-[9px] font-mono gap-0.5 pr-0.5 h-5">
                        {l}
                        <button type="button" onClick={() => removeByLabel(l)} className="p-0.5 rounded-full" data-testid={`button-remove-by-${l}-${index}`}>
                          <X className="w-2 h-2" />
                        </button>
                      </Badge>
                    ))}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="h-5 text-[9px] gap-0.5 px-1.5" data-testid={`button-add-by-label-${index}`}>
                          <Plus className="w-2.5 h-2.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-1" align="start">
                        <div className="max-h-40 overflow-y-auto">
                          {COMMON_LABELS.filter((l) => !byLabels.includes(l)).map((l) => (
                            <button
                              key={l}
                              type="button"
                              onClick={() => addByLabel(l)}
                              className="w-full text-left text-xs font-mono px-2 py-1 hover:bg-accent rounded"
                              data-testid={`option-by-label-${l}-${index}`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </Card>
    </div>
  );
}

function OperationPicker({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const groups: Record<string, { type: string; def: typeof OPERATION_DEFINITIONS[string] }[]> = {};
    for (const [type, def] of Object.entries(OPERATION_DEFINITIONS)) {
      if (!groups[def.category]) groups[def.category] = [];
      groups[def.category].push({ type, def });
    }
    return groups;
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-dashed" data-testid="button-add-operation">
          <Plus className="w-3.5 h-3.5" />
          Operations
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search operations..." data-testid="input-operation-search" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No operation found.</CommandEmpty>
            {OPERATION_CATEGORIES.map((cat) => (
              grouped[cat] && grouped[cat].length > 0 && (
                <CommandGroup key={cat} heading={cat}>
                  {grouped[cat].map(({ type, def }) => (
                    <CommandItem
                      key={type}
                      value={`${type} ${def.description}`}
                      onSelect={() => { onAdd(type); setOpen(false); }}
                      data-testid={`option-op-${type}`}
                    >
                      <div className="flex flex-col gap-0.5 flex-1">
                        <span className="font-mono text-xs">{type}()</span>
                        <span className="text-[10px] text-muted-foreground">{def.description}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function QueryPanelEditor({
  panel,
  panelIndex,
  editorMode,
  canDelete,
  onUpdate,
  onDelete,
}: {
  panel: QueryPanelState;
  panelIndex: number;
  editorMode: "builder" | "code";
  canDelete: boolean;
  onUpdate: (id: string, updates: Partial<QueryPanelState>) => void;
  onDelete: (id: string) => void;
}) {
  const expression = useMemo(() => {
    if (editorMode === "code") return panel.rawExpression;
    return buildPromQLFromOperations(
      panel.metricName || "metric_name",
      panel.labelMatchers,
      panel.operations,
    );
  }, [editorMode, panel.rawExpression, panel.metricName, panel.labelMatchers, panel.operations]);

  const handleAddLabelMatcher = useCallback(() => {
    onUpdate(panel.id, {
      labelMatchers: [...panel.labelMatchers, { label: "", op: "=", value: "" }],
    });
  }, [panel.id, panel.labelMatchers, onUpdate]);

  const handleUpdateLabelMatcher = useCallback((index: number, field: keyof LabelMatcher, value: string) => {
    const next = [...panel.labelMatchers];
    next[index] = { ...next[index], [field]: value };
    onUpdate(panel.id, { labelMatchers: next });
  }, [panel.id, panel.labelMatchers, onUpdate]);

  const handleRemoveLabelMatcher = useCallback((index: number) => {
    onUpdate(panel.id, {
      labelMatchers: panel.labelMatchers.filter((_, i) => i !== index),
    });
  }, [panel.id, panel.labelMatchers, onUpdate]);

  const handleAddOperation = useCallback((type: string) => {
    const def = OPERATION_DEFINITIONS[type];
    if (!def) return;
    const params: Record<string, any> = {};
    for (const p of def.params) {
      if (p.default !== undefined) params[p.name] = p.default;
      if (p.type === "labels") params[p.name] = [];
    }
    onUpdate(panel.id, {
      operations: [...panel.operations, { id: generateOpId(), type, params }],
    });
  }, [panel.id, panel.operations, onUpdate]);

  const handleUpdateOperation = useCallback((index: number, params: Record<string, any>) => {
    const next = [...panel.operations];
    next[index] = { ...next[index], params };
    onUpdate(panel.id, { operations: next });
  }, [panel.id, panel.operations, onUpdate]);

  const handleRemoveOperation = useCallback((index: number) => {
    onUpdate(panel.id, {
      operations: panel.operations.filter((_, i) => i !== index),
    });
  }, [panel.id, panel.operations, onUpdate]);

  return (
    <Card className={cn("border-accent overflow-hidden", !panel.enabled && "opacity-50")} data-testid={`query-panel-${panel.letter}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 border-b border-accent/30">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0"
          style={{ backgroundColor: panel.color }}
        >
          {panel.letter}
        </div>
        <span className="text-xs font-semibold flex-1 truncate">
          {panel.metricName || `Query ${panel.letter}`}
        </span>

        {expression && panel.metricName && (
          <span className="text-[9px] font-mono text-muted-foreground truncate max-w-[200px] hidden lg:inline">
            {expression}
          </span>
        )}

        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onUpdate(panel.id, { enabled: !panel.enabled })}
                data-testid={`button-toggle-panel-${panel.letter}`}
              >
                {panel.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{panel.enabled ? "Disable query" : "Enable query"}</TooltipContent>
          </Tooltip>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onUpdate(panel.id, { collapsed: !panel.collapsed })}
            data-testid={`button-collapse-panel-${panel.letter}`}
          >
            {panel.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </Button>

          {canDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(panel.id)}
                  data-testid={`button-delete-panel-${panel.letter}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove query</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {!panel.collapsed && (
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Label className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Palette className="w-3 h-3" />
              Color
            </Label>
            <div className="flex gap-1">
              {CHART_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onUpdate(panel.id, { color: c })}
                  className={cn(
                    "w-5 h-5 rounded border-2 transition-all",
                    panel.color === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  data-testid={`button-color-${panel.letter}-${c}`}
                />
              ))}
            </div>
          </div>

          {editorMode === "code" ? (
            <div>
              <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-2">
                <Code className="w-3 h-3" />
                PromQL Expression
              </Label>
              <Textarea
                value={panel.rawExpression}
                onChange={(e) => onUpdate(panel.id, { rawExpression: e.target.value })}
                placeholder={`Enter PromQL for Query ${panel.letter}...`}
                className="font-mono text-sm min-h-[60px] resize-y bg-background"
                data-testid={`textarea-raw-promql-${panel.letter}`}
              />

              <Separator className="my-3" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-1.5">
                    <Search className="w-3 h-3" />
                    Metric (for data generation)
                  </Label>
                  <Popover open={panel.metricSearchOpen} onOpenChange={(open) => onUpdate(panel.id, { metricSearchOpen: open })}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-9 text-sm font-mono"
                        data-testid={`button-metric-selector-${panel.letter}`}
                      >
                        <span className={cn("truncate", !panel.metricName && "text-muted-foreground")}>
                          {panel.metricName || "Select metric..."}
                        </span>
                        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search metrics..." />
                        <CommandList>
                          <CommandEmpty>No metric found.</CommandEmpty>
                          <CommandGroup>
                            {COMMON_METRICS.map((metric) => (
                              <CommandItem
                                key={metric.name}
                                value={metric.name}
                                onSelect={(val) => {
                                  const m = COMMON_METRICS.find((m) => m.name === val);
                                  onUpdate(panel.id, {
                                    metricName: val,
                                    metricType: m?.type || panel.metricType,
                                    metricSearchOpen: false,
                                  });
                                }}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono text-sm">{metric.name}</span>
                                  <span className="text-xs text-muted-foreground">{metric.description}</span>
                                </div>
                                <Badge variant="secondary" className="ml-auto text-[10px]">{metric.type}</Badge>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-1.5">
                    <Zap className="w-3 h-3" />
                    Metric Type
                  </Label>
                  <Select value={panel.metricType} onValueChange={(v) => onUpdate(panel.id, { metricType: v })}>
                    <SelectTrigger className="h-9 text-sm" data-testid={`select-metric-type-${panel.letter}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRIC_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            {typeIcons[type]}
                            <span className="capitalize">{type}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-1.5">
                    <Search className="w-3 h-3" />
                    Metric
                  </Label>
                  <Popover open={panel.metricSearchOpen} onOpenChange={(open) => onUpdate(panel.id, { metricSearchOpen: open })}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-9 text-sm font-mono"
                        data-testid={`button-metric-selector-${panel.letter}`}
                      >
                        <span className={cn("truncate", !panel.metricName && "text-muted-foreground")}>
                          {panel.metricName || "Select metric..."}
                        </span>
                        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search metrics..." data-testid={`input-metric-search-${panel.letter}`} />
                        <CommandList>
                          <CommandEmpty>No metric found.</CommandEmpty>
                          <CommandGroup>
                            {COMMON_METRICS.map((metric) => (
                              <CommandItem
                                key={metric.name}
                                value={metric.name}
                                onSelect={(val) => {
                                  const m = COMMON_METRICS.find((m) => m.name === val);
                                  onUpdate(panel.id, {
                                    metricName: val,
                                    metricType: m?.type || panel.metricType,
                                    metricSearchOpen: false,
                                  });
                                }}
                                data-testid={`option-metric-${panel.letter}-${metric.name}`}
                              >
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono text-sm">{metric.name}</span>
                                  <span className="text-xs text-muted-foreground">{metric.description}</span>
                                </div>
                                <Badge variant="secondary" className="ml-auto text-[10px]">{metric.type}</Badge>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-1.5">
                    <Zap className="w-3 h-3" />
                    Metric Type
                  </Label>
                  <Select value={panel.metricType} onValueChange={(v) => onUpdate(panel.id, { metricType: v })}>
                    <SelectTrigger className="h-9 text-sm" data-testid={`select-metric-type-${panel.letter}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRIC_TYPES.map((type) => (
                        <SelectItem key={type} value={type} data-testid={`option-type-${panel.letter}-${type}`}>
                          <div className="flex items-center gap-2">
                            {typeIcons[type]}
                            <span className="capitalize">{type}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mb-2">
                  <Filter className="w-3 h-3" />
                  Label Filters
                  <ContextualHelpTip content="Label filters narrow which time series to include. Use = for exact match, != for not equal, =~ for regex match, and !~ for negative regex. Common labels: job, instance, env, namespace." />
                </Label>
                <div className="space-y-1.5">
                  {panel.labelMatchers.map((matcher, index) => (
                    <LabelMatcherRow
                      key={index}
                      matcher={matcher}
                      index={index}
                      onChange={handleUpdateLabelMatcher}
                      onRemove={handleRemoveLabelMatcher}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 mt-2"
                  onClick={handleAddLabelMatcher}
                  data-testid={`button-add-label-filter-${panel.letter}`}
                >
                  <Plus className="w-3 h-3" />
                  Add label filter
                </Button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    Operations
                    <ContextualHelpTip content="Operations transform your metric data. Chain them in order — each processes the previous step's output. Common: rate() for counters, sum() to aggregate, histogram_quantile() for percentiles." />
                    {panel.operations.length > 0 && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-1">{panel.operations.length}</Badge>
                    )}
                  </Label>
                  <OperationPicker onAdd={handleAddOperation} />
                </div>

                {panel.operations.length === 0 ? (
                  <div className="flex items-center justify-center py-3 border border-dashed rounded-md text-muted-foreground">
                    <p className="text-xs">No operations. Click "Operations" to add rate, sum, avg, and more.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start gap-1.5">
                    {panel.operations.map((op, index) => (
                      <OperationCard
                        key={op.id}
                        operation={op}
                        index={index}
                        onUpdate={handleUpdateOperation}
                        onRemove={handleRemoveOperation}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {panel.metricName && (
            <div className="pt-1">
              <p className="text-[10px] font-mono text-muted-foreground break-all">{expression}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function QueryBuilder({ onExecute, onSave, editingQuery, isSaving }: QueryBuilderProps) {
  const [panels, setPanels] = useState<QueryPanelState[]>([createPanel("A", 0)]);
  const [editorMode, setEditorMode] = useState<"builder" | "code">("builder");

  const { data: datasourcesList = [] } = useQuery<Datasource[]>({
    queryKey: ["/api/datasources"],
  });

  const form = useForm<QueryFormValues>({
    resolver: zodResolver(queryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      visualizationType: "line",
      datasourceId: "",
      legendFormat: "",
      step: "",
      queryType: "range",
    },
  });

  useEffect(() => {
    if (editingQuery) {
      form.reset({
        name: editingQuery.name,
        description: editingQuery.description || "",
        visualizationType: editingQuery.visualizationType,
        datasourceId: editingQuery.datasourceId || "",
        legendFormat: editingQuery.legendFormat || "",
        step: editingQuery.step || "",
        queryType: editingQuery.queryType || "range",
      });

      const primaryPanel: QueryPanelState = {
        id: generatePanelId(),
        letter: "A",
        enabled: true,
        collapsed: false,
        metricName: editingQuery.metricName,
        metricType: editingQuery.metricType,
        labelMatchers: normalizeLabelMatchers(editingQuery.labels),
        operations: editingQuery.operations || [],
        color: editingQuery.color || CHART_COLORS[0],
        rawExpression: editingQuery.expression || "",
        metricSearchOpen: false,
      };

      const subPanels: QueryPanelState[] = ((editingQuery.subQueries as SubQuery[]) || []).map((sq, i) => ({
        id: generatePanelId(),
        letter: sq.letter || String.fromCharCode(66 + i),
        enabled: sq.enabled,
        collapsed: true,
        metricName: sq.metricName,
        metricType: sq.metricType,
        labelMatchers: normalizeLabelMatchers(sq.labels),
        operations: sq.operations || [],
        color: sq.color || CHART_COLORS[(i + 1) % CHART_COLORS.length],
        rawExpression: sq.expression || "",
        metricSearchOpen: false,
      }));

      setPanels([primaryPanel, ...subPanels]);
      if (editingQuery.expression) {
        setEditorMode("builder");
      }
    }
  }, [editingQuery, form]);

  const handleUpdatePanel = useCallback((id: string, updates: Partial<QueryPanelState>) => {
    setPanels((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const handleDeletePanel = useCallback((id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleAddPanel = useCallback(() => {
    setPanels((prev) => {
      const letter = getNextLetter(prev);
      return [...prev, createPanel(letter, prev.length)];
    });
  }, []);

  const panelExpressions = useMemo(() => {
    return panels.map((panel) => {
      const expr = editorMode === "code"
        ? panel.rawExpression
        : buildPromQLFromOperations(
            panel.metricName || "metric_name",
            panel.labelMatchers,
            panel.operations,
          );
      return { letter: panel.letter, expression: expr };
    });
  }, [panels, editorMode]);

  const primaryExpression = panelExpressions[0]?.expression || "";

  const buildQuery = useCallback((values: QueryFormValues): Partial<MetricQuery> => {
    const primary = panels[0];
    const subQueries: SubQuery[] = panels.slice(1).map((p, i) => ({
      id: p.id,
      letter: p.letter,
      enabled: p.enabled,
      metricName: p.metricName,
      metricType: p.metricType,
      labels: p.labelMatchers,
      operations: p.operations,
      expression: editorMode === "code"
        ? p.rawExpression
        : buildPromQLFromOperations(p.metricName || "metric_name", p.labelMatchers, p.operations),
      color: p.color,
    }));

    return {
      name: values.name || primary?.metricName || "Untitled Query",
      description: values.description || undefined,
      expression: primaryExpression,
      metricName: primary?.metricName || "",
      metricType: primary?.metricType || "counter",
      labels: primary?.labelMatchers || [],
      operations: primary?.operations || [],
      legendFormat: values.legendFormat || undefined,
      step: values.step || undefined,
      queryType: values.queryType || "range",
      visualizationType: values.visualizationType,
      datasourceId: values.datasourceId || undefined,
      color: primary?.color || CHART_COLORS[0],
      subQueries,
    };
  }, [panels, primaryExpression, editorMode]);

  const handleReset = useCallback(() => {
    form.reset({
      name: "",
      description: "",
      visualizationType: "line",
      datasourceId: "",
      legendFormat: "",
      step: "",
      queryType: "range",
    });
    setPanels([createPanel("A", 0)]);
    setEditorMode("builder");
  }, [form]);

  const primaryHasMetric = panels[0]?.metricName;
  const primaryHasExpression = panels[0]?.rawExpression;
  const canExecute = editorMode === "builder" ? !!primaryHasMetric : !!primaryHasExpression;

  const handleExecute = useCallback(() => {
    if (!canExecute) return;
    const values = form.getValues();
    onExecute(buildQuery(values));
  }, [form, canExecute, onExecute, buildQuery]);

  const handleSave = form.handleSubmit((values) => {
    onSave(buildQuery(values));
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Query Builder</h3>
            {panels.length > 1 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">{panels.length} queries</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md">
              <Button
                type="button"
                variant={editorMode === "builder" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs gap-1 rounded-r-none px-2.5"
                onClick={() => setEditorMode("builder")}
                data-testid="button-mode-builder"
              >
                <Layers className="w-3 h-3" />
                Builder
              </Button>
              <Button
                type="button"
                variant={editorMode === "code" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs gap-1 rounded-l-none px-2.5"
                onClick={() => {
                  if (editorMode === "builder") {
                    setPanels((prev) => prev.map((p) => ({
                      ...p,
                      rawExpression: buildPromQLFromOperations(
                        p.metricName || "metric_name",
                        p.labelMatchers,
                        p.operations,
                      ),
                    })));
                  }
                  setEditorMode("code");
                }}
                data-testid="button-mode-code"
              >
                <Code className="w-3 h-3" />
                Code
              </Button>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleReset} data-testid="button-reset-query">
              Clear
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground font-medium">Query Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., HTTP Request Rate" className="h-9 text-sm" data-testid="input-query-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground font-medium">Description</FormLabel>
                <FormControl>
                  <Input placeholder="Optional description..." className="h-9 text-sm" data-testid="input-query-description" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {datasourcesList.length > 0 && (
          <FormField
            control={form.control}
            name="datasourceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Server className="w-3 h-3" />
                  Datasource
                </FormLabel>
                <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                  <FormControl>
                    <SelectTrigger className="h-9 text-sm" data-testid="select-datasource">
                      <SelectValue placeholder="Select datasource..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None (simulated data)</SelectItem>
                    {datasourcesList.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id} data-testid={`option-datasource-${ds.id}`}>
                        <div className="flex items-center gap-2">
                          <span>{ds.name}</span>
                          <span className="text-[10px] text-muted-foreground capitalize">({ds.type})</span>
                          {ds.isDefault && <Badge className="text-[8px] h-3.5 px-1">default</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        )}

        <div className="space-y-2">
          {panels.map((panel, i) => (
            <QueryPanelEditor
              key={panel.id}
              panel={panel}
              panelIndex={i}
              editorMode={editorMode}
              canDelete={panels.length > 1}
              onUpdate={handleUpdatePanel}
              onDelete={handleDeletePanel}
            />
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-dashed w-full"
            onClick={handleAddPanel}
            data-testid="button-add-query-panel"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Query
          </Button>
        </div>

        <Card className="p-3 bg-accent/10 border-accent/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Settings2 className="w-3 h-3 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground font-medium">Query Options</Label>
            <ContextualHelpTip content="Legend format uses {{label}} templates for chart labels. Min step controls data point resolution (e.g., 15s, 1m). Type: Range returns data over time (charts), Instant returns current value only." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="legendFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] text-muted-foreground">Legend</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="{{label_name}}"
                      className="h-8 text-xs font-mono"
                      data-testid="input-legend-format"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="step"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] text-muted-foreground">Min step</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 15s, 1m"
                      className="h-8 text-xs font-mono"
                      data-testid="input-step"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="queryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] text-muted-foreground">Type</FormLabel>
                  <Select value={field.value || "range"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-query-type">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="range">Range</SelectItem>
                      <SelectItem value="instant">Instant</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
        </Card>

        <FormField
          control={form.control}
          name="visualizationType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                Visualization
                <ContextualHelpTip content="Choose how your data is displayed. Line/Area/Bar/Scatter work best for time-series data. Pie/Donut show proportional breakdowns with drill-down support. Sparkline is a compact mini chart for dashboard cards." />
              </FormLabel>
              <div className="flex gap-1 flex-wrap">
                {VISUALIZATION_TYPES.map((viz) => (
                  <Tooltip key={viz}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={field.value === viz ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => field.onChange(viz)}
                        data-testid={`button-viz-${viz}`}
                      >
                        {vizIcons[viz]}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="capitalize">{viz} chart</span>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </FormItem>
          )}
        />

        <Card className="p-3 bg-muted/30 border-muted">
          <div className="flex items-center gap-2 mb-1">
            <Code className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">PromQL Expressions</span>
          </div>
          <div className="space-y-1">
            {panelExpressions.map((pe) => (
              <div key={pe.letter} className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] h-5 w-5 p-0 flex items-center justify-center shrink-0">
                  {pe.letter}
                </Badge>
                <div className="font-mono text-sm p-1.5 bg-background rounded-md border text-foreground break-all flex-1" data-testid={`text-promql-expression-${pe.letter}`}>
                  {pe.expression || "..."}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <JsonPreview
          query={buildQuery(form.getValues())}
          expressions={panelExpressions}
          labelMatchers={panels[0]?.labelMatchers || []}
        />

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleExecute}
            className="gap-1.5"
            disabled={!canExecute}
            data-testid="button-execute-query"
          >
            <Play className="w-3.5 h-3.5" />
            Run Query
          </Button>
          <Button
            type="submit"
            className="gap-1.5"
            disabled={!canExecute || isSaving}
            data-testid="button-save-query"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save Query"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
