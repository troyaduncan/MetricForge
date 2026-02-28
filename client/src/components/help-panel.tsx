import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Layers,
  LayoutDashboard,
  Database,
  Star,
  Search,
  Code,
  Play,
  Save,
  Plus,
  BarChart3,
  PieChart,
  TrendingUp,
  ArrowRight,
  Settings2,
  Filter,
  Palette,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  MousePointerClick,
  LayoutGrid,
  List,
  Zap,
  BookOpen,
  Lightbulb,
  Info,
  ChevronRight,
  Keyboard,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  content: HelpTopic[];
}

interface HelpTopic {
  question: string;
  answer: React.ReactNode;
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: <BookOpen className="w-4 h-4" />,
    badge: "Start here",
    content: [
      {
        question: "What is MetricForge?",
        answer: (
          <div className="space-y-2">
            <p>MetricForge is a visual query builder for Prometheus metrics. It lets you construct PromQL (Prometheus Query Language) expressions without writing raw queries, then visualize the results in various chart formats.</p>
            <p>The app simulates real Prometheus data, so you can learn, prototype, and demonstrate queries without connecting to a live server.</p>
          </div>
        ),
      },
      {
        question: "How is the app organized?",
        answer: (
          <div className="space-y-3">
            <p>The app has three main areas:</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0 mt-0.5">
                  <Layers className="w-3 h-3 mr-1" />
                  Builder
                </Badge>
                <span className="text-sm">Create and edit PromQL queries using a visual interface or raw code editor</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0 mt-0.5">
                  <LayoutDashboard className="w-3 h-3 mr-1" />
                  Dashboard
                </Badge>
                <span className="text-sm">View your metric charts in a visual dashboard with grid or card layouts</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="shrink-0 mt-0.5">
                  <Database className="w-3 h-3 mr-1" />
                  Datasources
                </Badge>
                <span className="text-sm">Configure connections to Prometheus-compatible backends</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Switch between them using the tabs in the top header bar. The left sidebar shows your saved queries for quick access.</p>
          </div>
        ),
      },
      {
        question: "How do I build my first query?",
        answer: (
          <div className="space-y-2">
            <p>Follow these steps:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-sm">
              <li>Click the <strong>Builder</strong> tab in the header</li>
              <li>Enter a name for your query (e.g., "My HTTP Requests")</li>
              <li>In the <strong>Query A</strong> panel, click the metric selector and pick a metric like <code className="text-xs bg-muted px-1 rounded">http_requests_total</code></li>
              <li>Optionally add label filters (e.g., <code className="text-xs bg-muted px-1 rounded">job = "api-server"</code>)</li>
              <li>Add operations like <code className="text-xs bg-muted px-1 rounded">rate</code> to transform the data</li>
              <li>Choose a visualization type (line, bar, pie, etc.)</li>
              <li>Click <strong>Run Query</strong> to see the chart, or <strong>Save Query</strong> to save it</li>
            </ol>
          </div>
        ),
      },
    ],
  },
  {
    id: "query-builder",
    title: "Query Builder",
    icon: <Layers className="w-4 h-4" />,
    content: [
      {
        question: "What are Builder mode and Code mode?",
        answer: (
          <div className="space-y-2">
            <p>The query builder offers two ways to create queries:</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="shrink-0">
                  <Layers className="w-3 h-3 mr-1" />
                  Builder
                </Badge>
                <span className="text-sm">A visual, step-by-step interface where you select metrics, labels, and operations from dropdowns and buttons. Best for learning and exploring.</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="shrink-0">
                  <Code className="w-3 h-3 mr-1" />
                  Code
                </Badge>
                <span className="text-sm">A raw text editor where you type PromQL expressions directly. Best when you know the exact query you want.</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Switching from Builder to Code mode automatically converts your visual query into a PromQL expression you can further edit.</p>
          </div>
        ),
      },
      {
        question: "How do I select a metric?",
        answer: (
          <div className="space-y-2">
            <p>In Builder mode, each query panel has a <strong>Metric</strong> selector at the top. Click it to open a searchable dropdown with 15 common Prometheus metrics like:</p>
            <div className="flex flex-wrap gap-1">
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">http_requests_total</code>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">node_cpu_seconds_total</code>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">process_resident_memory_bytes</code>
            </div>
            <p className="text-sm">Each metric has a type (counter, gauge, histogram, summary) that determines how data is generated and which operations make sense.</p>
          </div>
        ),
      },
      {
        question: "What are label filters?",
        answer: (
          <div className="space-y-2">
            <p>Labels narrow down which time series to include. They work like filters on your data. Click <strong>+ Label</strong> to add a filter with three parts:</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">Label</Badge>
                <span>The label name (e.g., <code className="bg-muted px-1 rounded">job</code>, <code className="bg-muted px-1 rounded">instance</code>, <code className="bg-muted px-1 rounded">env</code>)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">Operator</Badge>
                <span>How to match: <code className="bg-muted px-1 rounded">=</code> exact, <code className="bg-muted px-1 rounded">!=</code> not equal, <code className="bg-muted px-1 rounded">=~</code> regex, <code className="bg-muted px-1 rounded">!~</code> not regex</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">Value</Badge>
                <span>The value to match against (e.g., <code className="bg-muted px-1 rounded">api-server</code>, <code className="bg-muted px-1 rounded">production</code>)</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Example: <code className="bg-muted px-1 rounded text-xs">job = "api-server"</code> only includes series where the job label equals "api-server".</p>
          </div>
        ),
      },
      {
        question: "What are operations and how do I use them?",
        answer: (
          <div className="space-y-2">
            <p>Operations transform your raw metric data. They are chained together in order, each one processing the output of the previous step. Click <strong>+ Operation</strong> to add one.</p>
            <p className="text-sm">Operations are organized into 6 categories:</p>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <div><Badge variant="outline" className="text-[10px]">Range</Badge> rate, irate, increase, delta...</div>
              <div><Badge variant="outline" className="text-[10px]">Aggregation</Badge> sum, avg, min, max, topk...</div>
              <div><Badge variant="outline" className="text-[10px]">Math</Badge> abs, ceil, floor, round, sqrt...</div>
              <div><Badge variant="outline" className="text-[10px]">Time</Badge> timestamp, hour, day_of_week...</div>
              <div><Badge variant="outline" className="text-[10px]">Label</Badge> label_replace, label_join</div>
              <div><Badge variant="outline" className="text-[10px]">Binary</Badge> add, subtract, multiply, divide...</div>
            </div>
            <p className="text-sm text-muted-foreground">Common pattern: Select a counter metric, add <code className="bg-muted px-1 rounded">rate</code> (with a 5m range), then <code className="bg-muted px-1 rounded">sum</code> to aggregate.</p>
          </div>
        ),
      },
      {
        question: "What are aggregation grouping clauses (by/without)?",
        answer: (
          <div className="space-y-2">
            <p>When you use an aggregation operation like <code className="bg-muted px-1 rounded text-xs">sum</code>, you can choose how to group the results:</p>
            <div className="space-y-1.5 text-sm">
              <div><strong>by</strong> — Keep only the specified labels, aggregating everything else. Example: <code className="bg-muted px-1 rounded text-xs">sum by (handler)</code> gives one value per handler.</div>
              <div><strong>without</strong> — Remove the specified labels, keeping everything else. Example: <code className="bg-muted px-1 rounded text-xs">sum without (instance)</code> combines all instances.</div>
            </div>
            <p className="text-sm text-muted-foreground">If you don't specify grouping, the aggregation combines all series into a single result.</p>
          </div>
        ),
      },
      {
        question: "What are Query Options (legend, step, type)?",
        answer: (
          <div className="space-y-2">
            <p>The Query Options section at the bottom of the builder lets you fine-tune how queries execute:</p>
            <div className="space-y-1.5 text-sm">
              <div><strong>Legend format</strong> — A template for chart legend labels, e.g., <code className="bg-muted px-1 rounded text-xs">{"{{instance}}"}</code> shows the instance label value.</div>
              <div><strong>Min step</strong> — The minimum time interval between data points (e.g., <code className="bg-muted px-1 rounded text-xs">15s</code>, <code className="bg-muted px-1 rounded text-xs">1m</code>). Smaller = more detail.</div>
              <div><strong>Type</strong> — <em>Range</em> returns data over a time window (for charts). <em>Instant</em> returns only the current value.</div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "multi-query",
    title: "Multi-Query Panels",
    icon: <Plus className="w-4 h-4" />,
    content: [
      {
        question: "How do I compare multiple metrics on one chart?",
        answer: (
          <div className="space-y-2">
            <p>Click the <strong>+ Add Query</strong> button below your existing query panels. Each new panel gets a letter (A, B, C...) and can have its own metric, labels, operations, and color.</p>
            <p className="text-sm">All enabled panels render as separate data series on the same chart, making it easy to compare metrics side by side (e.g., requests vs errors vs latency).</p>
          </div>
        ),
      },
      {
        question: "How do I manage individual query panels?",
        answer: (
          <div className="space-y-2">
            <p>Each panel has controls in its header:</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                <span><strong>Enable/Disable</strong> — Toggle a panel on or off without deleting it. Disabled panels don't appear in the chart.</span>
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span><strong>Collapse/Expand</strong> — Collapse a panel to save space while keeping it active.</span>
              </div>
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                <span><strong>Color</strong> — Pick a unique color for each series so they're easy to distinguish.</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span><strong>Delete</strong> — Remove a panel entirely (the first panel A can't be deleted).</span>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard & Charts",
    icon: <LayoutDashboard className="w-4 h-4" />,
    content: [
      {
        question: "What chart types are available?",
        answer: (
          <div className="space-y-2">
            <p>MetricForge supports seven visualization types:</p>
            <div className="grid grid-cols-1 gap-1.5 text-sm">
              <div><strong>Line</strong> — Standard time-series chart, best for tracking trends over time</div>
              <div><strong>Area</strong> — Filled line chart, good for showing volume or utilization</div>
              <div><strong>Bar</strong> — Vertical bars for comparing values across time periods</div>
              <div><strong>Scatter</strong> — Data points showing distribution, useful for latency analysis</div>
              <div><strong>Pie</strong> — Proportional breakdown of categorical data, with drill-down support</div>
              <div><strong>Donut</strong> — Ring-style pie chart, same drill-down capability</div>
              <div><strong>Sparkline</strong> — Compact mini chart for dense dashboard layouts</div>
            </div>
          </div>
        ),
      },
      {
        question: "How do grid view and cards view differ?",
        answer: (
          <div className="space-y-2">
            <p>The dashboard offers two layout modes, toggled with the buttons in the top-right corner:</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <List className="w-3.5 h-3.5 text-muted-foreground" />
                <span><strong>Grid view</strong> — Full-size charts arranged in a 2-column grid. Each chart shows axes, tooltips, stat cards, and time range controls. Click the expand button to view a chart full-width.</span>
              </div>
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
                <span><strong>Cards view</strong> — Compact dashboard cards in a 3-column layout. Each card shows a small thumbnail chart, the key metric value, and a trend indicator. Great for monitoring many metrics at a glance.</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        question: "How does drill-down work on pie and donut charts?",
        answer: (
          <div className="space-y-2">
            <p>Pie and donut charts support interactive drill-down navigation:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click any segment of a pie or donut chart to explore its sub-metrics</li>
              <li>A breadcrumb trail appears at the top showing your drill path (e.g., "Traffic &rarr; GET /api/v1 &rarr; /users")</li>
              <li>Click the back arrow to go up one level</li>
              <li>The data breaks down into progressively more detailed categories (e.g., endpoint &rarr; route &rarr; pod)</li>
            </ol>
            <p className="text-sm text-muted-foreground">This works because each metric type generates hierarchical categorical data. For example, counter metrics break down by HTTP method, then by individual routes.</p>
          </div>
        ),
      },
      {
        question: "What do the stat cards show?",
        answer: (
          <div className="space-y-2">
            <p>Each chart has summary stat cards that adapt based on the chart type:</p>
            <div className="space-y-1 text-sm">
              <div><strong>Line/Area/Bar/Scatter:</strong> Current value, Average, Minimum, Maximum — each with a trend percentage</div>
              <div><strong>Pie/Donut:</strong> Total value, Number of segments, Largest segment name and percentage</div>
              <div><strong>Sparkline:</strong> Latest value, Min, Max</div>
            </div>
          </div>
        ),
      },
      {
        question: "What are the pre-populated sample charts?",
        answer: (
          <div className="space-y-2">
            <p>When you first open the app, the dashboard shows 8 sample charts demonstrating all visualization types:</p>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <div>HTTP Request Rate (Line)</div>
              <div>CPU Utilization (Area)</div>
              <div>Error Rate by Service (Bar)</div>
              <div>Latency Distribution (Scatter)</div>
              <div>Traffic by Endpoint (Pie)</div>
              <div>Memory by Region (Donut)</div>
              <div>Active Connections (Sparkline)</div>
              <div>Request vs Error Rate (Multi-query)</div>
            </div>
            <p className="text-sm text-muted-foreground">These use simulated data so you can explore all features immediately without creating any queries first.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "datasources",
    title: "Datasource Management",
    icon: <Database className="w-4 h-4" />,
    content: [
      {
        question: "What are datasources?",
        answer: (
          <div className="space-y-2">
            <p>Datasources represent connections to Prometheus-compatible metric backends. You can define multiple datasources and associate them with your queries.</p>
            <p className="text-sm">Supported backend types:</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">Prometheus</Badge>
              <Badge variant="outline" className="text-xs">Thanos</Badge>
              <Badge variant="outline" className="text-xs">Cortex</Badge>
              <Badge variant="outline" className="text-xs">Mimir</Badge>
              <Badge variant="outline" className="text-xs">VictoriaMetrics</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Currently, queries use simulated data regardless of datasource configuration. Datasources serve as metadata for organizing and labeling your queries by target environment.</p>
          </div>
        ),
      },
      {
        question: "How do I add a datasource?",
        answer: (
          <div className="space-y-2">
            <ol className="list-decimal list-inside space-y-1.5 text-sm">
              <li>Go to the <strong>Datasources</strong> tab</li>
              <li>Click <strong>Add Datasource</strong></li>
              <li>Fill in the form:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                  <li><strong>Name</strong> — A descriptive label (e.g., "Production Prometheus")</li>
                  <li><strong>Type</strong> — The backend type</li>
                  <li><strong>URL</strong> — The endpoint address (e.g., http://prometheus:9090)</li>
                  <li><strong>Access</strong> — Proxy (server-side) or Direct (browser-side)</li>
                  <li><strong>Scrape Interval / Query Timeout</strong> — Timing settings</li>
                  <li><strong>HTTP Method</strong> — GET or POST for queries</li>
                  <li><strong>Basic Auth</strong> — Enable with username if the server requires authentication</li>
                  <li><strong>Default</strong> — Mark as the default datasource for new queries</li>
                </ul>
              </li>
              <li>Click <strong>Save</strong></li>
            </ol>
          </div>
        ),
      },
      {
        question: "What does the Default toggle do?",
        answer: (
          <div className="space-y-2">
            <p>Setting a datasource as default means it will be prominently indicated in the list. Only one datasource can be default at a time — enabling it on one automatically disables it on any other.</p>
            <p className="text-sm text-muted-foreground">In the query builder, you can select any datasource from the dropdown regardless of the default setting.</p>
          </div>
        ),
      },
    ],
  },
  {
    id: "saved-queries",
    title: "Saving & Managing Queries",
    icon: <Star className="w-4 h-4" />,
    content: [
      {
        question: "How do I save a query?",
        answer: (
          <div className="space-y-2">
            <p>After building your query in the Builder tab, click the <strong>Save Query</strong> button. The query is persisted to the database and appears in the left sidebar.</p>
            <p className="text-sm text-muted-foreground">You must give your query a name and have at least one metric selected (in Builder mode) or a valid expression (in Code mode) before saving.</p>
          </div>
        ),
      },
      {
        question: "How do I find and use saved queries?",
        answer: (
          <div className="space-y-2">
            <p>The left sidebar lists all your saved queries. You can:</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <span><strong>Search</strong> — Type in the search bar to filter queries by name</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-muted-foreground" />
                <span><strong>Favorite</strong> — Click the star icon to mark/unmark favorites for quick access</span>
              </div>
              <div className="flex items-center gap-2">
                <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground" />
                <span><strong>Click</strong> — Click a query to view its chart on the dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span><strong>Edit</strong> — Hover and click the edit button to load it into the builder for modification</span>
              </div>
              <div className="flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span><strong>Delete</strong> — Hover and click the delete button to remove a saved query</span>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "request-log",
    title: "Request Log",
    icon: <Zap className="w-4 h-4" />,
    content: [
      {
        question: "What is the datasource request log?",
        answer: (
          <div className="space-y-2">
            <p>The request log appears below the query builder and simulates what a real Prometheus API request would look like. Each time you click <strong>Run Query</strong>, a log entry is generated showing:</p>
            <div className="space-y-1 text-sm">
              <div>HTTP method and endpoint (e.g., <code className="bg-muted px-1 rounded text-xs">POST /api/v1/query_range</code>)</div>
              <div>Status code (200, 400, etc.) with color coding</div>
              <div>Latency in milliseconds</div>
              <div>Response size in bytes</div>
            </div>
            <p className="text-sm text-muted-foreground">Click any log entry to expand it and see the full request details and a simulated response preview. Use the <strong>Clear</strong> button to reset the log.</p>
          </div>
        ),
      },
      {
        question: "What do the summary stats mean?",
        answer: (
          <div className="space-y-2">
            <p>Above the log entries, four summary cards show:</p>
            <div className="space-y-1 text-sm">
              <div><strong>Total Requests</strong> — How many queries have been executed in this session</div>
              <div><strong>Avg Latency</strong> — Average simulated response time across all requests</div>
              <div><strong>Bytes Returned</strong> — Total simulated data transfer volume</div>
              <div><strong>Success Rate</strong> — Percentage of requests with 2xx status codes</div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "promql",
    title: "PromQL Quick Reference",
    icon: <Code className="w-4 h-4" />,
    content: [
      {
        question: "What is PromQL?",
        answer: (
          <div className="space-y-2">
            <p>PromQL (Prometheus Query Language) is the query language used to select and aggregate time-series data from Prometheus. A typical expression looks like:</p>
            <code className="block bg-muted px-3 py-2 rounded text-xs font-mono">rate(http_requests_total{"{"}job="api-server"{"}"} [5m])</code>
            <p className="text-sm">This reads: "Calculate the per-second rate of HTTP requests over the last 5 minutes, filtered to the api-server job."</p>
          </div>
        ),
      },
      {
        question: "Common PromQL patterns",
        answer: (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Request rate per second:</p>
              <code className="block bg-muted px-2 py-1 rounded text-xs font-mono">rate(http_requests_total[5m])</code>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">95th percentile latency:</p>
              <code className="block bg-muted px-2 py-1 rounded text-xs font-mono">histogram_quantile(0.95, rate(http_duration_seconds_bucket[5m]))</code>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Total by label:</p>
              <code className="block bg-muted px-2 py-1 rounded text-xs font-mono">sum by (handler)(rate(http_requests_total[5m]))</code>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Error percentage:</p>
              <code className="block bg-muted px-2 py-1 rounded text-xs font-mono">rate(errors_total[5m]) / rate(requests_total[5m]) * 100</code>
            </div>
          </div>
        ),
      },
      {
        question: "What metric types should I know?",
        answer: (
          <div className="space-y-2">
            <div className="space-y-1.5 text-sm">
              <div><strong>Counter</strong> — A value that only goes up (e.g., total requests). Always use <code className="bg-muted px-1 rounded text-xs">rate()</code> or <code className="bg-muted px-1 rounded text-xs">increase()</code> to make it useful.</div>
              <div><strong>Gauge</strong> — A value that can go up and down (e.g., temperature, memory usage). Can be used directly.</div>
              <div><strong>Histogram</strong> — Tracks distribution of values in buckets (e.g., request latency). Use <code className="bg-muted px-1 rounded text-xs">histogram_quantile()</code> to extract percentiles.</div>
              <div><strong>Summary</strong> — Similar to histogram but calculates quantiles client-side. Less flexible but more precise for pre-calculated percentiles.</div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "tips",
    title: "Tips & Shortcuts",
    icon: <Lightbulb className="w-4 h-4" />,
    content: [
      {
        question: "Useful tips for working with MetricForge",
        answer: (
          <div className="space-y-2">
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Hover over visualization type icons to see their names before selecting</span>
              </div>
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Use the JSON preview panel at the bottom of the builder to see the full query structure — click the copy button to grab it</span>
              </div>
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>When comparing metrics, use multi-query panels (A, B, C) rather than creating separate queries — they'll overlay on the same chart</span>
              </div>
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Click the expand button on any dashboard chart to view it full-width for detailed analysis</span>
              </div>
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Switch to Cards view on the dashboard for a high-density overview of all your metrics at once</span>
              </div>
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Use the <strong>Clear</strong> button on the builder to quickly reset the form for a fresh start</span>
              </div>
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>Toggle dark/light mode with the sun/moon icon in the top-right corner</span>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
];

function HelpSectionNav({
  sections,
  activeSection,
  onSelect,
}: {
  sections: HelpSection[];
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {sections.map((section) => (
        <Button
          key={section.id}
          variant={activeSection === section.id ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => onSelect(section.id)}
          data-testid={`help-nav-${section.id}`}
        >
          {section.icon}
          {section.title}
          {section.badge && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">
              {section.badge}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
}

export function HelpPanel() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const currentSection = HELP_SECTIONS.find((s) => s.id === activeSection) || HELP_SECTIONS[0];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-help"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0" data-testid="help-panel">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            Help & Documentation
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Learn how to use MetricForge to build PromQL queries and visualize metrics.
          </p>
        </SheetHeader>

        <div className="px-6 py-4 border-b bg-muted/30">
          <HelpSectionNav
            sections={HELP_SECTIONS}
            activeSection={activeSection}
            onSelect={setActiveSection}
          />
        </div>

        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-4">
              {currentSection.icon}
              <h3 className="font-semibold text-base">{currentSection.title}</h3>
            </div>

            <Accordion type="multiple" defaultValue={currentSection.content.map((_, i) => `item-${i}`)} className="space-y-2">
              {currentSection.content.map((topic, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border rounded-lg px-4 data-[state=open]:bg-muted/20"
                  data-testid={`help-topic-${activeSection}-${index}`}
                >
                  <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline gap-2">
                    <div className="flex items-center gap-2 text-left">
                      <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                      {topic.question}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">
                    {topic.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function ContextualHelpTip({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <span className="group relative inline-flex">
        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 rounded-lg bg-popover border shadow-lg text-xs text-popover-foreground opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-popover" />
        </span>
      </span>
    </span>
  );
}
