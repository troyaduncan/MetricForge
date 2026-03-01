# MetricForge - Prometheus Metrics Builder

A modern, interactive Grafana/Prometheus-style datasource metrics builder application. Build PromQL expressions through an intuitive visual interface, manage multiple Prometheus-compatible datasources, save queries, and visualize generated metrics on a dashboard with seven chart types and advanced features like multi-query panels, drill-down navigation, and simulated request logging.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Environment Configuration](#environment-configuration)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [API Reference](#api-reference)
- [Frontend Components](#frontend-components)
- [Features](#features)
- [PromQL Operations Reference](#promql-operations-reference)
- [Theming](#theming)
- [Getting Started](#getting-started)

---

## Overview

MetricForge provides a full-featured visual query builder for constructing PromQL (Prometheus Query Language) expressions without writing raw queries. Users can select metrics, chain operations (rate, sum, histogram_quantile, and 50+ more), apply label filters with advanced operators, configure query options, and instantly visualize results across seven chart formats. Queries can be saved, edited, favorited, and associated with configured Prometheus datasources.

The application supports multi-query chart panels, allowing users to layer multiple metric expressions (A, B, C...) on a single chart for side-by-side comparison. It also simulates Prometheus-style time-series and categorical data on the client side, making it a fully self-contained tool for learning, prototyping, and demonstrating PromQL query construction and metric visualization without requiring a live Prometheus server.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Client (React)                            │
│                                                                  │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │  App Sidebar   │  │ Query Builder  │  │   Metric Chart      │  │
│  │               │  │                │  │                     │  │
│  │ - Saved list  │  │ - Builder mode │  │ - 7 chart types     │  │
│  │ - Search      │  │ - Code mode    │  │ - Multi-series      │  │
│  │ - Favorites   │  │ - Operations   │  │ - Drill-down        │  │
│  │ - Edit/Del    │  │ - Labels       │  │ - Stats cards       │  │
│  └──────┬────────┘  │ - Multi-query  │  └──────────┬──────────┘  │
│         │           │ - Datasource   │             │             │
│         │           └───────┬────────┘             │             │
│         │                   │                      │             │
│  ┌──────┴───────────────────┴──────────────────────┴──────────┐  │
│  │              TanStack React Query v5                        │  │
│  │         (data fetching, caching, mutations)                 │  │
│  └────────────────────────────┬────────────────────────────────┘  │
│                               │                                  │
│  ┌────────────────────────────┴────────────────────────────────┐  │
│  │  Datasource Manager  │  Datasource Request Log             │  │
│  │  - CRUD UI            │  - Simulated API logs               │  │
│  │  - Default selection  │  - Latency/status/bytes             │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP REST
┌────────────────────────────┴─────────────────────────────────────┐
│                     Server (Express.js)                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   Routes      │  │   Storage    │  │     Seed Data          │  │
│  │               │  │              │  │                        │  │
│  │ /api/queries  │──│ DatabaseStore│  │ 9 sample PromQL        │  │
│  │ /api/datasrc  │  │ (Drizzle)   │  │ queries across all     │  │
│  │ CRUD ops      │  │              │  │ chart types            │  │
│  └──────────────┘  └──────┬───────┘  └────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   PostgreSQL    │
                    │   (Neon-backed) │
                    └─────────────────┘
```

### Request Flow

1. **User interaction** triggers a React component action (build query, save, configure datasource, etc.)
2. **TanStack React Query** manages the API request lifecycle (loading states, caching, cache invalidation)
3. **Express routes** validate the request body using Zod schemas derived from the Drizzle model
4. **DatabaseStorage** performs the actual CRUD operation via Drizzle ORM
5. **PostgreSQL** persists all saved queries and datasource configurations
6. **Client-side data generation** simulates Prometheus time-series data for chart rendering (no live Prometheus connection required)

---

## Tech Stack

| Layer       | Technology                                             |
|-------------|--------------------------------------------------------|
| Frontend    | React 18, TypeScript, Vite                             |
| Styling     | Tailwind CSS, Shadcn UI components                     |
| Forms       | react-hook-form, @hookform/resolvers (Zod)             |
| Charts      | Recharts                                               |
| Routing     | Wouter                                                 |
| Data Layer  | TanStack React Query v5                                |
| Theming     | next-themes (dark/light mode)                          |
| Backend     | Express.js, TypeScript                                 |
| ORM         | Drizzle ORM                                            |
| Database    | PostgreSQL (Neon)                                      |
| Validation  | Zod (via drizzle-zod)                                  |
| Icons       | Lucide React                                           |

---

## Environment Configuration

The application uses `dotenv` to load environment variables from a `.env` file at startup. This makes it easy to configure database connections and other settings for local or on-premises deployments.

### Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/metricforge
   SESSION_SECRET=your-random-secret-string-here
   PORT=5000
   ```

### Variables

| Variable         | Required | Description                                      | Default |
|------------------|----------|--------------------------------------------------|---------|
| `DATABASE_URL`   | Yes      | PostgreSQL connection string                     | —       |
| `SESSION_SECRET` | Yes      | Random string for session security               | —       |
| `PORT`           | No       | Server port                                      | 5000    |

The `.env` file is gitignored to prevent committing secrets. The `.env.example` file serves as a template with placeholder values.

---

## Project Structure

```
├── client/
│   └── src/
│       ├── App.tsx                    # Root component, routing, providers
│       ├── index.css                  # Global styles, CSS variables, theming
│       ├── pages/
│       │   ├── home.tsx               # Main page: sidebar + builder/dashboard/datasources tabs
│       │   ├── admin-debug.tsx        # Admin debug console: logs, requests, config
│       │   └── not-found.tsx          # 404 fallback page
│       ├── components/
│       │   ├── app-sidebar.tsx        # Saved queries sidebar (Shadcn Sidebar)
│       │   ├── query-builder.tsx      # Full Grafana-style PromQL query builder
│       │   ├── metric-chart.tsx       # Chart visualization + dashboard cards
│       │   ├── datasource-manager.tsx # Datasource CRUD management UI
│       │   ├── help-panel.tsx         # Help panel (Sheet) + contextual help tooltips
│       │   ├── saved-queries-panel.tsx # Saved queries panel
│       │   ├── datasource-request-log.tsx # Simulated Prometheus request log
│       │   └── ui/                    # Shadcn UI component library
│       ├── hooks/
│       │   └── use-toast.ts           # Toast notification hook
│       └── lib/
│           ├── metrics-data.ts        # Time-series data generation, PromQL builder
│           ├── queryClient.ts         # TanStack Query client configuration
│           └── utils.ts               # Utility functions (cn, etc.)
├── server/
│   ├── index.ts                       # Server entry point (loads dotenv, logging middleware)
│   ├── routes.ts                      # REST API route handlers (queries + datasources + logs)
│   ├── logger.ts                      # Application logging module (file + in-memory)
│   ├── storage.ts                     # Database storage interface & implementation
│   ├── db.ts                          # Drizzle database connection
│   ├── seed.ts                        # Seed data (9 sample PromQL queries)
│   └── vite.ts                        # Vite dev server integration
├── logs/                              # Runtime log files (gitignored, auto-created)
├── shared/
│   └── schema.ts                      # Drizzle schema, types, operation definitions, constants
├── .env.example                       # Environment variable template
├── drizzle.config.ts                  # Drizzle Kit configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── vite.config.ts                     # Vite build configuration
└── package.json                       # Dependencies and scripts
```

---

## Data Model

### `datasources` Table

Stores Prometheus-compatible datasource configurations. Defined in `shared/schema.ts` using Drizzle ORM.

| Column           | Type        | Description                                                      |
|------------------|-------------|------------------------------------------------------------------|
| `id`             | UUID        | Primary key, auto-generated                                      |
| `name`           | text        | Human-readable datasource name                                   |
| `type`           | text        | Backend type: `prometheus`, `thanos`, `cortex`, `mimir`, `victoriametrics` |
| `url`            | text        | Datasource endpoint URL                                          |
| `access`         | text        | Access mode: `proxy` or `direct`                                 |
| `basicAuth`      | boolean     | Whether basic authentication is enabled                          |
| `basicAuthUser`  | text        | Username for basic authentication (if enabled)                   |
| `isDefault`      | boolean     | Whether this is the default datasource for new queries           |
| `customHeaders`  | jsonb       | Custom HTTP headers as key-value pairs                           |
| `scrapeInterval` | text        | Scrape interval setting (e.g., `15s`, `30s`, `1m`)              |
| `queryTimeout`   | text        | Query timeout setting (e.g., `30s`, `60s`)                      |
| `httpMethod`     | text        | HTTP method for queries: `GET` or `POST`                         |
| `tlsClientAuth`  | boolean     | Whether TLS client certificate authentication is enabled         |
| `tlsSkipVerify`  | boolean     | Skip server TLS certificate verification (insecure)              |
| `tlsCaCert`      | text        | PEM-encoded CA certificate for server verification               |
| `tlsClientCert`  | text        | PEM-encoded client certificate (for mutual TLS)                  |
| `tlsClientKey`   | text        | PEM-encoded client private key (for mutual TLS)                  |
| `tlsServerName`  | text        | Server Name Indication (SNI) override                            |
| `createdAt`      | timestamp   | Auto-set creation timestamp                                      |
| `updatedAt`      | timestamp   | Auto-set update timestamp                                        |

### `metricQueries` Table

Stores saved PromQL queries with full builder state and visualization settings.

| Column             | Type        | Description                                                      |
|--------------------|-------------|------------------------------------------------------------------|
| `id`               | UUID        | Primary key, auto-generated                                      |
| `name`             | text        | Human-readable query name                                        |
| `description`      | text        | Optional description                                             |
| `expression`       | text        | Generated PromQL expression string                               |
| `metricName`       | text        | Base Prometheus metric name                                      |
| `metricType`       | text        | One of: `counter`, `gauge`, `histogram`, `summary`               |
| `labels`           | jsonb       | Array of `LabelMatcher` objects: `{label, op, value}`            |
| `operations`       | jsonb       | Array of `QueryOperation` objects: `{id, type, params}`          |
| `legendFormat`     | text        | Legend format template string                                    |
| `step`             | text        | Min step / resolution interval                                   |
| `queryType`        | text        | Query type: `range` or `instant`                                 |
| `subQueries`       | jsonb       | Array of `SubQuery` objects for multi-query chart panels         |
| `datasourceId`     | UUID        | Optional foreign key linking to a datasource                     |
| `visualizationType`| text        | Chart type: `line`, `area`, `bar`, `scatter`, `pie`, `donut`, `sparkline` |
| `color`            | text        | Hex color for chart rendering                                    |
| `isFavorite`       | boolean     | Whether the query is marked as a favorite                        |
| `aggregation`      | text        | Legacy aggregation field (backward compatibility)                |
| `range`            | text        | Legacy range field (backward compatibility)                      |
| `createdAt`        | timestamp   | Auto-set creation timestamp                                      |
| `updatedAt`        | timestamp   | Auto-set update timestamp                                        |

### Key TypeScript Interfaces

**`LabelMatcher`** — Represents a PromQL label filter:
```typescript
{ label: string, op: "=" | "!=" | "=~" | "!~", value: string }
```

**`QueryOperation`** — Represents a chained PromQL operation:
```typescript
{ id: string, type: string, params: Record<string, any> }
```

**`SubQuery`** — Represents one query panel in a multi-query chart:
```typescript
{
  id: string, letter: string, enabled: boolean,
  metricName: string, metricType: string,
  labels: LabelMatcher[], operations: QueryOperation[],
  expression: string, color: string
}
```

### Constants (shared/schema.ts)

- **METRIC_TYPES**: `["counter", "gauge", "histogram", "summary"]`
- **VISUALIZATION_TYPES**: `["line", "area", "bar", "scatter", "pie", "donut", "sparkline"]`
- **COMMON_METRICS**: 15 predefined Prometheus metric names with types and descriptions
- **COMMON_LABELS**: Standard label keys (`job`, `instance`, `env`, `namespace`, `service`, etc.)
- **CHART_COLORS**: 10-color palette based on T-Mobile magenta brand
- **OPERATION_DEFINITIONS**: 50+ PromQL operations with categories, descriptions, and parameter definitions

---

## API Reference

All endpoints are prefixed with `/api`.

### Queries

#### `GET /api/queries`

Returns all saved metric queries, ordered by creation date (newest first).

**Response**: `200 OK` — Array of `MetricQuery` objects

#### `GET /api/queries/:id`

Returns a single metric query by UUID.

**Response**:
- `200 OK` — Single `MetricQuery` object
- `404 Not Found` — `{ message: "Query not found" }`

#### `POST /api/queries`

Creates a new metric query.

**Request Body**: JSON matching `insertMetricQuerySchema` (validated with Zod)

| Field              | Required | Type     | Description                           |
|--------------------|----------|----------|---------------------------------------|
| `name`             | Yes      | string   | Query name                            |
| `expression`       | Yes      | string   | PromQL expression                     |
| `metricName`       | Yes      | string   | Base metric name                      |
| `metricType`       | Yes      | string   | Metric type                           |
| `visualizationType`| No       | string   | Chart type (default: line)            |
| `color`            | No       | string   | Hex color                             |
| `labels`           | No       | jsonb    | Label matchers array                  |
| `operations`       | No       | jsonb    | Operations chain array                |
| `subQueries`       | No       | jsonb    | Sub-query panels array                |
| `datasourceId`     | No       | string   | Associated datasource UUID            |
| `legendFormat`     | No       | string   | Legend format template                |
| `step`             | No       | string   | Min step / resolution                 |
| `queryType`        | No       | string   | `range` or `instant`                  |
| `description`      | No       | string   | Query description                     |
| `isFavorite`       | No       | boolean  | Favorite flag                         |

**Response**:
- `201 Created` — Created `MetricQuery` object
- `400 Bad Request` — Validation error details

#### `PATCH /api/queries/:id`

Updates an existing metric query. Supports partial updates.

**Response**:
- `200 OK` — Updated `MetricQuery` object
- `400 Bad Request` — Validation error details
- `404 Not Found` — `{ message: "Query not found" }`

#### `DELETE /api/queries/:id`

Deletes a metric query by UUID.

**Response**:
- `204 No Content` — Successfully deleted
- `404 Not Found` — `{ message: "Query not found" }`

### Datasources

#### `GET /api/datasources`

Returns all configured datasources.

**Response**: `200 OK` — Array of `Datasource` objects

#### `GET /api/datasources/:id`

Returns a single datasource by UUID.

**Response**:
- `200 OK` — Single `Datasource` object
- `404 Not Found` — `{ message: "Datasource not found" }`

#### `POST /api/datasources`

Creates a new datasource. If `isDefault` is set to `true`, the previous default datasource (if any) is automatically cleared.

**Request Body**: JSON matching `insertDatasourceSchema` (validated with Zod)

| Field            | Required | Type    | Description                                  |
|------------------|----------|---------|----------------------------------------------|
| `name`           | Yes      | string  | Datasource name                              |
| `type`           | Yes      | string  | `prometheus`, `thanos`, `cortex`, `mimir`, `victoriametrics` |
| `url`            | Yes      | string  | Endpoint URL                                 |
| `access`         | No       | string  | `proxy` or `direct` (default: proxy)         |
| `basicAuth`      | No       | boolean | Enable basic auth                            |
| `basicAuthUser`  | No       | string  | Auth username                                |
| `isDefault`      | No       | boolean | Set as default datasource                    |
| `customHeaders`  | No       | jsonb   | Custom HTTP headers                          |
| `scrapeInterval` | No       | string  | Scrape interval (e.g., `15s`)                |
| `queryTimeout`   | No       | string  | Query timeout (e.g., `60s`)                  |
| `httpMethod`     | No       | string  | `GET` or `POST`                              |
| `tlsClientAuth`  | No       | boolean | Enable TLS client certificate auth            |
| `tlsSkipVerify`  | No       | boolean | Skip TLS certificate verification             |
| `tlsCaCert`      | No       | string  | PEM-encoded CA certificate                    |
| `tlsClientCert`  | No       | string  | PEM-encoded client certificate                |
| `tlsClientKey`   | No       | string  | PEM-encoded client private key                |
| `tlsServerName`  | No       | string  | SNI server name override                      |

**Response**:
- `201 Created` — Created `Datasource` object
- `400 Bad Request` — Validation error details

#### `PATCH /api/datasources/:id`

Updates an existing datasource. Supports partial updates. Setting `isDefault: true` clears the previous default.

**Response**:
- `200 OK` — Updated `Datasource` object
- `400 Bad Request` — Validation error details
- `404 Not Found` — `{ message: "Datasource not found" }`

#### `DELETE /api/datasources/:id`

Deletes a datasource by UUID.

**Response**:
- `204 No Content` — Successfully deleted
- `404 Not Found` — `{ message: "Datasource not found" }`

### Logging & Debug

#### `GET /api/logs/config`

Returns the current logging configuration.

**Response**: `200 OK` — `LogConfig` object with level, output settings, and API logging flags

#### `PATCH /api/logs/config`

Updates logging configuration settings.

**Request Body** (all fields optional):

| Field            | Type    | Description                                      |
|------------------|---------|--------------------------------------------------|
| `level`          | string  | Minimum log level: `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `consoleOutput`  | boolean | Enable/disable console output                    |
| `fileOutput`     | boolean | Enable/disable file output                       |
| `maxFiles`       | number  | Maximum number of log files to retain             |
| `logApiRequests` | boolean | Log API request details                           |
| `logApiResponses`| boolean | Log API response bodies                           |
| `logDbQueries`   | boolean | Log database operations                           |

**Response**: `200 OK` — Updated `LogConfig` object

#### `GET /api/logs/app`

Returns application log entries with optional filtering.

**Query Parameters**: `level`, `category`, `limit`, `offset`, `search`

**Response**: `200 OK` — `{ entries: AppLogEntry[], total: number }`

#### `GET /api/logs/requests`

Returns API request log entries with stats.

**Query Parameters**: `limit`, `offset`, `method`, `statusCode`, `path`

**Response**: `200 OK` — `{ entries: RequestLogEntry[], total: number, stats: RequestStats }`

Stats include: `totalRequests`, `avgLatencyMs`, `totalBytes`, `successCount`, `errorCount`, `p95LatencyMs`, `p99LatencyMs`, `methodBreakdown`, `statusBreakdown`

#### `GET /api/logs/files`

Returns a list of log files on disk with name, size, and creation date.

#### `GET /api/logs/files/:filename`

Returns the content of a specific log file.

#### `GET /api/logs/current`

Returns the filename of the current active log file.

#### `POST /api/logs/clear`

Clears all in-memory log entries.

---

## Frontend Components

### Home Page (`client/src/pages/home.tsx`)

The main application page, structured with Shadcn's `SidebarProvider` layout:

- **Left sidebar**: `AppSidebar` — lists saved queries with search, favorites, edit, and delete actions
- **Main content area**: Tabbed interface with three tabs:
  - **Dashboard tab** (default): Pre-populated charts with grid/cards view toggle and drill-down navigation
  - **Builder tab**: Full PromQL query builder with JSON preview and request log
  - **Datasources tab**: Datasource connection management with CRUD operations

### AppSidebar (`client/src/components/app-sidebar.tsx`)

Built on Shadcn Sidebar primitives (`Sidebar`, `SidebarContent`, `SidebarGroup`, etc.):

- Displays all saved queries fetched via TanStack Query
- Search/filter bar for quick lookup
- Each query card shows: name, metric type badge, expression preview, favorite toggle
- Hover actions: edit (loads into builder), delete (with confirmation)
- Clicking a query switches to Dashboard tab and renders its chart

### QueryBuilder (`client/src/components/query-builder.tsx`)

A comprehensive Grafana-style query builder with two editing modes:

**Builder Mode:**
- **Query Name & Description**: Text inputs for metadata
- **Datasource Selector**: Dropdown to associate the query with a configured datasource (or "None" for simulated data)
- **Multi-Query Panels (A, B, C...)**: Each panel independently configures:
  - Metric name via searchable combobox with 15 common Prometheus metrics
  - Metric type (auto-detected or manually overridden)
  - Label filters with operators (`=`, `!=`, `=~`, `!~`), add/remove dynamically
  - Operations chain: add, remove, and reorder 50+ PromQL operations with per-operation parameters
  - Aggregation grouping: `by` / `without` clause with label selection
  - Per-panel color picker from the brand palette
  - Enable/disable toggle and collapse/expand controls
- **Query Options**: Legend format, min step/resolution, range/instant query type
- **Visualization Type**: Icon toggle buttons for all seven chart types
- **PromQL Preview**: Live-updating expression display

**Code Mode:**
- Raw PromQL expression editor with syntax-aware editing
- Per-panel raw expression input

**Shared Features:**
- JSON Representation panel with copy-to-clipboard
- Run Query button (executes and shows chart)
- Save Query button (persists to database)
- Reset button to clear the form

### MetricChart (`client/src/components/metric-chart.tsx`)

Renders metric data using Recharts with two display modes:

- **Full view**: Expanded chart with stat cards, time range selector, refresh, and expand/collapse
- **Compact view** (`compact` prop): Dashboard card with small thumbnail chart and key metric value

Supports seven chart types:
- **LineChart**: Standard time-series with axes, grid, and tooltips
- **AreaChart**: Filled time-series for volume visualization
- **BarChart**: Vertical bars for categorical or time-bucketed data
- **ScatterChart**: Point distribution for latency/correlation analysis
- **PieChart**: Categorical breakdown with labeled segments and drill-down
- **Donut**: Ring-style pie chart variant with center hole and drill-down
- **Sparkline**: Minimal area chart for compact trend visualization

**Multi-Series Support**: When a query has sub-queries (A, B, C...), the chart renders multiple data series with per-series colors and a legend.

**Drill-Down Navigation** (Pie/Donut only):
- Click a segment to explore sub-metrics
- Breadcrumb trail shows the drill path (e.g., "GET /api/v1 > /users")
- Back button navigates up one level
- Multi-level hierarchy: endpoint -> pod-level breakdown

**Statistical Overview Cards** adapt per chart type:
- Line/Area/Bar/Scatter: Current, Average, Min, Max with trend percentage
- Pie/Donut: Total, Segments, Largest segment
- Sparkline: Latest, Min, Max

**DashboardCards** component: Renders all active charts in a responsive grid with mini chart thumbnails, metric values, and trend indicators. Toggle between grid and cards view.

### HelpPanel & ContextualHelpTip (`client/src/components/help-panel.tsx`)

Two-layer help system providing both global documentation and inline guidance:

- **HelpPanel**: A `Sheet` component triggered by a `?` button in the header. Opens from the right side with:
  - Category navigation pills for 8 help sections
  - Accordion-based topic expansion within each section
  - Rich content with code examples, labeled badges, step-by-step instructions, and organized lists
  - Covers every major app feature from query building to PromQL reference

- **ContextualHelpTip**: A lightweight inline component that renders a small `?` icon. On hover, a styled tooltip popup appears with concise guidance about the nearby feature. Placed next to:
  - Label Filters, Operations, Query Options, and Visualization sections in the query builder
  - Dashboard and Builder page headers
  - Datasource manager description

### Admin Debug Console (`client/src/pages/admin-debug.tsx`)

A dedicated admin page for viewing application logs, API request history, log files, and configuring logging settings. Accessible via the bug icon in the header or at `/admin/debug`.

- **Application Logs tab**: Real-time view of all app log entries with level filtering (DEBUG/INFO/WARN/ERROR), text search, and auto-refresh. Expandable entries show metadata details
- **Request Logs tab**: Every API request logged with method, path, status code, latency, and bytes returned. Includes aggregate statistics: total requests, average latency, p95/p99 latency percentiles, bytes transferred, and success rate. Expandable entries show request/response bodies
- **Log Files tab**: Browse historical log files on disk with a split-pane viewer. Shows file name, size, and creation date. Click any file to view its full content
- **Configuration tab**: Real-time logging settings including:
  - Log level (DEBUG/INFO/WARN/ERROR)
  - Console output toggle
  - File output toggle
  - Max log files retention
  - API request/response logging toggles
  - Database query logging toggle

### DatasourceManager (`client/src/components/datasource-manager.tsx`)

Full CRUD management UI for Prometheus-compatible datasources:

- **Card-based display**: Each datasource shown as a card with name, type badge, access mode badge, URL, default indicator, and TLS/auth status badges
- **Create/Edit dialog**: Form fields for name, type (prometheus/thanos/cortex/mimir/victoriametrics), URL, access mode (proxy/direct), scrape interval, query timeout, HTTP method (GET/POST), basic auth toggle with username field, TLS/SSL settings (client auth, skip verify, server name, CA cert, client cert, client key), and default switch
- **TLS/SSL configuration**: Full Grafana-style TLS settings including TLS Client Authentication toggle, Skip TLS Verify toggle, Server Name (SNI) field, CA Certificate textarea, and conditional Client Certificate/Key textareas (shown when client auth is enabled)
- **Delete confirmation**: AlertDialog with explicit confirmation before deleting a datasource
- **Default management**: Setting a datasource as default automatically clears the previous default (server-side)
- **Empty state**: Informative message with action button when no datasources are configured

### DatasourceRequestLog (`client/src/components/datasource-request-log.tsx`)

Simulates Prometheus API request/response logging:

- Each query execution generates a log entry with HTTP method, endpoint, status code, latency, and bytes
- Summary stat cards: Total Requests, Avg Latency, Bytes Returned, Success/Error counts
- Expandable log entries showing full request details and response preview JSON
- Clear button to reset the log

### Data Generation (`client/src/lib/metrics-data.ts`)

Generates realistic simulated Prometheus data entirely on the client:

- **Time-series data** (`generateTimeSeriesData`):
  - Counter: monotonically increasing values with noise
  - Gauge: oscillating values around a baseline
  - Histogram: latency-style distributions with spikes
  - Summary: similar to histogram with different characteristics

- **Categorical data** (`generatePieData`):
  - Counter: HTTP method/endpoint breakdown (GET, POST, DELETE, etc.)
  - Gauge: regional distribution (us-east-1, eu-west-1, etc.)
  - Histogram: latency bucket distribution (<100ms, 100-250ms, etc.)
  - Summary: percentile breakdown (p50, p75, p90, p95, p99)
  - Each category includes hierarchical drill-down data

- **Sparkline data** (`generateSparklineData`): Compact numerical arrays for thumbnail charts

- **PromQL builder** (`buildPromQLFromOperations`): Constructs valid PromQL expression strings from operations chain, labels, and metric name

---

## Features

### Full Grafana-Style PromQL Query Builder
- Visual construction of PromQL expressions with Builder/Code mode toggle
- Autocomplete metric selection from 15 common Prometheus metrics
- Label filter management with four operators: `=`, `!=`, `=~`, `!~`
- Operations chain: add, reorder, and configure 50+ PromQL functions
- Aggregation grouping with `by` / `without` clause support
- Query options: legend format, min step/resolution, range/instant query type
- Real-time PromQL expression preview
- JSON representation panel with copy-to-clipboard

### Multi-Query Chart Panels
- Add multiple query panels (A, B, C...) to a single chart
- Each panel independently configures metric, labels, operations, and color
- Enable/disable individual panels without removing them
- Collapse/expand panels to manage screen space
- Multi-series chart rendering with per-series legend

### Dashboard Visualization
- **Pre-populated dashboard**: Opens with 9 sample queries demonstrating all chart types on first load
- Seven chart types: Line, Area, Bar, Scatter, Pie, Donut, Sparkline
- **Grid/Cards view toggle**: Switch between full-size chart grid and compact dashboard cards
- **Dashboard cards**: Compact cards with mini chart thumbnails, key values, and trend indicators
- Configurable time ranges with data regeneration (5m, 15m, 30m, 1h, 3h, 6h, 12h, 24h)
- Statistical overview cards adapt per chart type
- Expand/collapse individual charts

### Drill-Down Metrics
- Click pie or donut chart segments to explore sub-metrics
- Multi-level drill-down hierarchy (e.g., endpoint -> route -> pod)
- Breadcrumb navigation showing drill path
- Back button to navigate up one level
- Contextual data per metric type (endpoints for counters, regions for gauges, latency buckets for histograms)

### Prometheus Datasource Management
- Define and manage multiple Prometheus-compatible datasource connections
- Supported backend types: Prometheus, Thanos, Cortex, Mimir, VictoriaMetrics
- Configure access mode (proxy/direct), scrape interval, query timeout, HTTP method
- Optional basic authentication support
- Mark a default datasource for new queries
- Associate saved queries with specific datasources
- Full CRUD with card-based UI and confirmation dialogs

### Datasource Request Log
- Simulates Prometheus API request/response entries on each query execution
- Summary statistics: total requests, average latency, bytes returned, success/error counts
- Expandable log entries with full details (query, status, result type, time range, response preview)
- Clear button to reset the log

### Query Management
- Save, edit, and delete queries with full PostgreSQL persistence
- Favorite/unfavorite queries for quick access
- Search and filter saved queries by name
- Sidebar with all saved queries and quick actions
- Associate queries with configured datasources

### Online Help System
- **Help Panel**: Slide-out panel (accessible via `?` icon in the header) with 8 categorized documentation sections:
  - **Getting Started** — Overview of MetricForge, app layout, step-by-step first query guide
  - **Query Builder** — Builder/Code modes, metric selection, label filters, operations, aggregation grouping, query options
  - **Multi-Query Panels** — Comparing metrics, managing panels (enable/disable, collapse, color, delete)
  - **Dashboard & Charts** — All 7 chart types, grid vs cards view, drill-down, stat cards, pre-populated samples
  - **Datasource Management** — What datasources are, how to add/edit/delete, default toggle
  - **Saving & Managing Queries** — Save, search, favorite, edit, delete workflows
  - **Request Log** — What the log shows, summary stats explained
  - **PromQL Quick Reference** — What PromQL is, common query patterns, metric types explained
  - **Tips & Shortcuts** — Practical tips for efficient usage
- **Contextual Help Tooltips**: Hover-to-reveal `?` icons placed inline next to key UI elements:
  - Label Filters, Operations, Query Options, Visualization type selector
  - Dashboard description, Datasource manager description, Builder page header
  - Each tooltip provides a concise explanation of the nearby feature

### Comprehensive Application Logging
- **Server-side logging**: All application events, API requests, and database operations are logged with structured metadata
- **New log file per run**: Each application start creates a fresh log file in `logs/` with a timestamped filename (e.g., `app-2026-02-28T08-57-44.log`)
- **Four log levels**: DEBUG, INFO, WARN, ERROR with configurable minimum level
- **Request/Response logging**: Every API call tracked with HTTP method, path, status code, latency (ms), bytes returned, and request/response bodies
- **Aggregate statistics**: Total requests, average latency, p95/p99 percentiles, bytes transferred, success/error rates, and method/status breakdowns
- **Admin Debug Console** (accessible via bug icon or `/admin/debug`):
  - **Application Logs**: Filterable, searchable, auto-refreshing log viewer
  - **Request Logs**: API request history with expandable detail panels and aggregate stats
  - **Log Files**: Browse and view historical log files on disk
  - **Configuration**: Adjust log level, output settings, and API logging toggles in real-time
- **Log retention**: Configurable maximum number of log files (auto-cleanup of oldest files)
- **Database operation logging**: Optional logging of all database CRUD operations

### Database Schema Management
- **`npm run db:push`**: Uses Drizzle Kit to sync the Drizzle schema with the PostgreSQL database, creating missing tables and columns automatically
- Safe, non-destructive schema pushes that preserve existing data

### Dark/Light Theme
- Toggle between dark and light modes
- T-Mobile magenta brand colors throughout
- Consistent theming via CSS custom properties
- Persistent theme preference

---

## PromQL Operations Reference

MetricForge supports 50+ PromQL operations organized into six categories:

### Range Functions
`rate`, `irate`, `increase`, `delta`, `changes`, `resets`, `deriv`, `avg_over_time`, `min_over_time`, `max_over_time`, `sum_over_time`, `count_over_time`, `last_over_time`, `quantile_over_time`, `stddev_over_time`, `predict_linear`

### Aggregations
`sum`, `avg`, `min`, `max`, `count`, `group`, `stddev`, `stdvar`, `topk`, `bottomk`, `count_values`, `quantile`, `histogram_quantile`

### Math
`abs`, `ceil`, `floor`, `round`, `clamp`, `ln`, `log2`, `log10`, `exp`, `sqrt`, `sgn`, `sort`, `sort_desc`, `absent`

### Time Functions
`timestamp`, `day_of_month`, `day_of_week`, `hour`, `minute`, `month`, `year`, `days_in_month`

### Label Functions
`label_replace`, `label_join`

### Binary Operations
`add`, `subtract`, `multiply`, `divide`, `modulo`, `power` (scalar operations applied to the result)

Each operation includes configurable parameters (e.g., range intervals for `rate`, quantile values for `histogram_quantile`, `by`/`without` grouping for aggregations).

---

## Theming

The application uses T-Mobile's brand identity:

- **Primary color**: T-Mobile Magenta `#E20074` (HSL: 329 100% 44%)
- **Color palette**: Magenta variations across charts and UI elements
- **Dark mode**: Deep magenta-tinted backgrounds with bright magenta accents
- **Light mode**: Clean white backgrounds with magenta primary elements
- **Chart colors**: 10-color palette derived from the magenta brand for multi-series differentiation

All theme colors are defined as CSS custom properties in `client/src/index.css` and consumed via Tailwind CSS utility classes.

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (automatically provided on Replit, or your own instance for local deployment)

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your database connection details and a session secret. On Replit, these are provided automatically via environment secrets.

### Running the Application

```bash
npm run dev
```

This starts both the Express backend and Vite frontend dev server on port 5000.

### Database Setup

The database schema is automatically pushed on startup using Drizzle ORM. Sample seed data (9 realistic PromQL queries covering all visualization types) is inserted on first run. The dashboard opens pre-populated with sample charts showcasing line, area, bar, scatter, pie, donut, and sparkline visualizations.

### Local / On-Premises Deployment

To run against a standalone PostgreSQL server outside of Replit:

1. Create a database: `CREATE DATABASE metricforge;`
2. Set `DATABASE_URL` in your `.env` file to point to your Postgres instance
3. Install dependencies: `npm install`
4. Push the schema: `npm run db:push`
5. Build and start: `npm run build && NODE_ENV=production node dist/index.js`

### Available Scripts

| Script          | Description                                    |
|-----------------|------------------------------------------------|
| `npm run dev`   | Start development server (backend + frontend)  |
| `npm run build` | Build production frontend bundle               |
| `npm run db:push` | Push schema changes to database              |
