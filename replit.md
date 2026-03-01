# MetricForge - Prometheus Metrics Builder

## Overview
An interactive Grafana/Prometheus-style datasource metrics builder with real-time visualization. Users can build PromQL expressions using an intuitive visual interface, save queries, and view generated metrics on a dashboard.

## Architecture
- **Frontend**: React + TypeScript + Vite, styled with Tailwind CSS + Shadcn UI
- **Backend**: Express.js with PostgreSQL (Drizzle ORM)
- **Charts**: Recharts for metric visualization
- **Routing**: Wouter for client-side routing
- **Logging**: Custom server-side logger with file + in-memory storage

## Key Features
- Pre-populated dashboard opens by default with 8 sample queries showcasing all visualization types
- Full Grafana-style query builder with Builder/Code mode toggle
- Builder mode: metric autocomplete, label filters with operators (=, !=, =~, !~), operations chain, query options
- Code mode: raw PromQL expression editor with syntax-aware editing
- Operations chain: 50+ PromQL operations across 6 categories (Range functions, Aggregations, Math, Time, Label, Binary)
- Aggregation grouping: by/without clause support with label selection
- Query options: legend format, min step/resolution, range/instant query type
- Multi-query charts: add multiple queries (A, B, C...) on the same chart panel with per-query color, enable/disable, collapse/expand
- Seven visualization types: Line, Area, Bar, Scatter, Pie, Donut, Sparkline
- Dashboard cards view with compact sparkline/pie/donut thumbnails + grid/cards toggle
- Drill-down metrics: click pie/donut segments to explore sub-metrics with breadcrumb navigation
- JSON query representation panel with copy-to-clipboard
- Datasource request log simulating Prometheus API calls with latency, bytes, status codes
- Prometheus datasource management: define, configure, and manage datasource connections with full CRUD
- Online help system: slide-out help panel with 9 categorized sections (Getting Started, Query Builder, Multi-Query, Dashboard, Datasources, Saved Queries, Request Log, PromQL Reference, Logging & Debug, Tips)
- Contextual help tooltips: hover-to-reveal help icons on Label Filters, Operations, Query Options, Visualization, Dashboard, and Datasources
- Comprehensive application logging: new log file per run, 4 log levels, request/response logging with latency/bytes/status
- Admin Debug Console: application logs viewer, request logs with stats, log file browser, logging configuration settings
- Saved queries with favorites, search/filter, datasource association
- 9 seed queries covering all chart types (line, area, bar, scatter, pie, donut, sparkline)
- Simulated time-series and categorical data generation per metric type
- Dark/Light theme support

## Environment Configuration
- Uses `dotenv` to load environment variables from a `.env` file
- `.env.example` provided as a template with required variables
- `.env` is gitignored to prevent committing secrets

## Data Model
- `datasources` table stores Prometheus datasource configurations:
  - `name`, `type` (prometheus/thanos/cortex/mimir/victoriametrics), `url`, `access` (proxy/direct)
  - `basicAuth`, `basicAuthUser`: Authentication settings
  - `isDefault`: Mark one datasource as default for new queries
  - `customHeaders` (jsonb): Custom HTTP headers
  - `scrapeInterval`, `queryTimeout`, `httpMethod`: Connection settings
  - `tlsClientAuth`, `tlsSkipVerify`: TLS toggle settings
  - `tlsCaCert`, `tlsClientCert`, `tlsClientKey`, `tlsServerName`: TLS certificate/key PEM fields
- `metricQueries` table stores queries with:
  - `labels` (jsonb): Array of `LabelMatcher` objects with `{label, op, value}` format
  - `operations` (jsonb): Array of `QueryOperation` objects with `{id, type, params}` format
  - `legendFormat`, `step`, `queryType`: Query display/execution options
  - `subQueries` (jsonb): Array of `SubQuery` objects for multi-query charts `{id, letter, enabled, metricName, metricType, labels, operations, expression, color}`
  - `datasourceId`: Optional foreign key linking query to a datasource
  - `aggregation`, `range`: Legacy fields (kept for backward compatibility)
- `SubQuery` interface defines per-query fields for multi-series chart panels
- `normalizeLabelMatchers()` helper converts old `Record<string, string>` format to new `LabelMatcher[]`
- `OPERATION_DEFINITIONS` in schema.ts defines all available PromQL operations with categories, descriptions, and parameter definitions

## Project Structure
- `shared/schema.ts` - Data models, LabelMatcher/QueryOperation/SubQuery/Datasource types, operation definitions, Prometheus constants
- `server/db.ts` - Database connection
- `server/logger.ts` - Application logging module (file + in-memory, log levels, request tracking, stats)
- `server/storage.ts` - CRUD operations via DatabaseStorage (queries + datasources) with logging
- `server/routes.ts` - REST API endpoints (/api/queries, /api/datasources, /api/logs/*)
- `server/seed.ts` - Seed data with realistic PromQL queries using operations chain format
- `client/src/pages/home.tsx` - Main page with sidebar + builder/dashboard/datasources tabs
- `client/src/pages/admin-debug.tsx` - Admin debug console (logs, requests, files, config)
- `client/src/components/help-panel.tsx` - Help panel (Sheet) and ContextualHelpTip component
- `client/src/components/query-builder.tsx` - Full Grafana-style PromQL query builder UI with datasource selector
- `client/src/components/metric-chart.tsx` - Chart visualization component (multi-series support)
- `client/src/components/datasource-manager.tsx` - Datasource CRUD management UI
- `client/src/components/saved-queries-panel.tsx` - Saved queries sidebar
- `client/src/lib/metrics-data.ts` - Time-series data generation, buildPromQLFromOperations expression builder
- `logs/` - Runtime log files directory (gitignored, auto-created per app start)

## API Endpoints
- GET /api/queries - List all saved queries
- GET /api/queries/:id - Get single query
- POST /api/queries - Create new query
- PATCH /api/queries/:id - Update query
- DELETE /api/queries/:id - Delete query
- GET /api/datasources - List all datasources
- GET /api/datasources/:id - Get single datasource
- POST /api/datasources - Create new datasource
- PATCH /api/datasources/:id - Update datasource
- DELETE /api/datasources/:id - Delete datasource
- GET /api/logs/config - Get logging configuration
- PATCH /api/logs/config - Update logging configuration
- GET /api/logs/app - Get application log entries (with level/category/search filters)
- GET /api/logs/requests - Get API request logs with stats (latency, bytes, p95/p99)
- GET /api/logs/files - List log files on disk
- GET /api/logs/files/:filename - Get log file content
- GET /api/logs/current - Get current active log filename
- POST /api/logs/clear - Clear in-memory logs

## Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run db:push` - Sync Drizzle schema to database (create/update tables and columns)
- `npm run check` - TypeScript type checking
