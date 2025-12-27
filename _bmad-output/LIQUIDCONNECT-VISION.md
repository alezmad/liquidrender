# LiquidConnect Vision Document

> **Enterprise Data Context Layer for LLM-Powered Visualization**

| Property | Value |
|----------|-------|
| **Version** | 3.0 |
| **Status** | Draft |
| **Generated** | 2025-12-26 |
| **Project** | LiquidRender |

---

## Table of Contents

### Core Architecture
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Concept & Vision](#3-concept--vision)
4. [Architecture Overview](#4-architecture-overview)

### Context Engine
5. [Context Engine](#5-context-engine)
6. [Agentic Orchestration](#6-agentic-orchestration)
7. [Data Representation](#7-data-representation)
8. [Pipelines & Workflows](#8-pipelines--workflows)

### Integration & Contracts
9. [Integration Patterns](#9-integration-patterns)
10. [Technical Specifications](#10-technical-specifications)
11. [Runtime Contracts & Binding Specification](#11-runtime-contracts--binding-specification)
12. [Execution Context & Security Pipeline](#12-execution-context--security-pipeline)

### Enterprise Features
13. [Governance & Override Lifecycle](#13-governance--override-lifecycle)
14. [Stable Identity & Schema Migration](#14-stable-identity--schema-migration)
15. [Multi-Source Entity Resolution](#15-multi-source-entity-resolution)
16. [Profiling Cost Controls](#16-profiling-cost-controls)

### Quality & Security
17. [Evaluation Harness & Quality Loops](#17-evaluation-harness--quality-loops)
18. [Provenance Model](#18-provenance-model)
19. [Security & Compliance](#19-security--compliance)

### Agentic Execution
20. [Plan/Run Specification](#20-planrun-specification)

### Connectors & Reference
21. [Connector Specifications](#21-connector-specifications)
22. [Examples & Use Cases](#22-examples--use-cases)
23. [Glossary](#23-glossary)

### Appendices
A. [Critical Corrections & Canonical Definitions](#appendix-a-critical-corrections--canonical-definitions)
B. [Canonical JSON Schemas](#appendix-b-canonical-json-schemas)

---


# 1. Executive Summary

## What is LiquidConnect?

LiquidConnect is an **enterprise data context layer** that automatically understands, profiles, and describes enterprise data for LLM consumption. It serves as the intelligent bridge between raw enterprise data sources and AI-powered applications.

## Value Proposition

Enterprises deploy **LiquidRender** to visualize their data using natural language. But for an LLM to generate meaningful visualizations, it needs to understand the data: what tables exist, what columns mean, how values are distributed, and what relationships matter.

**LiquidConnect solves this by:**

- Automatically introspecting connected data sources
- Generating rich, structured context that LLMs can consume
- Eliminating manual schema documentation and prompt engineering
- Providing a standardized context format across all data source types

## Key Innovation: Automatic Context Generation

When an enterprise connects a data source to LiquidConnect, the system:

1. **Introspects** - Discovers schemas, tables, columns, and relationships
2. **Profiles** - Analyzes value distributions, data types, cardinality, and patterns
3. **Classifies** - Identifies semantic meaning (dates, currencies, categories, metrics)
4. **Generates** - Produces LLM-ready context documents optimized for token efficiency

No manual configuration. No prompt templates. Just connect and query.

## Target Users

LiquidConnect serves enterprises with:

- **Databases**: PostgreSQL, MySQL, SQLite, and other relational stores
- **Files**: Excel (XLSX), CSV, JSON, and structured documents
- **APIs**: REST endpoints returning structured data

These organizations want to leverage natural language interfaces without spending months documenting schemas or fine-tuning prompts. LiquidConnect transforms raw data connections into intelligent, queryable context.


---


---


# 2. The Problem: Data Context at Scale

## The Gap

LLMs can generate sophisticated UI from natural language. But they need context about the underlying data to do it correctly. Without knowing your schema, an LLM cannot build a dashboard that accurately reflects your business.

## Enterprise Complexity

Real enterprises operate at scale:

- **50-500+ tables** across multiple databases, data warehouses, and APIs
- **Complex relationships** - foreign keys, junction tables, implicit business logic
- **Domain vocabulary** - columns like `amt`, `qty_oh`, `stat_cd` mean nothing without context
- **Multiple sources** - PostgreSQL, Snowflake, REST APIs, Excel exports, all interconnected

This is not a simple schema. It is an ecosystem.

## The Token Problem

Loading full enterprise schemas into LLM context creates three failures:

1. **Expensive** - Thousands of columns across hundreds of tables consumes massive token budgets
2. **Slow** - Large context windows increase latency, degrading user experience
3. **Diluting** - The LLM loses focus when drowning in irrelevant schema details

When everything is context, nothing is context.

## The Semantic Gap

Raw database schemas are structurally correct but semantically empty:

- `cust_acct_amt` - Is this revenue? Balance? Credit limit?
- `status` - Can this be grouped? What are the valid values?
- `created_dt` vs `order_date` - Which represents the business event?

The LLM needs meaning, not just structure.

## Current Solutions Fall Short

Existing approaches add complexity without solving the core problem:

- **Vector databases** - Good for similarity search, poor for structured relationships
- **Graph databases** - Powerful but heavyweight, require specialized queries
- **RAG pipelines** - Retrieve documents, not structured context

The LLM does not need more data. It needs the right data, structured semantically, delivered precisely when needed.


---


---


# 3. Concept & Vision

## Core Philosophy

**The LLM IS the intelligence layer.**

Traditional approaches over-engineer semantic layers with complex rule engines, custom DSLs, and rigid ontologies. LiquidConnect takes a radically different approach: trust the model. Claude possesses deep reasoning capabilities about data relationships, business context, and user intent. Our job is not to replicate that intelligence in code - it is to give Claude the right context to reason effectively.

## LiquidConnect as a Bridge

LiquidConnect translates enterprise data reality into LLM-native context. It bridges the gap between scattered data sources (warehouses, APIs, files) and the structured context an LLM needs to answer business questions accurately.

Rather than forcing users to manually document their data estate, LiquidConnect discovers, profiles, and classifies automatically - then presents that knowledge in a format optimized for model consumption.

## Three Pillars

### 1. Data Manifest
**What exists.** A comprehensive inventory of sources, assets, and columns. Every table, every field, every connection string - cataloged and accessible.

### 2. Semantic Layer
**What it means.** Business definitions, calculated metrics, dimensional hierarchies, and domain vocabulary. Context that transforms raw column names into meaningful concepts.

### 3. Relationship Graph
**How it connects.** Join paths, foreign key relationships, hierarchical structures. The connective tissue that enables multi-table reasoning.

## Automatic Discovery

Zero manual annotation required. LiquidConnect profiles data sources, infers types, detects relationships, and classifies business domains automatically. Humans curate and refine; they do not start from scratch.

## Token Efficiency

Every token matters. LiquidConnect generates focused, minimal context - no bloat, no redundancy. The LLM receives exactly what it needs to reason about the query at hand.

## Agentic Orchestration

Context loading is intent-driven. When a user asks about revenue trends, LiquidConnect loads financial context. When they ask about customer churn, it loads customer context. Intelligent orchestration ensures relevance without overwhelming the model's context window.


---


---


# 4. Architecture Overview

LiquidConnect follows a pipeline architecture that transforms raw enterprise data into LLM-consumable context, enabling natural language queries to generate live UI components.

## System Architecture

```
                              LIQUIDCONNECT ARCHITECTURE
    ============================================================================

    +------------------+     +------------------------+     +------------------+
    |  SOURCE REGISTRY |     | INTROSPECTION PIPELINE |     |  CONTEXT STORE   |
    |------------------|     |------------------------|     |------------------|
    | - PostgreSQL     |     | Schema Extraction      |     | L1: JSON Files   |
    | - MySQL          |---->| Column Profiling       |---->| L2: SQLite       |
    | - XLSX/CSV       |     | Role Classification    |     | L3: PostgreSQL   |
    | - REST APIs      |     | Relationship Discovery |     | L4: Graph DB     |
    +------------------+     +------------------------+     +------------------+
                                                                     |
                                                                     v
    +------------------+     +------------------------+     +------------------+
    | LIQUIDRENDER     |     |  CONTEXT ORCHESTRATOR  |     | CONTEXT GENERATOR|
    |  ENGINE          |     |------------------------|     |------------------|
    |------------------|     | Intent Analysis        |     | context.yaml     |
    | DSL Generation   |<----| Selective Loading      |<----| LLM-Native IR    |
    | UI Rendering     |     | Relevance Scoring      |     | Semantic Hints   |
    | Live Components  |     | Context Pruning        |     +------------------+
    +------------------+     +------------------------+

    ============================================================================
```

## Data Flow

```
Enterprise Data --> Connectors --> Introspection --> Context Store --> Generator --> LLM --> DSL --> UI
```

## Component Responsibilities

### Source Registry
Manages authenticated connections to heterogeneous data sources. Each connector implements a common interface for schema access and query execution while handling source-specific authentication, connection pooling, and error recovery.

### Introspection Pipeline
Extracts structural and semantic metadata: table schemas, column types, sample values, null ratios, cardinality estimates. Classifies columns by role (identifier, metric, dimension, timestamp) and discovers relationships through foreign key analysis and naming convention inference.

### Context Store
Persists the Intermediate Representation (IR) with tiered storage based on scale:

| Level | Storage    | Sources  | Tables  | Use Case                    |
|-------|------------|----------|---------|------------------------------|
| L1    | JSON       | 1-10     | <100    | Single app, small datasets   |
| L2    | SQLite     | 10-50    | 100-500 | Department-level integration |
| L3    | PostgreSQL | 50+      | 500+    | Enterprise data catalog      |
| L4    | Graph DB   | Any      | 1000+   | Complex lineage (rare)       |

### Context Generator
Transforms IR into `context.yaml`---a compact, LLM-optimized format containing entity definitions, relationships, column semantics, and query hints. Designed for token efficiency while preserving semantic richness.

### Context Orchestrator
Implements agentic context loading. Analyzes user intent, scores relevance of available entities, and loads only pertinent context into the LLM window. Prevents context overflow while ensuring query accuracy.

### LiquidRender Engine
Receives context plus natural language query, generates DSL specifications, and renders interactive UI components. The final stage where semantic understanding becomes visual output.

## Design Principles

1. **Incremental Processing** - Introspect on connect, update on change
2. **Tiered Storage** - Right-size persistence to data scale
3. **Token Efficiency** - Minimize context size without losing semantics
4. **Lazy Loading** - Load context on demand, not upfront


---


---


# 5. Context Engine: Introspection Pipeline

The Context Engine transforms raw data sources into semantically-rich metadata through a four-stage introspection pipeline.

## 5.1 Schema Extraction

The pipeline begins by connecting to the data source and extracting structural metadata:

```typescript
interface ExtractedSchema {
  tables: TableSchema[];
  relationships: ExplicitRelationship[];
}

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  primaryKey: string[];
  foreignKeys: ForeignKeyConstraint[];
}

interface ColumnSchema {
  name: string;
  nativeType: string;        // e.g., "VARCHAR(255)", "INT8", "TIMESTAMP WITH TIME ZONE"
  nullable: boolean;
  defaultValue?: string;
}
```

Extraction adapts to source type: SQL databases expose `information_schema`, spreadsheets yield header rows with inferred types, and REST APIs provide OpenAPI schemas or require response sampling.

## 5.2 Column Profiling

Each column undergoes statistical profiling against a configurable sample (default: 100 rows):

```typescript
interface ColumnProfile {
  distinctCount: number;
  nullRate: number;           // 0.0 - 1.0
  cardinality: 'unique' | 'high' | 'medium' | 'low';

  // Numeric columns
  min?: number;
  max?: number;
  mean?: number;
  median?: number;

  // Categorical columns (cardinality < threshold)
  topValues?: { value: string; frequency: number }[];

  // String columns
  minLength?: number;
  maxLength?: number;
  patterns?: string[];        // Detected regex patterns (email, phone, UUID)
}
```

Cardinality thresholds: `unique` (100%), `high` (>50%), `medium` (10-50%), `low` (<10% of sample size).

## 5.3 Role Classification

The engine assigns semantic roles using a cascading classification strategy:

| Role | Name Patterns | Type Signals | Value Signals |
|------|---------------|--------------|---------------|
| **Identifier** | `^id$`, `_id$`, `_uuid$` | UUID, SERIAL | Unique cardinality |
| **Foreign Key** | `_id$` (non-PK) | INT, UUID | Values match another table's PK |
| **Metric** | `amount`, `total`, `sum`, `count`, `price`, `qty` | NUMERIC, DECIMAL, FLOAT | Continuous distribution |
| **Dimension** | `status`, `type`, `category`, `region` | VARCHAR, ENUM | Low cardinality (<100 distinct) |
| **Temporal** | `_at$`, `_date$`, `created`, `updated` | TIMESTAMP, DATE | - |
| **Text** | `description`, `notes`, `comment` | TEXT, VARCHAR(>500) | High cardinality, long strings |
| **Contact** | `email`, `phone`, `address` | VARCHAR | Pattern match (RFC 5322, E.164) |

Classification priority: explicit metadata > name pattern > data type > value analysis.

## 5.4 Relationship Discovery

Relationships are discovered through three mechanisms:

**Explicit Constraints**: Foreign key definitions from database schema.

**Name-Based Inference**: Column `customer_id` in `orders` implies relationship to `customers.id`. The engine matches `{table_singular}_id` patterns against existing table names.

**Value-Based Inference**: When name inference fails, the engine compares value distributions:

```typescript
// Candidate relationship: orders.account_ref → accounts.id
const overlap = intersect(orders.account_ref.values, accounts.id.values);
const confidence = overlap.size / orders.account_ref.distinctCount;
// Accept if confidence > 0.8 and accounts.id is unique
```

Discovered relationships include a `confidence` score (1.0 for explicit, 0.8-0.99 for inferred) enabling downstream consumers to filter by reliability.


---


---


# 6. Agentic Context Orchestration

## The Problem with Full Context

Imagine an enterprise with 500 database tables. Full context generation produces approximately 50,000 tokens of metadata, relationships, and semantic annotations. Sending this to an LLM with every query creates three critical problems:

1. **Cost explosion**: Every query burns through expensive tokens
2. **Latency degradation**: Large contexts slow response times
3. **Focus dilution**: LLMs perform worse when drowning in irrelevant information

Most of that context is noise. A query about "Q4 revenue by region" doesn't need customer support ticket schemas or inventory warehouse mappings.

## The Solution: Intent-Based Loading

LiquidConnect implements an intelligent orchestration layer that loads only what each query needs.

```
User Query: "Show me revenue by region for Q4"

┌─────────────────────────────────────────────────────────────────┐
│  1. PARSE INTENT                                                │
│     ├── Operation: aggregate/breakdown                          │
│     ├── Entities: revenue, region, Q4                           │
│     └── Time range: 2024-10-01 to 2024-12-31                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. SEARCH CONTEXT INDEX (~2KB, always loaded)                  │
│     ├── Domains: [sales, customers, inventory, support...]     │
│     ├── Vocabulary: revenue → sales.orders.amount               │
│     └── Time ranges: orders has date 2020-2024                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. LOAD RELEVANT SLICES                                        │
│     ├── LOAD: context/sales/orders.yaml    (has revenue)        │
│     ├── LOAD: context/sales/regions.yaml   (has region)         │
│     ├── SKIP: context/customers/*                               │
│     └── SKIP: context/inventory/*                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. COMPOSE OPTIMAL CONTEXT                                     │
│     ├── Final payload: ~500 tokens (not 50,000)                 │
│     ├── Contains: exact tables, columns, relationships          │
│     └── Result: Faster, cheaper, more accurate                  │
└─────────────────────────────────────────────────────────────────┘
```

## Three-Layer Architecture

The orchestration system operates across three layers with distinct loading strategies:

| Layer | Size | Loading | Contents |
|-------|------|---------|----------|
| **Index** | ~2KB | Always in memory | Domain map, vocabulary mappings, time ranges, entity registry |
| **Slice** | ~5-20KB each | On-demand | Per-domain context files with tables, relationships, samples |
| **Detail** | Variable | Rarely loaded | Full column statistics, extended samples, edge-case annotations |

## Caching Strategy

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    INDEX     │    │    SLICES    │    │   DETAILS    │
│  Always Hot  │    │  LRU Cache   │    │   On-Demand  │
│              │    │  TTL: 5min   │    │              │
│  Memory: 2KB │    │  Max: 50 MB  │    │  Fetch/Query │
└──────────────┘    └──────────────┘    └──────────────┘
```

The index layer remains permanently loaded, enabling instant vocabulary lookups. Domain slices use an LRU cache with a 5-minute TTL, ensuring frequently-accessed domains stay warm while stale data evicts naturally. Detail layers are fetched only when queries require column-level statistics or extended sample sets.

This architecture reduces token usage by 90-99% while improving LLM accuracy through focused, relevant context.


---


---


# 7. Data Representation

LiquidConnect uses a layered representation strategy: strongly-typed TypeScript interfaces for internal processing, YAML for storage and LLM consumption, and an optimized LLMContext for token-efficient queries.

## Intermediate Representation (IR) Types

```typescript
interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'warehouse' | 'api' | 'file';
  connection: ConnectionConfig;
  status: 'connected' | 'error' | 'pending';
}

interface DataAsset {
  id: string;
  sourceId: string;
  name: string;
  path: string;           // e.g., "schema.table" or "file.sheet"
  type: 'table' | 'view' | 'sheet' | 'endpoint';
  rowCount?: number;
}

interface DataColumn {
  id: string;
  assetId: string;
  name: string;
  dataType: string;
  role: 'metric' | 'dimension' | 'key' | 'timestamp' | 'attribute';
  stats?: { min?: any; max?: any; nullRate?: number; cardinality?: number };
  samples?: any[];
}

interface Relationship {
  fromColumnId: string;
  toColumnId: string;
  type: 'foreign_key' | 'inferred' | 'manual';
  source: 'schema' | 'naming' | 'user';
  confidence: number;
}

interface Metric {
  name: string;
  aliases: string[];
  expression: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  unit?: string;
}

interface Dimension {
  name: string;
  columnId: string;
  type: 'categorical' | 'temporal' | 'geographic';
  granularities?: string[];
  values?: string[];
}

interface VocabularyTerm {
  term: string;
  maps_to: string;
  type: 'metric' | 'dimension' | 'filter' | 'entity';
  aliases?: string[];
}

interface QueryPattern {
  name: string;
  metrics: string[];
  dimensions: string[];
  visualization: string;
}
```

## context.yaml Format

```yaml
version: "1.0"
generated: "2024-01-15T10:30:00Z"

sources:
  - id: src_postgres_main
    name: "Production Database"
    type: database
    status: connected

assets:
  - id: ast_orders
    source: src_postgres_main
    name: orders
    path: sales.orders
    type: table
    rowCount: 1250000
    columns:
      - name: order_id
        type: uuid
        role: key
      - name: total_amount
        type: decimal
        role: metric
        stats: { min: 0, max: 50000, nullRate: 0 }
        samples: [125.99, 89.50, 2340.00]
      - name: order_date
        type: timestamp
        role: timestamp
        stats: { min: "2023-01-01", max: "2024-01-15" }
      - name: region
        type: varchar
        role: dimension
        stats: { cardinality: 8 }
        samples: ["North", "South", "East", "West"]

vocabulary:
  metrics:
    - name: revenue
      aliases: [sales, total_sales, gmv]
      expression: SUM(orders.total_amount)
      unit: USD
    - name: order_count
      aliases: [orders, num_orders]
      expression: COUNT(orders.order_id)

  dimensions:
    - name: region
      column: orders.region
      type: categorical
      values: [North, South, East, West]
    - name: order_date
      column: orders.order_date
      type: temporal
      granularities: [day, week, month, quarter, year]

relationships:
  - from: orders.customer_id
    to: customers.id
    type: foreign_key
    confidence: 1.0

patterns:
  - name: regional_performance
    metrics: [revenue, order_count]
    dimensions: [region]
    visualization: bar
```

## LLMContext (Token-Optimized)

For real-time queries, we compress context.yaml into a minimal representation:

```yaml
summary: "E-commerce database with orders, customers, products"
bindings: [orders, customers, products, inventory]
metrics:
  revenue: "SUM(total_amount) | sales, gmv"
  order_count: "COUNT(order_id) | orders"
dimensions:
  region: "categorical | North, South, East, West"
  order_date: "temporal | day, week, month, quarter"
relationships:
  - orders.customer_id -> customers.id
vocabulary:
  "top sellers": products WHERE rank <= 10
  "this quarter": order_date >= Q_START
examples:
  - q: "revenue by region"
    dsl: "metric: revenue | group: region | viz: bar"
```

## Why YAML Over Custom DSL

1. **LLM-Native Understanding**: Models are trained extensively on YAML; no syntax learning required
2. **Standard Tooling**: Validation, linting, and schema support exist out of the box
3. **Generation Safety**: Structured output is easier to validate than free-form DSL
4. **Evolution Path**: Can introduce a terse DSL later if token limits become critical

YAML provides the optimal balance between human readability, LLM comprehension, and engineering practicality.


---


---


# 8. Pipelines and Workflows

LiquidConnect operates through well-defined pipelines that transform raw data sources into LLM-ready context. Understanding these workflows is essential for implementation and debugging.

---

## Main Pipeline: Connect, Introspect, Store, Generate

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CONNECT    │────▶│  INTROSPECT  │────▶│    STORE     │────▶│   GENERATE   │
│              │     │              │     │              │     │              │
│ Credentials  │     │ Schema +     │     │ Persist IR   │     │ Context      │
│ Validation   │     │ Profiling    │     │ + Index      │     │ Slices       │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
      │                    │                    │                    │
      ▼                    ▼                    ▼                    ▼
  DataSource          DataAsset[]          LiquidContext       context.yaml
   record             DataColumn[]           stored              files
                      Relationship[]
```

---

## Stage 1: CONNECT

The entry point for any data source integration.

- **Register data source**: Postgres, MySQL, XLSX, CSV, REST API
- **Encrypt credentials**: Store connection strings securely (AES-256)
- **Test connectivity**: Validate access before proceeding
- **Catalog metadata**: Record source type, version, capabilities

**Output**: `DataSource` record with connection status and metadata.

---

## Stage 2: INTROSPECT

Deep analysis of the connected source to understand its structure and semantics.

- **Extract schema**: Tables, columns, data types, constraints
- **Profile columns**: Compute statistics (cardinality, nulls, min/max, samples)
- **Classify roles**: Assign semantic roles (metric, dimension, temporal, identifier)
- **Discover relationships**: Foreign keys and inferred joins via naming patterns

**Output**: `DataAsset[]`, `DataColumn[]`, `Relationship[]` with full semantic annotations.

---

## Stage 3: STORE

Persist the Intermediate Representation for efficient retrieval.

- **Save IR**: Write to JSON files, SQLite, or Postgres depending on scale
- **Build relationship index**: Enable fast traversal of entity connections
- **Compute schema hash**: Detect changes on subsequent syncs
- **Version snapshots**: Maintain history for rollback and comparison

**Output**: Stored `LiquidContext` with indexed relationships.

---

## Stage 4: GENERATE

Transform stored IR into LLM-consumable context artifacts.

- **Build context index**: Create the always-loaded navigation layer
- **Generate domain slices**: Produce on-demand context files per domain
- **Create vocabulary**: Extract metrics, dimensions, and business terms
- **Identify query patterns**: Catalog common access paths

**Output**: `context.yaml` files ready for orchestrated loading.

---

## Sync Workflow

Keeps context current as source data evolves.

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Trigger    │───▶│ Detect Delta │───▶│ Re-introspect│───▶│ Update Store │
│ (manual/    │    │ (hash diff)  │    │ (changed    │    │ + Regenerate │
│  scheduled) │    │              │    │  assets)    │    │              │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
```

- **Triggers**: Manual request, cron schedule, or webhook on schema change
- **Incremental processing**: Only re-introspect assets with changed hashes
- **Preserve annotations**: Retain user-defined semantic overrides
- **Output**: Updated `context.yaml` files with minimal recomputation

---

## Query Workflow

The runtime path from user question to rendered UI.

```
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│   User    │───▶│  Parse    │───▶│   Load    │───▶│   LLM     │───▶│  Render   │
│  Intent   │    │  Intent   │    │  Context  │    │  Generate │    │    UI     │
└───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘
                      │                │                │                │
                      ▼                ▼                ▼                ▼
                 Keywords +       Relevant         LiquidCode        LiquidRender
                 domain hints     slices           DSL output        components
```

1. **Parse intent**: Extract keywords, entities, and domain signals
2. **Load context**: Fetch index + relevant domain slices (token-optimized)
3. **Compose prompt**: Merge context with user query
4. **LLM generates**: Output LiquidCode DSL for the request
5. **Render UI**: LiquidRender transforms DSL into interactive components

This workflow ensures minimal context loading while maximizing LLM accuracy through semantically rich, focused context delivery.


---


---


# 9. Integration Patterns

## The Full Flow

LiquidConnect and LiquidRender form a complete pipeline from natural language to rendered UI:

```
User -> "Show revenue by region" -> LiquidConnect (context) -> Claude (reasoning) -> LiquidCode DSL -> LiquidRender (UI)
```

The user speaks intent. LiquidConnect provides semantic context. Claude reasons over both to generate LiquidCode DSL. LiquidRender materializes the interface with live data.

## Integration Points

### Prompt Generator Integration

The PromptGenerator consumes LiquidConnect's context.yaml to build Claude's system prompt:

- **Context injection**: Assets, relationships, semantic hints from context.yaml
- **DSL specification**: Grammar rules and component catalog
- **Few-shot examples**: Matched to user's data domain

Claude receives everything needed to generate correct, contextual LiquidCode.

### Binding Resolver Integration

When DSL references bindings like `:revenue` or `:regionData`:

1. **BindingResolver** parses the binding reference
2. **ConnectorRegistry** routes to the appropriate connector
3. **Connector** executes the query against the enterprise source
4. **Data** flows to the component for rendering

This abstraction means Claude generates semantic references, not SQL. The runtime resolves them.

### Connector Ecosystem

The connector architecture supports diverse enterprise sources:

| Connector | Status | Capabilities |
|-----------|--------|--------------|
| BaseConnector | Interface | getSchema(), query(), subscribe() |
| RestConnector | Existing | API integration |
| PostgresConnector | Planned | Direct database access |
| MySQLConnector | Planned | Direct database access |
| FileConnector | Planned | XLSX, CSV, JSON ingestion |

Each connector implements schema introspection, query execution, and optional real-time subscriptions.

### CatalogRegistry Integration

LiquidConnect generates catalog entries that feed the CatalogRegistry:

- Unified view across all connected sources
- Component discovery of available bindings
- Design-time autocomplete for binding references

## MCP Integration

LiquidConnect can optionally expose tools via Model Context Protocol:

- `discover()` - List available sources and assets
- `describe(asset)` - Get column details and statistics
- `relate(sourceA, sourceB)` - Find join paths between assets
- `sample(asset, limit)` - Preview data for validation
- `bind(name, source, query)` - Create dynamic binding at runtime

MCP enables Claude to actively explore enterprise data during generation.

## Enterprise Deployment

Production deployments require:

- **Self-service configuration**: Business users connect sources without IT
- **Multi-tenant isolation**: Secure separation between organizational units
- **Credential encryption**: Vault-backed secret management
- **Access control**: Fine-grained permissions per source and asset
- **Audit logging**: Complete trail of data access and generation

LiquidConnect bridges the gap between enterprise data governance and AI-powered interface generation.


---


---


# 10. Technical Specifications

## Core TypeScript Interfaces

The LiquidConnect type system provides complete type safety from data source through semantic layer to LLM context generation.

### Source Types

```typescript
// Supported data source types
type SourceType = 'postgres' | 'mysql' | 'sqlite' | 'xlsx' | 'csv' | 'rest' | 'graphql';

// Connection lifecycle states
type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'syncing';

interface DataSource {
  id: string;
  name: string;
  type: SourceType;
  connection: string;           // Encrypted connection string or config
  status: ConnectionStatus;
  lastSync?: Date;
  syncInterval?: number;        // Milliseconds between syncs
  metadata?: Record<string, unknown>;
}
```

### Asset Types

```typescript
// Physical asset types across different sources
type AssetType = 'table' | 'view' | 'sheet' | 'endpoint' | 'collection';

interface DataAsset {
  id: string;
  sourceId: string;
  name: string;
  path: string;                 // Fully qualified path (schema.table, sheet name, etc.)
  type: AssetType;
  rowCount?: number;
  schemaHash?: string;          // Hash for change detection
  description?: string;         // User or inferred description
  tags?: string[];
  lastAnalyzed?: Date;
}
```

### Column Classification

```typescript
// Semantic role classification for columns
type ColumnRole =
  | 'identifier'    // Primary keys, unique IDs
  | 'foreign_key'   // References to other tables
  | 'metric'        // Numeric values for aggregation
  | 'dimension'     // Categorical grouping values
  | 'temporal'      // Dates and timestamps
  | 'text'          // Free-form text content
  | 'contact'       // Emails, phones, addresses
  | 'boolean'       // True/false flags
  | 'json'          // Structured JSON data
  | 'unknown';      // Unclassified

// Normalized data types across all sources
type NormalizedDataType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json';

interface DataColumn {
  id: string;
  assetId: string;
  name: string;
  sourceType: string;           // Original type from source (e.g., 'VARCHAR(255)')
  dataType: NormalizedDataType;
  role: ColumnRole;
  roleConfidence: number;       // 0.0 to 1.0 confidence in role assignment
  nullable: boolean;
  isPrimaryKey: boolean;
  references?: {                // Foreign key reference if detected
    assetId: string;
    columnId: string;
  };
  stats?: ColumnStats;
  samples: unknown[];           // Representative sample values
  description?: string;
}

interface ColumnStats {
  distinctCount: number;
  nullRate: number;             // 0.0 to 1.0
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  topValues?: Array<{
    value: unknown;
    count: number;
    percentage: number;
  }>;
  histogram?: Array<{
    bucket: string;
    count: number;
  }>;
}
```

### Relationships

```typescript
// Cardinality types for relationships
type RelationshipType = 'one-to-one' | 'one-to-many' | 'many-to-many';

// How the relationship was discovered
type RelationshipSource =
  | 'foreign_key'       // Explicit database constraint
  | 'inferred_name'     // Column naming patterns (e.g., user_id → users.id)
  | 'inferred_value'    // Value overlap analysis
  | 'manual';           // User-defined relationship

interface Relationship {
  id: string;
  fromColumnId: string;
  toColumnId: string;
  type: RelationshipType;
  source: RelationshipSource;
  confidence: number;           // 0.0 to 1.0
  isActive: boolean;            // Can be disabled without deletion
  joinPath?: string;            // Suggested join expression
}
```

### Semantic Layer

```typescript
// Aggregation functions for metrics
type AggregationType = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'distinct_count' | 'custom';

interface Metric {
  id: string;
  name: string;
  displayName: string;
  description: string;
  columnId: string;
  aggregation: AggregationType;
  format?: string;              // Display format (e.g., 'currency', 'percentage')
  filters?: Filter[];           // Default filters applied to this metric
  expression?: string;          // Custom SQL/expression for derived metrics
}

interface Dimension {
  id: string;
  name: string;
  displayName: string;
  description: string;
  columnId: string;
  hierarchy?: string[];         // Drill-down path (e.g., ['year', 'quarter', 'month'])
  defaultSort?: 'asc' | 'desc';
  groupings?: Array<{           // Value bucketing rules
    name: string;
    expression: string;
  }>;
}

interface VocabularyTerm {
  id: string;
  term: string;                 // Natural language term
  synonyms: string[];           // Alternative phrasings
  definition: string;           // Business definition
  mappings: Array<{             // What this term resolves to
    type: 'metric' | 'dimension' | 'filter' | 'asset';
    targetId: string;
  }>;
  examples?: string[];          // Example questions using this term
}

interface QueryPattern {
  id: string;
  pattern: string;              // Template pattern with placeholders
  description: string;
  requiredDimensions?: string[];
  requiredMetrics?: string[];
  sqlTemplate?: string;         // Corresponding SQL template
  examples: Array<{
    input: string;
    output: string;
  }>;
}

interface Filter {
  columnId: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between' | 'like' | 'null';
  value: unknown;
  valueEnd?: unknown;           // For 'between' operator
}
```

### Complete Context

```typescript
// Full data context assembled from all components
interface LiquidContext {
  id: string;
  name: string;
  version: string;
  sources: DataSource[];
  assets: DataAsset[];
  columns: DataColumn[];
  relationships: Relationship[];
  metrics: Metric[];
  dimensions: Dimension[];
  vocabulary: VocabularyTerm[];
  patterns: QueryPattern[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

// Optimized context for LLM consumption
interface LLMContext {
  schema: {
    tables: Array<{
      name: string;
      description: string;
      columns: Array<{
        name: string;
        type: string;
        role: string;
        description?: string;
      }>;
      relationships: Array<{
        to: string;
        type: string;
        via: string;
      }>;
    }>;
  };
  semantics: {
    metrics: Array<{
      name: string;
      meaning: string;
      calculation: string;
    }>;
    dimensions: Array<{
      name: string;
      meaning: string;
      values?: string[];
    }>;
    vocabulary: Array<{
      term: string;
      means: string;
    }>;
  };
  capabilities: {
    supportedQueries: string[];
    limitations: string[];
    examples: Array<{
      question: string;
      approach: string;
    }>;
  };
  tokenCount: number;           // Estimated token usage
  compressionRatio: number;     // Original vs compressed size
}
```

### Utility Types

```typescript
// Analysis result wrapper
interface AnalysisResult<T> {
  data: T;
  confidence: number;
  warnings?: string[];
  suggestions?: string[];
  processingTime: number;
}

// Sync operation tracking
interface SyncOperation {
  id: string;
  sourceId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  assetsProcessed: number;
  errors?: Array<{
    asset: string;
    error: string;
  }>;
}

// Change detection
interface SchemaChange {
  type: 'added' | 'removed' | 'modified';
  assetId?: string;
  columnId?: string;
  before?: unknown;
  after?: unknown;
  detectedAt: Date;
}
```

These interfaces form the foundation of LiquidConnect's type system, ensuring type safety from data ingestion through semantic layer construction to LLM context generation.


---


---


# 11. BindingSpec v2: AST-Based Query Safety

## Overview

BindingSpec v2 eliminates the "LLM writes SQL" risk by requiring all model-generated queries to use a structured AST format. The model expresses **semantic intent**, not raw SQL. The connector compiles validated ASTs into safe, parameterized queries.

## Core Interfaces

```typescript
interface BindingSpec {
  name: string;
  kind: 'metric' | 'dataset' | 'dimension' | 'timeseries';

  // WHO created this binding - critical for security policy
  authoredBy: 'system' | 'admin';  // NEVER 'model'

  // Query definition
  query: {
    language: 'ast_v1' | 'sql' | 'graphql' | 'rest';
    plan?: QueryPlanAST;     // Required for ast_v1
    template?: string;       // Only allowed if authoredBy='admin'
  };

  // Safety constraints - always enforced
  safety: {
    allowlistAssets: string[];      // Only these tables/views allowed
    maxScanBytes?: number;          // Limit scan size (e.g., 1GB)
    maxTimeRangeMs?: number;        // Limit time range (e.g., 90 days)
    requirePartitionFilter?: boolean;
    timeout: number;                // Query timeout in ms
  };

  // Output schema
  output: {
    columns: ColumnDef[];
    format: 'scalar' | 'array' | 'timeseries';
  };

  // Caching policy
  cache?: {
    ttl: number;
    strategy: 'exact' | 'semantic';
  };
}
```

## QueryPlanAST: Safe Structured Queries

```typescript
interface QueryPlanAST {
  version: 'ast_v1';

  // Source tables (validated against allowlist)
  from: AssetRef[];

  // Explicit, validated joins
  joins?: JoinClause[];

  // Column projection
  select: SelectExpr[];

  // Filtering (no arbitrary expressions)
  where?: FilterExpr[];

  // Grouping
  groupBy?: GroupExpr[];

  // Ordering
  orderBy?: OrderExpr[];

  // Hard limits
  limit?: number;
  offset?: number;
}

interface AssetRef {
  catalog?: string;
  schema?: string;
  table: string;
  alias: string;
}

interface JoinClause {
  type: 'inner' | 'left' | 'right';
  target: AssetRef;
  on: {
    left: { table: string; column: string };
    right: { table: string; column: string };
  };
}

interface SelectExpr {
  type: 'column' | 'aggregate' | 'expression';
  source?: string;        // Table alias reference
  column?: string;        // Column name (validated against schema)
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct_count';
  alias: string;          // Output column name
}

interface FilterExpr {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' |
            'in' | 'between' | 'like' | 'is_null' | 'is_not_null';
  value: unknown;         // Parameterized - never interpolated
}

interface GroupExpr {
  source: string;
  column: string;
}

interface OrderExpr {
  column: string;
  direction: 'asc' | 'desc';
}
```

## Why This Is Safe

1. **No SQL generation by model** - Model produces semantic AST, never SQL strings
2. **Schema validation** - AST columns/tables validated against catalog before compilation
3. **Allowlist enforcement** - `safety.allowlistAssets` restricts queryable objects
4. **Parameterized compilation** - Connector compiles AST to parameterized queries (no string interpolation)
5. **Closed operator set** - Only safe operators allowed, no arbitrary expressions
6. **Resource limits** - Scan bytes, time range, and timeout enforced at execution

## Template Escape Hatch (Admin Only)

```typescript
// Only admin-authored bindings can use raw templates
if (binding.query.language === 'sql' && binding.query.template) {
  if (binding.authoredBy !== 'admin') {
    throw new SecurityError('Templates require admin authorship');
  }
  // Additional requirements:
  // - Static analysis pass
  // - Allowlist validation
  // - Explicit approval in deployment config
}
```

Templates exist for complex queries AST can't express, but require human review and explicit approval workflow. Model-generated queries **never** use templates.


---


# 12. 02 - ExecutionContext & Security Pipeline

## ExecutionContext Interface

The `ExecutionContext` carries identity, authorization, and request metadata through every pipeline stage. It is immutable once created at request entry.

```typescript
interface ExecutionContext {
  // Identity
  tenantId: string;
  userId: string;
  sessionId: string;

  // Authorization
  roles: string[];
  scopes: string[];
  attributes: Record<string, unknown>;  // ABAC attributes

  // Authentication state
  mfa: boolean;
  authMethod: 'password' | 'sso' | 'api_key' | 'oauth';
  authTime: Date;

  // Locale
  locale: string;
  timeZone: string;

  // Request metadata
  requestId: string;
  clientIp: string;
  userAgent?: string;
}
```

**Key principle:** The context is populated once at authentication and passed by reference. No stage may modify it—this prevents privilege escalation attacks where a compromised stage could elevate permissions.

---

## Policy Enforcement Pipeline

Security is not a single checkpoint—it's a series of ordered gates, each with a specific responsibility. Data flows left-to-right; failure at any gate halts the pipeline.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           POLICY ENFORCEMENT PIPELINE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Intent → Slice Selection → Policy Filter → Prompt Pack → DSL               │
│     │                                                                        │
│     ▼                                                                        │
│  Compile → Resolve Bindings → Enforce RLS → Execute → Validate Schema       │
│     │                                                                        │
│     ▼                                                                        │
│  Shape Results → Render                                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Gate Definitions

Each gate enforces a specific security boundary. Failures are intentionally distinct to aid debugging without leaking information.

| Gate | What It Checks | Failure Mode |
|------|----------------|--------------|
| **Slice Selection** | Tenant isolation, domain access rights | `403 Forbidden` |
| **Policy Filter** | Column visibility, PII masking rules | Redact or exclude fields |
| **Prompt Pack** | Token budget limits, content sanitization | Truncate or reject |
| **Compile** | AST validation, operation allowlist | `400 Bad Request` |
| **Resolve Bindings** | Binding existence, access permissions | `404 Not Found` / `403 Forbidden` |
| **Enforce RLS** | Row-level security filters | Filter silently (no error) |
| **Execute** | Query timeout, row scan limits | `504 Gateway Timeout` / `429 Too Many Requests` |
| **Validate Schema** | Output matches declared contract | `500 Internal Error` + alert |
| **Shape Results** | Mask sensitive fields in response | Redact values |

---

## RLS Push-Down (Critical)

Row-Level Security **must** be enforced at the database layer, not via post-query filtering. Post-filtering is a security anti-pattern: it fetches unauthorized rows into memory before discarding them, creating both performance and data-leak risks.

**Implementation requirements:**

1. RLS predicates are injected into the query WHERE clause before execution
2. `ExecutionContext.attributes` provides parameterized filter values
3. The database connection uses a role with RLS policies enabled

**Example query transformation:**

```sql
-- Original query from DSL
SELECT * FROM orders WHERE status = 'pending'

-- After RLS push-down using ExecutionContext
SELECT * FROM orders
WHERE status = 'pending'
  AND tenant_id = $1              -- $ctx.tenantId
  AND region = ANY($2)            -- $ctx.attributes.allowed_regions
```

The `$ctx` placeholders are bound at query execution time, never interpolated as strings. This prevents SQL injection while ensuring the database query planner can optimize filter application.

**Why this matters:** A user requesting "all pending orders" receives only *their* pending orders, with the restriction enforced by the database itself—not by application code that might have bugs or be bypassed.


---


# 13. Governance & Override Lifecycle

This section defines how human curation integrates with automated inference, ensuring all semantic decisions are traceable, reversible, and auditable.

## Override Storage Model

Every semantic modification is captured as an immutable override record:

```typescript
interface SemanticOverride {
  id: string;
  targetType: 'column' | 'relationship' | 'metric' | 'dimension' | 'vocabulary';
  targetId: string;

  // What was changed
  field: string;                   // e.g., "role", "name", "expression"
  originalValue: unknown;
  overrideValue: unknown;

  // Provenance
  createdBy: string;               // User ID or "system"
  createdAt: Date;
  reason?: string;                 // Human-readable justification

  // Versioning
  version: number;
  supersedes?: string;             // Previous override ID (forms chain)
  status: 'active' | 'superseded' | 'tombstoned';
}

interface OverrideChain {
  currentId: string;
  history: SemanticOverride[];     // Oldest to newest
  effectiveValue: unknown;         // Resolved value after merge
}
```

## Merge Rules

Values resolve in priority order (highest wins):

| Priority | Source | Example |
|----------|--------|---------|
| 1 | User override | Analyst renames "cust_id" to "Customer ID" |
| 2 | Admin override | DBA marks column as PII |
| 3 | Model suggestion (approved) | LLM-inferred join approved by admin |
| 4 | Inferred value | Statistical profiling detected currency |
| 5 | Schema default | Column type from database metadata |

```typescript
type OverrideSource = 'user' | 'admin' | 'model_approved' | 'inferred' | 'schema';

function resolveValue(targetId: string, field: string): ResolvedValue {
  const overrides = getOverrideChain(targetId, field);
  const active = overrides.filter(o => o.status === 'active');

  // Sort by priority, return highest
  return active.sort(byPriority)[0]?.overrideValue ?? getSchemaDefault(targetId, field);
}
```

## Versioning & Audit Trail

Overrides are **append-only**. Modifications create new records that supersede previous ones:

```typescript
interface AuditQuery {
  // "Who changed X? When? Why?"
  getHistory(targetId: string, field?: string): OverrideChain;

  // "What did the model look like on date Y?"
  getSnapshot(modelId: string, asOf: Date): SemanticModel;

  // "Undo the last change to X"
  rollback(overrideId: string): SemanticOverride;  // Creates superseding record
}
```

Rollback doesn't delete - it creates a new override restoring the previous value, preserving complete history.

## Schema Change Reconciliation

When the underlying database schema changes, LiquidConnect detects and responds:

| Change | Action | Review Required |
|--------|--------|-----------------|
| Column renamed | Update all references, propagate to bindings | Flag for confirmation |
| Column type changed | Invalidate dependent metrics, trigger re-profiling | Yes - may break queries |
| Column deleted | Tombstone overrides, alert dependent bindings | Yes - cascading impact |
| New column added | Auto-classify, assign default role | Queue for review |

```typescript
interface SchemaChangeEvent {
  changeType: 'rename' | 'type_change' | 'delete' | 'add';
  affectedTargets: string[];       // Override IDs impacted
  recommendedActions: Action[];
  requiresApproval: boolean;
}
```

## Approval Workflows

Certain operations require explicit human approval before becoming active:

```typescript
interface ApprovalRequest {
  id: string;
  pendingOverride: SemanticOverride;
  trigger: ApprovalTrigger;
  assignedTo: string[];            // Reviewer IDs
  status: 'pending' | 'approved' | 'rejected';
  decidedBy?: string;
  decidedAt?: Date;
}

type ApprovalTrigger =
  | { type: 'low_confidence'; confidence: number; threshold: number }
  | { type: 'cross_source_join'; sources: string[] }
  | { type: 'key_column_role_change'; column: string; oldRole: string; newRole: string }
  | { type: 'pii_classification'; column: string };
```

**Approval triggers:**
- Low-confidence inferences (< 0.7) queue for review
- Cross-source joins require explicit approval (data governance)
- Role changes on primary/foreign keys need confirmation
- PII classification changes require security review

This governance model ensures that while AI accelerates semantic discovery, humans retain full control and visibility over the resulting model.


---


# 14. Stable Identity and Schema Change Reconciliation

## Problem

If identifiers derive from names, any rename becomes a destructive delete-and-create operation. Overrides break, bindings invalidate, and lineage history fragments.

## Solution

### 1. Stable Identity Model

```typescript
interface StableIdentity {
  // Primary stable ID (immutable after creation)
  stableId: string;

  // How the ID was generated
  idSource: 'db_oid' | 'fingerprint' | 'uuid';

  // Current canonical name
  currentName: string;

  // Alias history (old names that map forward)
  aliasHistory: AliasRecord[];
}

interface AliasRecord {
  previousName: string;
  changedAt: Date;
  changeType: 'rename' | 'move' | 'merge';
  migratedBy?: string;  // User who approved
}
```

### 2. ID Generation Rules

| Source Type | ID Strategy | Example |
|-------------|-------------|---------|
| PostgreSQL | DB OID | `pg:16384:orders` |
| MySQL | DB + table_id | `mysql:db1:42` |
| XLSX | File hash + sheet index + header hash | `xlsx:a3f2...:0:b7c1...` |
| CSV | File hash + header hash | `csv:a3f2...:b7c1...` |
| REST | Endpoint + response schema hash | `rest:api/v1/orders:c4d5...` |

### 3. Column Identity

```typescript
interface ColumnIdentity extends StableIdentity {
  // Parent asset stable ID
  assetStableId: string;

  // Fingerprint components for matching
  fingerprint: {
    ordinalPosition: number;  // Position in table
    dataType: string;
    nullable: boolean;
  };
}
```

### 4. Schema Change Migration Rules

When schema changes occur, BindingSpec references resolve through stableId:

| Change Type | Action | Binding Impact |
|-------------|--------|----------------|
| Column renamed | Update `currentName`, add to `aliasHistory` | Auto-migrated, no breakage |
| Column moved | Flag for review | Marked "needs migration" |
| Column deleted | Create tombstone | Marked "broken", alert owners |
| Type changed | Validate compatibility | Invalidate dependent metrics |

### 5. Override Survival

Overrides reference `stableId`, never raw names:

```typescript
interface OverrideReference {
  targetStableId: string;  // Survives renames
  appliedAt: Date;
  overridePayload: OverrideSpec;
}
```

Schema sync checks stableId continuity on every refresh. If a stableId disappears (table dropped and recreated with new OID), the system offers a "reconnect wizard" that uses fingerprint matching to suggest probable matches based on column names, types, and positions.

This approach ensures that business logic encoded in overrides and bindings survives routine schema maintenance without manual intervention.


---


# 15. Entity Resolution: Scale and Privacy

Entity resolution at scale requires two fundamental shifts: **blocking** to avoid O(n²) comparisons, and **privacy controls** to prevent sensitive data leakage in match evidence.

## Blocking Keys (Domain Partitioning)

Instead of comparing every record pair, partition candidates into blocks that share common characteristics:

```typescript
interface BlockingConfig {
  // Partition candidates before comparison
  blockingKeys: BlockingKey[];

  // Approximate indexing for fast lookup
  indexing: {
    strategy: 'hash' | 'lsh' | 'phonetic' | 'ngram';
    params: Record<string, unknown>;
  };
}

interface BlockingKey {
  field: string;
  transform: 'exact' | 'normalized' | 'prefix' | 'domain' | 'phonetic';
  prefixLength?: number;
}
```

**Common blocking strategies:**
- **Email**: Block by domain (`@company.com`)
- **Phone**: Block by country code + area code
- **Name**: Block by soundex/metaphone prefix
- **Address**: Block by postal code prefix

## Privacy Controls

Prevent PII exposure in match records and evidence:

```typescript
interface EntityResolutionPrivacy {
  storeHashedValuesOnly: boolean;

  evidenceRedaction: {
    enabled: boolean;
    strategy: 'hash' | 'mask' | 'sample_count_only';
  };

  piiFields: string[];
  piiMatchRequiresApproval: boolean;
}
```

## Match Computation Budgets

Bound resource consumption with configurable limits:

```typescript
interface MatchBudget {
  maxCandidatePairs: number;      // e.g., 1_000_000
  maxComparisonTimeMs: number;    // e.g., 300_000
  sampleSizePerBlock: number;     // e.g., 10_000

  stopAtConfidenceThreshold?: number;
  maxMatchesPerEntity?: number;
}
```

## Privacy-Safe Evidence

Replace raw values with aggregate statistics:

```typescript
interface PrivacySafeEvidence {
  matchedFieldCount: number;
  averageScore: number;

  // Hashed samples for authorized debugging
  sampleHashes?: string[];

  overlapStats: {
    candidatesEvaluated: number;
    matchesFound: number;
    blocksProcessed: number;
  };
}
```

This approach reduces candidate pairs by 90-99% through blocking while ensuring evidence never exposes raw PII values.


---


# 16. Profiling Cost Controls

Profiling 500+ tables with full column statistics can be expensive. This section defines budgeting, sampling, and skip policies to keep profiling costs predictable.

## Sampling Strategies

```typescript
interface SamplingConfig {
  strategy: 'random' | 'stratified' | 'time_based' | 'reservoir';
  sampleSize: number;             // Max rows to sample (e.g., 10000)

  // For stratified sampling - ensures representation across categories
  stratifyBy?: string;            // Column to stratify on (e.g., "status")

  // For time-based sampling - focus on recent data
  timeColumn?: string;            // e.g., "created_at"
  timeWindow?: { start: Date; end: Date };

  // For reservoir sampling - streaming/unbounded tables
  reservoirSize?: number;         // Fixed sample size for streaming
}

type SamplingPreset = 'full' | 'light' | 'minimal';

const SAMPLING_PRESETS: Record<SamplingPreset, SamplingConfig> = {
  full: { strategy: 'random', sampleSize: 100000 },
  light: { strategy: 'random', sampleSize: 10000 },
  minimal: { strategy: 'reservoir', sampleSize: 1000, reservoirSize: 1000 }
};
```

## Budget Controls

```typescript
interface ProfilingBudget {
  // Per-sync limits
  maxQueriesPerSync: number;      // e.g., 1000
  maxBytesScanned: number;        // e.g., 10GB (10 * 1024^3)
  maxDurationMs: number;          // e.g., 300000 (5 min)

  // Per-asset limits
  maxColumnsPerAsset: number;     // e.g., 100 (skip remaining)
  maxSampleRowsPerAsset: number;  // e.g., 10000

  // Throttling
  queryDelayMs: number;           // Delay between queries (rate limiting)
  concurrentQueries: number;      // Parallel query limit (e.g., 5)
}

interface BudgetState {
  queriesExecuted: number;
  bytesScanned: number;
  elapsedMs: number;

  isExhausted(): boolean;
  canExecute(estimatedBytes: number): boolean;
}
```

## Column Skip Policies

```typescript
interface ColumnSkipPolicy {
  // Skip by data type
  skipTypes: string[];            // ['BLOB', 'BYTEA', 'BINARY', 'IMAGE']

  // Skip large text columns
  skipTextLargerThanBytes: number; // e.g., 10240 (10KB avg)

  // Skip PII-flagged columns (require explicit opt-in)
  skipPiiColumns: boolean;        // default: true
  piiOptInColumns?: string[];     // explicit allow list

  // Skip computed/virtual columns
  skipVirtualColumns: boolean;    // default: true

  // Pattern-based skip (glob patterns)
  skipPatterns: string[];         // ['*_raw', '*_blob', '*_binary', 'tmp_*']
}

const DEFAULT_SKIP_POLICY: ColumnSkipPolicy = {
  skipTypes: ['BLOB', 'BYTEA', 'BINARY', 'IMAGE', 'VARBINARY'],
  skipTextLargerThanBytes: 10240,
  skipPiiColumns: true,
  skipVirtualColumns: true,
  skipPatterns: ['*_raw', '*_blob', '*_encrypted']
};
```

## Incremental Profiling

```typescript
interface IncrementalProfilingConfig {
  // Staleness thresholds
  statsTtlMs: number;             // e.g., 86400000 (24 hours)

  // Re-profile triggers
  reprofileOnSchemaChange: boolean;
  reprofileOnVolumeChangePercent: number; // e.g., 10 (re-profile if >10% change)

  // Partition awareness
  partitionAware: boolean;        // Only scan new partitions
  partitionColumn?: string;
}

interface ColumnProfilingState {
  columnId: string;
  lastProfiledAt: Date;
  lastRowCount: number;
  lastSchemaHash: string;
  status: 'fresh' | 'stale' | 'never_profiled';

  needsReprofiling(config: IncrementalProfilingConfig, currentRowCount: number): boolean;
}
```

## Cost Estimation

```typescript
interface CostEstimate {
  estimatedQueries: number;
  estimatedBytesScanned: number;
  estimatedDurationMs: number;
  estimatedCostUsd?: number;      // For cloud DWs with $ cost

  withinBudget: boolean;
  budgetWarnings: string[];
}

interface CostEstimator {
  // Pre-estimate before execution
  estimate(assets: string[], config: ProfilingConfig): Promise<CostEstimate>;

  // Dry-run mode - estimate without executing
  dryRun(assets: string[], config: ProfilingConfig): Promise<CostEstimate>;

  // Warn before proceeding
  confirmIfOverBudget(estimate: CostEstimate): Promise<boolean>;
}

// Usage
const estimate = await estimator.dryRun(['schema.*'], config);
if (!estimate.withinBudget) {
  console.warn('Budget exceeded:', estimate.budgetWarnings);
  // Suggest: reduce sample size, skip columns, or increase budget
}
```

## Recommended Defaults

| Setting | Development | Production |
|---------|-------------|------------|
| `sampleSize` | 1,000 | 10,000 |
| `maxQueriesPerSync` | 100 | 1,000 |
| `maxBytesScanned` | 1GB | 10GB |
| `concurrentQueries` | 2 | 5 |
| `statsTtlMs` | 1 hour | 24 hours |


---


# 17. Evaluation v2: AST-Based Comparison

## Problem

String-based DSL comparison is brittle. `Br :revenue "Revenue"` vs `Br :revenue "Total Revenue"` fails despite being semantically equivalent.

## Solution: AST-Based Comparison

### 1. Test Case Structure

```typescript
interface TestCase {
  id: string;
  query: string;  // Natural language input

  // Normalized AST expectations (not raw DSL string)
  expected: {
    bindings: string[];                         // Required bindings (order-independent)
    visualizationType: 'Kp' | 'Ln' | 'Br' | 'Pi' | 'Tb' | 'Ar';
    filters?: ExpectedFilter[];
    groupBys?: string[];
    aggregations?: ExpectedAggregation[];
  };

  matchMode: 'exact' | 'subset' | 'superset';   // Tolerance for partial matches
}

interface ExpectedFilter {
  dimension: string;
  operator: string;
  value?: unknown;  // Optional - may just check dimension is filtered
}

interface ExpectedAggregation {
  metric: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max';
}
```

### 2. Comparison Logic

```typescript
function compareTestResult(
  expected: TestCase['expected'],
  actual: ParsedDSL
): ComparisonResult {
  return {
    bindingsMatch: setEquals(expected.bindings, actual.bindings),
    vizTypeMatch: expected.visualizationType === actual.vizType,
    filtersMatch: filtersSubset(expected.filters, actual.filters),
    groupBysMatch: setEquals(expected.groupBys, actual.groupBys),

    // Overall pass/fail based on matchMode
    pass: computePassFail(expected, actual)
  };
}

function setEquals(a: string[] = [], b: string[] = []): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  return setA.size === setB.size && [...setA].every(x => setB.has(x));
}

function filtersSubset(
  expected: ExpectedFilter[] = [],
  actual: Filter[] = []
): boolean {
  return expected.every(exp =>
    actual.some(act =>
      act.dimension === exp.dimension &&
      act.operator === exp.operator &&
      (exp.value === undefined || act.value === exp.value)
    )
  );
}
```

### 3. Record/Replay for Integration Tests

```typescript
interface ExecutionSnapshot {
  testCaseId: string;
  recordedAt: Date;

  // Binding execution results (deterministic)
  bindingResults: Record<string, {
    queryHash: string;      // Hash of generated SQL
    resultHash: string;     // Hash of result data
    rowCount: number;
    schemaHash: string;     // Hash of column types
    data?: unknown[];       // Optional: actual data for replay
  }>;
}
```

### 4. Golden Test Workflow

| Phase | Description |
|-------|-------------|
| **Record** | Run test against live DB, snapshot results |
| **Replay** | Compare against snapshots (no live DB needed) |
| **Refresh** | Periodic re-record when schema changes |

This approach decouples DSL syntax from semantic correctness, enabling robust evaluation even as the DSL surface syntax evolves.


---


# 18. Provenance Model

Every inferred field carries provenance metadata for debugging, auditability, and enterprise trust. This enables users to understand *why* LiquidConnect made specific decisions and provides a complete audit trail for compliance.

## Provenance Types

```typescript
type ProvenanceSource =
  | 'schema'           // From database schema/constraints
  | 'naming'           // Inferred from column/table names
  | 'sampling'         // Inferred from data samples
  | 'statistics'       // Inferred from statistical analysis
  | 'user'             // Manually specified by user
  | 'model_suggestion' // Suggested by LLM
  | 'imported';        // Imported from external catalog

interface Provenance {
  source: ProvenanceSource;
  confidence: number;          // 0.0 to 1.0
  timestamp: Date;

  // Evidence supporting this inference
  evidence: ProvenanceEvidence;

  // Audit trail
  createdBy?: string;          // User ID if manual
  modelVersion?: string;       // Model version if ML-based
}

interface ProvenanceEvidence {
  // For schema-based
  constraintName?: string;
  ddlStatement?: string;

  // For naming-based
  patternsMatched?: string[];

  // For sampling-based
  sampleSize?: number;
  queryHash?: string;

  // For statistics-based
  overlapStats?: { matchRate: number; samplePairs: number };
  distributionAnalysis?: { type: string; params: Record<string, number> };
}
```

## Where Provenance Applies

Provenance tracking covers all inferred metadata:

- **Column role classification** — Why a column is tagged as metric, dimension, or identifier
- **Relationship discovery** — Evidence for detected foreign key relationships
- **Metric/dimension definitions** — Source of aggregation rules and hierarchies
- **Vocabulary term mappings** — How business terms connect to physical columns
- **Join path recommendations** — Statistical evidence for suggested join strategies

## Provenance Display

The UI communicates provenance through visual hierarchy:

- **Badges** indicate source type (schema → user → inferred)
- **Hover tooltips** reveal detailed evidence
- **Low-confidence highlights** draw attention to uncertain inferences
- **"Why this?"** links provide natural language explanations

## Provenance-Driven Behavior

Confidence scores determine how inferences are applied:

| Confidence | Behavior |
|------------|----------|
| > 0.9      | Auto-apply, no review needed |
| 0.7 – 0.9  | Apply with "suggested" badge |
| 0.5 – 0.7  | Queue for review, don't use in production |
| < 0.5      | Log only, don't surface to users |

## Provenance Queries

Users can interrogate provenance through natural language or the API:

- "Why is `order_total` classified as a metric?"
- "What evidence supports the `orders → customers` join?"
- "Show all user-overridden column roles"
- "List low-confidence inferences from last sync"

This transparency builds trust in automated metadata and simplifies debugging when inferences miss the mark.


---


# 19. Security & Compliance (Expanded)

## LLM Data Leakage Boundaries

Control what enters LLM context with granular policies:

```typescript
interface LLMContextPolicy {
  // What can enter the LLM context?
  allowedInContext: {
    schemaMetadata: boolean;       // Table/column names
    columnStats: boolean;          // Aggregated statistics
    sampleValues: boolean;         // Actual data samples
    piiColumns: 'never' | 'redacted' | 'with_approval';
  };

  // Redaction rules
  redactionRules: RedactionRule[];

  // Per-tenant encryption
  tenantKeyId: string;
}

interface RedactionRule {
  pattern: string;                 // Regex or column name pattern
  action: 'exclude' | 'mask' | 'hash' | 'tokenize';
  maskFormat?: string;             // e.g., "***@***.***" for email
}
```

## Row-Level Security (RLS)

Column-level masking alone is insufficient. Full RLS support includes:

- **Row Filters**: Per-user/role predicates (e.g., `region = user.region`)
- **Query Integration**: Filters pushed to database layer, not applied post-fetch
- **Audit Logging**: All filtered access recorded with user context and filter applied
- **Dynamic Policies**: Runtime evaluation based on user claims/attributes

## Policy-as-Code

Declarative security policies versioned alongside code:

```yaml
# security-policy.yaml
policies:
  - name: pii-protection
    scope: columns
    match: { role: contact }
    rules:
      - deny: include_in_context
      - deny: include_samples
      - allow: include_stats(aggregated: true)

  - name: cross-source-joins
    scope: relationships
    match: { discoverySource: inferred_* }
    rules:
      - require: approval(role: admin)
      - log: always

  - name: sensitive-tables
    scope: tables
    match: { tags: [financial, medical] }
    rules:
      - require: mfa_verified
      - expire: session_end
```

## Prompt/Context Injection Prevention

All user-editable metadata treated as untrusted input:

- **Sanitization**: Strip control characters, escape delimiters before LLM insertion
- **No Code Execution**: Metadata fields (names, descriptions) never evaluated
- **Length Limits**: Prevent context flooding attacks
- **Character Escaping**: Special characters in identifiers properly escaped
- **Validation**: Schema-level constraints on metadata content

## Compliance Frameworks

Built-in support for enterprise compliance requirements:

| Framework | Coverage |
|-----------|----------|
| **SOC 2 Type II** | Audit logs, access controls, encryption at rest/transit |
| **GDPR Article 30** | Processing records, data lineage, consent tracking |
| **CCPA** | Data mapping, deletion workflows, opt-out propagation |
| **HIPAA** | BAA support, PHI isolation, minimum necessary access |

Key capabilities:
- **Data Classification**: Automatic PII/PHI detection with manual override
- **Retention Policies**: Configurable per data class with automated enforcement
- **Right to Deletion**: Cascade delete tracking across unified schema
- **Consent Propagation**: Source-level consent flags honored in queries


---


# 20. Plan/Run Specification for Agentic Execution

This specification defines how LiquidConnect orchestrates multi-step agentic workflows through the Plan/Run model, enabling "Intent is Enough" execution with full observability and human-in-the-loop approval gates.

## Plan Interface

A **Plan** represents a decomposed intent—what the agent needs to do to fulfill a user request.

```typescript
interface Plan {
  id: string;
  intent: string;              // Original user request
  createdAt: Date;

  // Execution steps
  steps: PlanStep[];

  // Dependencies between steps
  dependencies: Record<string, string[]>;  // stepId → [prerequisite stepIds]

  // Required tools/capabilities
  requiredTools: string[];

  // Human approval gates
  approvals: ApprovalGate[];

  // UI blocks to render during execution
  uiBlocks: UIBlock[];

  // Estimated cost/time
  estimates: {
    tokenBudget: number;
    timeoutMs: number;
    toolCalls: number;
  };
}

interface PlanStep {
  id: string;
  type: 'context_load' | 'binding_resolve' | 'tool_call' | 'llm_generate' | 'human_approval' | 'render';

  // Step-specific config
  config: Record<string, unknown>;

  // Expected output type
  outputType: string;

  // Retry policy
  retries: number;
  backoffMs: number;
}

interface ApprovalGate {
  beforeStep: string;
  requiredRole: string;
  reason: string;
  timeout: number;
}
```

## Run Interface

A **Run** represents execution state—tracking progress through a Plan with full audit trail.

```typescript
interface Run {
  id: string;
  planId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

  // Step states
  stepStates: Record<string, StepState>;

  // Artifacts produced
  artifacts: Artifact[];

  // Audit trail
  audit: AuditEntry[];

  // Timing
  startedAt?: Date;
  completedAt?: Date;
}

interface StepState {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  output?: unknown;
  error?: string;
}

interface Artifact {
  stepId: string;
  type: 'dsl' | 'data' | 'file' | 'notification';
  content: unknown;
}

interface AuditEntry {
  timestamp: Date;
  stepId?: string;
  action: string;
  actor: 'system' | 'user' | 'agent';
  details: Record<string, unknown>;
}
```

## UI Consumption via SSE/WebSocket

Real-time streaming enables LiquidRender to update as execution progresses:

```typescript
interface RunEvent {
  runId: string;
  timestamp: Date;
  type: 'step_started' | 'step_completed' | 'step_failed' | 'approval_required' | 'artifact_ready' | 'run_completed';
  payload: unknown;
}

// LiquidRender subscribes to run events
function subscribeToRun(runId: string): EventSource {
  return new EventSource(`/api/runs/${runId}/events`);
}

// React hook for consuming run events
function useRunEvents(runId: string) {
  const [run, setRun] = useState<Run | null>(null);

  useEffect(() => {
    const source = subscribeToRun(runId);
    source.onmessage = (event) => {
      const runEvent: RunEvent = JSON.parse(event.data);
      // Update local run state based on event type
      setRun(prev => applyRunEvent(prev, runEvent));
    };
    return () => source.close();
  }, [runId]);

  return run;
}
```

## Integration with LiquidConnect

Each LiquidConnect operation maps to a PlanStep, enabling granular error handling and observability:

| LiquidConnect Operation | PlanStep Type | Output |
|------------------------|---------------|--------|
| Load context sources | `context_load` | Merged context object |
| Resolve bindings | `binding_resolve` | Bound data values |
| Generate DSL | `llm_generate` | LiquidDSL structure |
| Execute tool calls | `tool_call` | Tool response data |
| Await approval | `human_approval` | Approval decision |
| Render output | `render` | UI artifact |

**Failure isolation**: Each step can fail independently. A failed `binding_resolve` for optional data doesn't block `llm_generate`—the agent proceeds with available context.

**Dependency graph**: The `dependencies` map enables parallel execution of independent steps while ensuring prerequisites complete first.


---


# 21. Connector Specifications

## Connector Interface

Every connector implements a unified interface for consistent behavior across data source types:

```typescript
interface Connector {
  readonly type: SourceType;
  testConnection(): Promise<boolean>;
  getSchema(): Promise<ConnectorSchema>;
  query<T>(binding: string, options?: QueryOptions): Promise<T>;
  subscribe?(binding: string, callback: DataCallback): Unsubscribe;
}
```

## Database Connectors

### PostgreSQL / MySQL / SQLite

- **Connection**: Standard connection string with SSL/TLS options
- **Schema extraction**: Query `information_schema.columns` and `information_schema.tables`
- **FK detection**: Read explicit constraints from `information_schema.key_column_usage`
- **Profiling**: Execute `SELECT` queries with `LIMIT` for sampling
- **Real-time**: PostgreSQL supports `LISTEN/NOTIFY` for change subscriptions

These connectors provide the richest metadata through database catalog introspection.

## File Connectors

### XLSX, CSV, JSON

- **Connection**: Local file path or remote URL with optional authentication
- **Schema extraction**: Parse headers from first row, infer types from value sampling
- **FK detection**: Name-based inference only (e.g., `user_id` suggests relationship to `users`)
- **Profiling**: Full file read required for complete statistics
- **Real-time**: Optional file watcher for change detection

File connectors handle both local development scenarios and S3/cloud storage integration.

## API Connectors

### REST API

- **Connection**: Base URL with auth (API key header, OAuth 2.0, Bearer token)
- **Schema extraction**: Parse OpenAPI/Swagger spec or infer from sample responses
- **Response path**: Configure JSON path to extract data arrays
- **Pagination**: Support for cursor, offset, and page-based pagination
- **Rate limiting**: Configurable request throttling and retry policies

### GraphQL

- **Connection**: Endpoint URL with authentication headers
- **Schema extraction**: Execute introspection query for full type system
- **Query generation**: Auto-generate queries from schema fragments
- **Variables**: Support for parameterized queries

## Capability Comparison

| Connector  | Schema | FK Detection | Real-time | Profiling | Auth Types |
|------------|--------|--------------|-----------|-----------|------------|
| PostgreSQL | Full   | Explicit     | LISTEN    | Sampled   | SSL, IAM   |
| MySQL      | Full   | Explicit     | Polling   | Sampled   | SSL        |
| SQLite     | Full   | Explicit     | None      | Sampled   | None       |
| XLSX/CSV   | Inferred | Name-based | File watch | Full read | Basic, URL |
| JSON       | Inferred | Name-based | File watch | Full read | Basic, URL |
| REST       | OpenAPI  | None       | Polling   | Response  | Key, OAuth |
| GraphQL    | Introspection | Types | Subscriptions | Response | Bearer |

## Custom Connectors

Extend the base connector to add new data sources:

```typescript
class CustomConnector extends BaseConnector {
  readonly type = 'custom' as SourceType;

  async testConnection(): Promise<boolean> { /* verify connectivity */ }
  async getSchema(): Promise<ConnectorSchema> { /* extract structure */ }
  async query<T>(binding: string): Promise<T> { /* fetch data */ }
}

// Register with the system
ConnectorRegistry.register('custom', CustomConnector);
```

The registry pattern enables runtime discovery and consistent lifecycle management across all connector types.


---


---


# 22. Real-World Examples and Use Cases

These examples demonstrate how LiquidConnect transforms natural language queries into rendered dashboards across diverse enterprise scenarios.

## Example 1: E-Commerce Dashboard

**Sources**: PostgreSQL (orders, customers, products), Stripe API (payments)

**Query**: "Show me revenue by product category this quarter"

**Context Loading**: The orchestrator parses "revenue" and "product category" from the query. The index maps `revenue` to `sales.orders.total_amount` and `category` to `products.category`. Two slices load: `context/sales/orders.yaml` and `context/products/products.yaml`.

**Join Path**: `orders.product_id` -> `products.id` (foreign key, confidence: 1.0)

**Generated DSL**:
```
Br :revenue_by_category "Q4 Revenue by Category"
```

**Result**: A bar chart showing revenue breakdown across Electronics, Apparel, Home & Garden, and other categories with automatic Q4 date filtering applied.

## Example 2: SaaS Metrics Dashboard

**Sources**: PostgreSQL (users, subscriptions), Mixpanel API (events)

**Query**: "Monthly recurring revenue trend with churn overlay"

**Context Loading**: The index resolves `MRR` from vocabulary (`SUM(subscriptions.amount) WHERE status = 'active'`) and `churn` (`COUNT(subscriptions) WHERE status = 'cancelled' / total`). Loads `context/billing/subscriptions.yaml` and `context/users/users.yaml`.

**Metric Definitions**:
- MRR: `SUM(amount)` from active subscriptions, grouped by month
- Churn Rate: Cancelled subscriptions / Total subscriptions per cohort

**Generated DSL**:
```
Ln :mrr_trend "MRR" Ln :churn_rate "Churn %"
```

**Result**: A dual-axis line chart with MRR on the primary axis and churn percentage on the secondary, showing the inverse relationship between growth and retention.

## Example 3: Financial Reporting

**Sources**: XLSX (budget.xlsx), PostgreSQL (actuals)

**Query**: "Budget vs actual by department"

**Context Loading**: The engine loads `context/finance/budget.yaml` (from file connector) and `context/finance/actuals.yaml` (from database). Cross-source relationship discovered via department name matching with 0.92 confidence.

**Cross-Source Join**: `budget.department_name` -> `actuals.dept` (inferred, name similarity + value overlap)

**Generated DSL**:
```
Br :budget_vs_actual "Budget vs Actual by Department"
```

**Result**: A grouped bar chart comparing planned vs. actual spend across Engineering, Marketing, Sales, and Operations, with variance indicators highlighting over/under budget departments.

## Example 4: Multi-Source Customer Intelligence

**Sources**: CRM system (customers), Support platform (tickets), Analytics (events)

**Query**: "Top customers by lifetime value with their support tickets"

**Context Loading**: The orchestrator identifies three domains needed: customers (LTV metric), support (ticket counts), and the relationship between them. Value-based inference discovers that `crm.customers.email` matches `support.tickets.requester_email` with 0.89 confidence.

**Inferred Relationships**:
- `customers.email` -> `tickets.requester_email` (value overlap: 89%)
- `customers.id` -> `events.user_id` (naming convention)

**Generated DSL**:
```
Tb :top_customers_ltv "Top Customers"
  :columns [:name, :ltv, :ticket_count, :avg_resolution_time]
```

**Result**: A table ranking customers by lifetime value with embedded support metrics, enabling account managers to identify high-value customers with unresolved issues.

---

Each example follows the same pattern: natural language in, semantic context loaded, LiquidCode generated, live dashboard rendered. The user never writes SQL, never defines joins, never configures chart options. They simply ask questions and receive answers.


---


---


# 23. Glossary of Terms

## Core Concepts

| Term | Definition |
|------|------------|
| **Context** | The structured representation of data schema, semantics, and relationships that enables LLM understanding |
| **LiquidCode** | The compact domain-specific language (DSL) for describing UI layouts and data bindings |
| **LiquidConnect** | The data context layer that bridges enterprise data sources and LLM consumption |
| **LiquidRender** | The UI rendering engine that transforms LiquidCode DSL into React components |

## Data Model

| Term | Definition |
|------|------------|
| **Binding** | A reference to data usable in DSL expressions, denoted with colon prefix (e.g., `:revenue`, `:customer_name`) |
| **Data Asset** | A discrete data entity within a source: a table, spreadsheet, or API endpoint |
| **Data Column** | A field within an asset, characterized by its data type and semantic role |
| **Data Source** | A connection to an external data system: database, file storage, or API |

## Semantic Layer

| Term | Definition |
|------|------------|
| **Dimension** | A categorical column used for grouping, filtering, or segmentation |
| **Metric** | A numeric column that supports aggregation operations (sum, average, count) |
| **Role** | The semantic classification assigned to a column (metric, dimension, temporal, identifier) |
| **Vocabulary** | The mapping layer translating natural language terms to technical column definitions |

## Architecture

| Term | Definition |
|------|------------|
| **Context Index** | Lightweight, always-loaded layer enabling fast entity lookup and navigation |
| **Context Orchestrator** | The intelligent agent that selects and composes optimal context for each query |
| **Context Slice** | On-demand loaded context fragment for a specific domain or use case |
| **IR (Intermediate Representation)** | The TypeScript type definitions that formally model data context structure |

## Operations

| Term | Definition |
|------|------------|
| **Classification** | The process of assigning semantic roles to columns based on analysis |
| **Introspection** | Automatic extraction of schema metadata from connected data sources |
| **Profiling** | Statistical analysis of column values to understand distributions and patterns |
| **Relationship Discovery** | Automated detection of connections and foreign key relationships between tables |


---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-26 | Claude | Initial vision document |

---

*This document was generated as part of the LiquidRender project.*
*For implementation details, see the source code in `packages/liquid-render/src/platform/context/`.*


---


# Appendix A. Critical Corrections & Canonical Definitions

# LiquidConnect v2 - Corrections & Canonical Definitions

> **Document Version:** 1.0
> **Created:** 2025-12-26
> **Purpose:** Establish canonical definitions and resolve inconsistencies from initial design documents.

---

## 1. Date Timeline Normalization

**Correction:** All dates in LiquidConnect documentation must use the year **2025**.

| Context | Correct Format | Example |
|---------|---------------|---------|
| Document dates | YYYY-MM-DD | 2025-12-26 |
| Timestamps | ISO 8601 | 2025-12-26T14:30:00Z |
| Version refs | Calendar versioning | v2025.12 |

**Note:** Any references to 2024 in legacy documents should be interpreted as 2025. This ensures consistent timeline alignment across all LiquidConnect specifications.

---

## 2. Column Role Enum (Canonical Definition)

The canonical TypeScript enum for column semantic classification:

```typescript
/**
 * Semantic role classification for database columns.
 * Used by the schema inference engine to understand column purpose.
 */
type ColumnRole =
  | 'identifier'    // Primary keys, UUIDs, unique identifiers
  | 'foreign_key'   // References to other tables (FK constraints)
  | 'metric'        // Numeric values suitable for aggregation (SUM, AVG, etc.)
  | 'dimension'     // Categorical values for grouping/filtering
  | 'temporal'      // Dates, timestamps, time-based data
  | 'text'          // Free-form text, descriptions, notes
  | 'contact'       // Email addresses, phone numbers, physical addresses
  | 'boolean'       // True/false flags, binary states
  | 'json'          // Nested/structured data (JSONB, JSON columns)
  | 'binary'        // Binary large objects, file references
  | 'unknown';      // Unclassified (requires manual review)
```

### YAML Alias Mapping

When processing YAML configurations, the following aliases are normalized to canonical values:

| YAML Alias | Canonical Role | Notes |
|------------|---------------|-------|
| `key` | `identifier` | Legacy shorthand |
| `pk` | `identifier` | Primary key abbreviation |
| `id` | `identifier` | Common convention |
| `fk` | `foreign_key` | Foreign key abbreviation |
| `ref` | `foreign_key` | Reference shorthand |
| `timestamp` | `temporal` | Time-specific alias |
| `date` | `temporal` | Date-specific alias |
| `datetime` | `temporal` | Combined date/time |
| `number` | `metric` | Generic numeric |
| `amount` | `metric` | Financial context |
| `count` | `metric` | Counting context |
| `category` | `dimension` | Categorical alias |
| `enum` | `dimension` | Enumerated values |
| `flag` | `boolean` | Boolean alias |
| `status` | `boolean` | Often boolean-like |
| `email` | `contact` | Email specific |
| `phone` | `contact` | Phone specific |
| `address` | `contact` | Address specific |
| `description` | `text` | Descriptive text |
| `notes` | `text` | Note fields |
| `blob` | `binary` | Binary data |
| `file` | `binary` | File references |
| `object` | `json` | Nested object |
| `array` | `json` | Nested array |

### Normalization Function

```typescript
const ROLE_ALIASES: Record<string, ColumnRole> = {
  // Identifier aliases
  key: 'identifier',
  pk: 'identifier',
  id: 'identifier',

  // Foreign key aliases
  fk: 'foreign_key',
  ref: 'foreign_key',

  // Temporal aliases
  timestamp: 'temporal',
  date: 'temporal',
  datetime: 'temporal',

  // Metric aliases
  number: 'metric',
  amount: 'metric',
  count: 'metric',

  // Dimension aliases
  category: 'dimension',
  enum: 'dimension',

  // Boolean aliases
  flag: 'boolean',
  status: 'boolean',

  // Contact aliases
  email: 'contact',
  phone: 'contact',
  address: 'contact',

  // Text aliases
  description: 'text',
  notes: 'text',

  // Binary aliases
  blob: 'binary',
  file: 'binary',

  // JSON aliases
  object: 'json',
  array: 'json',
};

function normalizeRole(role: string): ColumnRole {
  const lower = role.toLowerCase();
  return ROLE_ALIASES[lower] ?? (isValidRole(lower) ? lower as ColumnRole : 'unknown');
}

function isValidRole(role: string): role is ColumnRole {
  const validRoles: ColumnRole[] = [
    'identifier', 'foreign_key', 'metric', 'dimension',
    'temporal', 'text', 'contact', 'boolean', 'json', 'binary', 'unknown'
  ];
  return validRoles.includes(role as ColumnRole);
}
```

---

## 3. Relationship Model (Canonical Definition)

**Correction:** The relationship model requires TWO distinct properties that were previously conflated:

1. **Cardinality** - Describes the quantitative nature of the relationship (how many on each side)
2. **Discovery Source** - Documents how the relationship was identified

```typescript
/**
 * Describes a relationship between two database tables.
 */
interface Relationship {
  /** Source table name */
  fromTable: string;

  /** Source column(s) involved in the relationship */
  fromColumns: string[];

  /** Target table name */
  toTable: string;

  /** Target column(s) involved in the relationship */
  toColumns: string[];

  /**
   * Cardinality: Quantitative relationship between entities.
   * Describes how many records on each side can participate.
   */
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

  /**
   * Discovery Source: How this relationship was identified.
   * Important for confidence scoring and validation.
   */
  discoverySource:
    | 'foreign_key'     // Explicit FK constraint in database schema
    | 'inferred_name'   // Column naming convention (e.g., user_id -> users.id)
    | 'inferred_value'  // Value analysis showed referential integrity
    | 'manual';         // User-defined relationship

  /**
   * Confidence score from 0.0 to 1.0.
   * foreign_key sources typically have 1.0 confidence.
   * Inferred relationships have lower confidence based on heuristics.
   */
  confidence: number;

  /** Optional: Human-readable description of the relationship */
  description?: string;

  /** Optional: Whether this relationship has been validated by a user */
  validated?: boolean;
}
```

### Cardinality vs Discovery Source

| Property | Question Answered | Values |
|----------|------------------|--------|
| `cardinality` | "How many records relate to each other?" | `one-to-one`, `one-to-many`, `many-to-one`, `many-to-many` |
| `discoverySource` | "How did we find this relationship?" | `foreign_key`, `inferred_name`, `inferred_value`, `manual` |

### Confidence Scoring Guidelines

| Discovery Source | Typical Confidence | Rationale |
|-----------------|-------------------|-----------|
| `foreign_key` | 0.95 - 1.0 | Database enforces integrity |
| `manual` | 0.90 - 1.0 | Human validated |
| `inferred_name` | 0.60 - 0.85 | Naming conventions vary |
| `inferred_value` | 0.40 - 0.70 | Statistical correlation |

---

## 4. Philosophy Reframe

**Old (Deprecated):**
> "Trust the model"

**New (Canonical):**
> "Models reason; the system enforces contracts, retrieval, and safety boundaries."

### Expanded Philosophy

The LiquidConnect architecture follows a **bounded autonomy** principle:

1. **Models Reason** - LLMs perform semantic understanding, query planning, and natural language processing. They excel at interpretation and synthesis.

2. **System Enforces Contracts** - All model outputs pass through typed contracts (schemas, interfaces). Invalid outputs are rejected, not corrected by the model.

3. **System Manages Retrieval** - Schema discovery, relationship inference, and data access are system operations. Models request data through structured APIs, not direct database access.

4. **System Maintains Safety Boundaries** - Rate limits, permission checks, query validation, and output sanitization are system concerns. Models operate within predefined guardrails.

### Implementation Implications

| Concern | Model Responsibility | System Responsibility |
|---------|---------------------|----------------------|
| Query intent | Interpret user request | Validate query safety |
| Schema understanding | Semantic reasoning | Provide accurate schema |
| Data access | Request needed data | Enforce access controls |
| Output formatting | Structure response | Validate contract conformance |
| Error handling | Explain issues clearly | Detect and categorize errors |

---

## Summary of Corrections

| Issue | Before | After |
|-------|--------|-------|
| Timeline | Mixed 2024/2025 dates | All 2025 |
| Role enum | Inconsistent naming | 11 canonical values with alias mapping |
| Relationship model | Single `type` field | Separate `cardinality` + `discoverySource` |
| Philosophy | "Trust the model" | "Models reason; system enforces boundaries" |

---

## Appendix: Quick Reference

### Column Roles (Copy-Paste Ready)

```typescript
type ColumnRole =
  | 'identifier' | 'foreign_key' | 'metric' | 'dimension'
  | 'temporal' | 'text' | 'contact' | 'boolean'
  | 'json' | 'binary' | 'unknown';
```

### Relationship Types (Copy-Paste Ready)

```typescript
interface Relationship {
  fromTable: string;
  fromColumns: string[];
  toTable: string;
  toColumns: string[];
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  discoverySource: 'foreign_key' | 'inferred_name' | 'inferred_value' | 'manual';
  confidence: number;
}
```

### Philosophy One-Liner

> "Models reason; the system enforces contracts, retrieval, and safety boundaries."



---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-26 | Claude | Initial vision document |
| 2.0 | 2025-12-26 | Claude | Added runtime contracts, governance, entity resolution, cost controls, evaluation harness, provenance model. Expanded security. Fixed inconsistencies. |

---

*This document was generated as part of the LiquidRender project.*
*For implementation details, see the source code in `packages/liquid-render/src/platform/context/`.*


---


# Appendix A. Critical Corrections & Canonical Definitions

# LiquidConnect v2 - Corrections & Canonical Definitions

> **Document Version:** 1.0
> **Created:** 2025-12-26
> **Purpose:** Establish canonical definitions and resolve inconsistencies from initial design documents.

---

## 1. Date Timeline Normalization

**Correction:** All dates in LiquidConnect documentation must use the year **2025**.

| Context | Correct Format | Example |
|---------|---------------|---------|
| Document dates | YYYY-MM-DD | 2025-12-26 |
| Timestamps | ISO 8601 | 2025-12-26T14:30:00Z |
| Version refs | Calendar versioning | v2025.12 |

**Note:** Any references to 2024 in legacy documents should be interpreted as 2025. This ensures consistent timeline alignment across all LiquidConnect specifications.

---

## 2. Column Role Enum (Canonical Definition)

The canonical TypeScript enum for column semantic classification:

```typescript
/**
 * Semantic role classification for database columns.
 * Used by the schema inference engine to understand column purpose.
 */
type ColumnRole =
  | 'identifier'    // Primary keys, UUIDs, unique identifiers
  | 'foreign_key'   // References to other tables (FK constraints)
  | 'metric'        // Numeric values suitable for aggregation (SUM, AVG, etc.)
  | 'dimension'     // Categorical values for grouping/filtering
  | 'temporal'      // Dates, timestamps, time-based data
  | 'text'          // Free-form text, descriptions, notes
  | 'contact'       // Email addresses, phone numbers, physical addresses
  | 'boolean'       // True/false flags, binary states
  | 'json'          // Nested/structured data (JSONB, JSON columns)
  | 'binary'        // Binary large objects, file references
  | 'unknown';      // Unclassified (requires manual review)
```

### YAML Alias Mapping

When processing YAML configurations, the following aliases are normalized to canonical values:

| YAML Alias | Canonical Role | Notes |
|------------|---------------|-------|
| `key` | `identifier` | Legacy shorthand |
| `pk` | `identifier` | Primary key abbreviation |
| `id` | `identifier` | Common convention |
| `fk` | `foreign_key` | Foreign key abbreviation |
| `ref` | `foreign_key` | Reference shorthand |
| `timestamp` | `temporal` | Time-specific alias |
| `date` | `temporal` | Date-specific alias |
| `datetime` | `temporal` | Combined date/time |
| `number` | `metric` | Generic numeric |
| `amount` | `metric` | Financial context |
| `count` | `metric` | Counting context |
| `category` | `dimension` | Categorical alias |
| `enum` | `dimension` | Enumerated values |
| `flag` | `boolean` | Boolean alias |
| `status` | `boolean` | Often boolean-like |
| `email` | `contact` | Email specific |
| `phone` | `contact` | Phone specific |
| `address` | `contact` | Address specific |
| `description` | `text` | Descriptive text |
| `notes` | `text` | Note fields |
| `blob` | `binary` | Binary data |
| `file` | `binary` | File references |
| `object` | `json` | Nested object |
| `array` | `json` | Nested array |

### Normalization Function

```typescript
const ROLE_ALIASES: Record<string, ColumnRole> = {
  // Identifier aliases
  key: 'identifier',
  pk: 'identifier',
  id: 'identifier',

  // Foreign key aliases
  fk: 'foreign_key',
  ref: 'foreign_key',

  // Temporal aliases
  timestamp: 'temporal',
  date: 'temporal',
  datetime: 'temporal',

  // Metric aliases
  number: 'metric',
  amount: 'metric',
  count: 'metric',

  // Dimension aliases
  category: 'dimension',
  enum: 'dimension',

  // Boolean aliases
  flag: 'boolean',
  status: 'boolean',

  // Contact aliases
  email: 'contact',
  phone: 'contact',
  address: 'contact',

  // Text aliases
  description: 'text',
  notes: 'text',

  // Binary aliases
  blob: 'binary',
  file: 'binary',

  // JSON aliases
  object: 'json',
  array: 'json',
};

function normalizeRole(role: string): ColumnRole {
  const lower = role.toLowerCase();
  return ROLE_ALIASES[lower] ?? (isValidRole(lower) ? lower as ColumnRole : 'unknown');
}

function isValidRole(role: string): role is ColumnRole {
  const validRoles: ColumnRole[] = [
    'identifier', 'foreign_key', 'metric', 'dimension',
    'temporal', 'text', 'contact', 'boolean', 'json', 'binary', 'unknown'
  ];
  return validRoles.includes(role as ColumnRole);
}
```

---

## 3. Relationship Model (Canonical Definition)

**Correction:** The relationship model requires TWO distinct properties that were previously conflated:

1. **Cardinality** - Describes the quantitative nature of the relationship (how many on each side)
2. **Discovery Source** - Documents how the relationship was identified

```typescript
/**
 * Describes a relationship between two database tables.
 */
interface Relationship {
  /** Source table name */
  fromTable: string;

  /** Source column(s) involved in the relationship */
  fromColumns: string[];

  /** Target table name */
  toTable: string;

  /** Target column(s) involved in the relationship */
  toColumns: string[];

  /**
   * Cardinality: Quantitative relationship between entities.
   * Describes how many records on each side can participate.
   */
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

  /**
   * Discovery Source: How this relationship was identified.
   * Important for confidence scoring and validation.
   */
  discoverySource:
    | 'foreign_key'     // Explicit FK constraint in database schema
    | 'inferred_name'   // Column naming convention (e.g., user_id -> users.id)
    | 'inferred_value'  // Value analysis showed referential integrity
    | 'manual';         // User-defined relationship

  /**
   * Confidence score from 0.0 to 1.0.
   * foreign_key sources typically have 1.0 confidence.
   * Inferred relationships have lower confidence based on heuristics.
   */
  confidence: number;

  /** Optional: Human-readable description of the relationship */
  description?: string;

  /** Optional: Whether this relationship has been validated by a user */
  validated?: boolean;
}
```

### Cardinality vs Discovery Source

| Property | Question Answered | Values |
|----------|------------------|--------|
| `cardinality` | "How many records relate to each other?" | `one-to-one`, `one-to-many`, `many-to-one`, `many-to-many` |
| `discoverySource` | "How did we find this relationship?" | `foreign_key`, `inferred_name`, `inferred_value`, `manual` |

### Confidence Scoring Guidelines

| Discovery Source | Typical Confidence | Rationale |
|-----------------|-------------------|-----------|
| `foreign_key` | 0.95 - 1.0 | Database enforces integrity |
| `manual` | 0.90 - 1.0 | Human validated |
| `inferred_name` | 0.60 - 0.85 | Naming conventions vary |
| `inferred_value` | 0.40 - 0.70 | Statistical correlation |

---

## 4. Philosophy Reframe

**Old (Deprecated):**
> "Trust the model"

**New (Canonical):**
> "Models reason; the system enforces contracts, retrieval, and safety boundaries."

### Expanded Philosophy

The LiquidConnect architecture follows a **bounded autonomy** principle:

1. **Models Reason** - LLMs perform semantic understanding, query planning, and natural language processing. They excel at interpretation and synthesis.

2. **System Enforces Contracts** - All model outputs pass through typed contracts (schemas, interfaces). Invalid outputs are rejected, not corrected by the model.

3. **System Manages Retrieval** - Schema discovery, relationship inference, and data access are system operations. Models request data through structured APIs, not direct database access.

4. **System Maintains Safety Boundaries** - Rate limits, permission checks, query validation, and output sanitization are system concerns. Models operate within predefined guardrails.

### Implementation Implications

| Concern | Model Responsibility | System Responsibility |
|---------|---------------------|----------------------|
| Query intent | Interpret user request | Validate query safety |
| Schema understanding | Semantic reasoning | Provide accurate schema |
| Data access | Request needed data | Enforce access controls |
| Output formatting | Structure response | Validate contract conformance |
| Error handling | Explain issues clearly | Detect and categorize errors |

---

## Summary of Corrections

| Issue | Before | After |
|-------|--------|-------|
| Timeline | Mixed 2024/2025 dates | All 2025 |
| Role enum | Inconsistent naming | 11 canonical values with alias mapping |
| Relationship model | Single `type` field | Separate `cardinality` + `discoverySource` |
| Philosophy | "Trust the model" | "Models reason; system enforces boundaries" |

---

## Appendix: Quick Reference

### Column Roles (Copy-Paste Ready)

```typescript
type ColumnRole =
  | 'identifier' | 'foreign_key' | 'metric' | 'dimension'
  | 'temporal' | 'text' | 'contact' | 'boolean'
  | 'json' | 'binary' | 'unknown';
```

### Relationship Types (Copy-Paste Ready)

```typescript
interface Relationship {
  fromTable: string;
  fromColumns: string[];
  toTable: string;
  toColumns: string[];
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  discoverySource: 'foreign_key' | 'inferred_name' | 'inferred_value' | 'manual';
  confidence: number;
}
```

### Philosophy One-Liner

> "Models reason; the system enforces contracts, retrieval, and safety boundaries."


---


# Appendix B. Canonical JSON Schemas

# Canonical JSON Schema Definitions

> LiquidConnect v3 Core Type Schemas (JSON Schema draft-07)

---

## 1. ContextIndex

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://liquidconnect.dev/schemas/v1/context-index.json",
  "title": "ContextIndex",
  "description": "Always-loaded routing metadata for domain discovery and vocabulary resolution",
  "type": "object",
  "properties": {
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "generatedAt": { "type": "string", "format": "date-time" },
    "tenantId": { "type": "string", "minLength": 1 },
    "domains": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "description": { "type": "string" },
          "assets": { "type": "array", "items": { "type": "string" } },
          "metrics": { "type": "array", "items": { "type": "string" } },
          "dimensions": { "type": "array", "items": { "type": "string" } },
          "slicePath": { "type": "string", "format": "uri-reference" }
        },
        "required": ["description", "assets", "slicePath"]
      }
    },
    "vocabulary": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    },
    "timeRanges": {
      "type": "object",
      "properties": {
        "earliest": { "type": "string", "format": "date-time" },
        "latest": { "type": "string", "format": "date-time" },
        "commonGranularities": {
          "type": "array",
          "items": { "type": "string", "enum": ["minute", "hour", "day", "week", "month", "quarter", "year"] }
        }
      },
      "required": ["earliest", "latest", "commonGranularities"]
    },
    "tokenBudget": { "type": "integer", "minimum": 0 }
  },
  "required": ["version", "generatedAt", "tenantId", "domains", "vocabulary", "tokenBudget"]
}
```

---

## 2. ContextSlice

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://liquidconnect.dev/schemas/v1/context-slice.json",
  "title": "ContextSlice",
  "description": "On-demand domain bundle loaded when a specific domain is accessed",
  "type": "object",
  "properties": {
    "sliceId": { "type": "string", "minLength": 1 },
    "domain": { "type": "string", "minLength": 1 },
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "generatedAt": { "type": "string", "format": "date-time" },
    "assets": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "type": { "type": "string", "enum": ["table", "view", "model", "snapshot"] },
          "description": { "type": "string" }
        },
        "required": ["id", "name", "type"]
      }
    },
    "columns": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "assetId": { "type": "string" },
          "name": { "type": "string" },
          "dataType": { "type": "string" },
          "nullable": { "type": "boolean" },
          "description": { "type": "string" }
        },
        "required": ["assetId", "name", "dataType"]
      }
    },
    "relationships": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "from": { "type": "string" },
          "to": { "type": "string" },
          "type": { "type": "string", "enum": ["one-to-one", "one-to-many", "many-to-many"] },
          "joinColumns": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["from", "to", "type", "joinColumns"]
      }
    },
    "metrics": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "expression": { "type": "string" },
          "description": { "type": "string" }
        },
        "required": ["id", "name", "expression"]
      }
    },
    "dimensions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "column": { "type": "string" },
          "type": { "type": "string", "enum": ["categorical", "temporal", "geographic"] }
        },
        "required": ["id", "name", "column"]
      }
    },
    "vocabulary": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "term": { "type": "string" },
          "target": { "type": "string" },
          "context": { "type": "string" }
        },
        "required": ["term", "target"]
      }
    },
    "tokenCount": { "type": "integer", "minimum": 0 }
  },
  "required": ["sliceId", "domain", "version", "generatedAt", "assets", "columns", "tokenCount"]
}
```

---

## 3. BindingSpec

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://liquidconnect.dev/schemas/v1/binding-spec.json",
  "title": "BindingSpec",
  "description": "Data binding contract defining how data flows from sources to components",
  "type": "object",
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "kind": { "type": "string", "enum": ["query", "aggregate", "lookup", "stream"] },
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "authoredBy": { "type": "string", "enum": ["human", "ai", "system"] },
    "query": {
      "type": "object",
      "properties": {
        "language": { "type": "string", "enum": ["ast", "sql", "graphql"] },
        "plan": { "$ref": "#/definitions/QueryPlanRef" },
        "template": { "type": "string" }
      },
      "required": ["language"]
    },
    "inputs": {
      "type": "object",
      "properties": {
        "assets": { "type": "array", "items": { "type": "string" } },
        "columns": { "type": "array", "items": { "type": "string" } },
        "joins": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "left": { "type": "string" },
              "right": { "type": "string" },
              "on": { "type": "string" }
            },
            "required": ["left", "right", "on"]
          }
        }
      },
      "required": ["assets", "columns"]
    },
    "output": {
      "type": "object",
      "properties": {
        "schema": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "type": { "type": "string" }
            },
            "required": ["name", "type"]
          }
        },
        "cardinality": { "type": "string", "enum": ["scalar", "row", "list", "stream"] }
      },
      "required": ["schema", "cardinality"]
    },
    "safety": {
      "type": "object",
      "properties": {
        "allowlistAssets": { "type": "array", "items": { "type": "string" } },
        "maxScanBytes": { "type": "integer", "minimum": 0 },
        "timeout": { "type": "integer", "minimum": 0, "description": "Timeout in milliseconds" }
      },
      "required": ["allowlistAssets", "maxScanBytes", "timeout"]
    },
    "permissions": {
      "type": "object",
      "properties": {
        "requiredScopes": { "type": "array", "items": { "type": "string" } },
        "dataMasking": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "column": { "type": "string" },
              "strategy": { "type": "string", "enum": ["hash", "redact", "truncate", "tokenize"] }
            },
            "required": ["column", "strategy"]
          }
        }
      },
      "required": ["requiredScopes"]
    }
  },
  "required": ["name", "kind", "version", "authoredBy", "query", "inputs", "output", "safety", "permissions"],
  "definitions": {
    "QueryPlanRef": {
      "type": "object",
      "properties": {
        "$ref": { "type": "string", "format": "uri-reference" }
      }
    }
  }
}
```

---

## 4. ExecutionContext

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://liquidconnect.dev/schemas/v1/execution-context.json",
  "title": "ExecutionContext",
  "description": "Security and identity context for query execution",
  "type": "object",
  "properties": {
    "tenantId": { "type": "string", "minLength": 1 },
    "userId": { "type": "string", "minLength": 1 },
    "sessionId": { "type": "string", "minLength": 1 },
    "roles": { "type": "array", "items": { "type": "string" } },
    "scopes": { "type": "array", "items": { "type": "string" } },
    "attributes": {
      "type": "object",
      "additionalProperties": { "type": ["string", "number", "boolean", "array"] }
    },
    "mfa": { "type": "boolean" },
    "authMethod": { "type": "string", "enum": ["password", "sso", "oauth", "api_key", "service_account"] },
    "authTime": { "type": "string", "format": "date-time" },
    "locale": { "type": "string", "pattern": "^[a-z]{2}(-[A-Z]{2})?$" },
    "timeZone": { "type": "string" },
    "requestId": { "type": "string", "format": "uuid" },
    "clientIp": { "type": "string", "format": "ipv4" }
  },
  "required": ["tenantId", "userId", "sessionId", "roles", "scopes", "authMethod", "authTime", "requestId"]
}
```

---

## 5. QueryPlanAST

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://liquidconnect.dev/schemas/v1/query-plan-ast.json",
  "title": "QueryPlanAST",
  "description": "Safe, executable query representation in AST form",
  "type": "object",
  "properties": {
    "version": { "type": "string", "const": "ast_v1" },
    "from": {
      "type": "array",
      "items": { "$ref": "#/definitions/AssetRef" },
      "minItems": 1
    },
    "joins": {
      "type": "array",
      "items": { "$ref": "#/definitions/JoinClause" }
    },
    "select": {
      "type": "array",
      "items": { "$ref": "#/definitions/SelectExpr" },
      "minItems": 1
    },
    "where": {
      "type": "array",
      "items": { "$ref": "#/definitions/FilterExpr" }
    },
    "groupBy": {
      "type": "array",
      "items": { "type": "string" }
    },
    "orderBy": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "column": { "type": "string" },
          "direction": { "type": "string", "enum": ["asc", "desc"] }
        },
        "required": ["column", "direction"]
      }
    },
    "limit": { "type": "integer", "minimum": 1 },
    "offset": { "type": "integer", "minimum": 0 }
  },
  "required": ["version", "from", "select"],
  "definitions": {
    "AssetRef": {
      "type": "object",
      "properties": {
        "asset": { "type": "string" },
        "alias": { "type": "string" }
      },
      "required": ["asset"]
    },
    "JoinClause": {
      "type": "object",
      "properties": {
        "type": { "type": "string", "enum": ["inner", "left", "right", "full"] },
        "asset": { "$ref": "#/definitions/AssetRef" },
        "on": { "$ref": "#/definitions/FilterExpr" }
      },
      "required": ["type", "asset", "on"]
    },
    "SelectExpr": {
      "type": "object",
      "properties": {
        "column": { "type": "string" },
        "alias": { "type": "string" },
        "aggregate": { "type": "string", "enum": ["sum", "avg", "count", "min", "max", "count_distinct"] },
        "expression": { "type": "string" }
      },
      "required": []
    },
    "FilterExpr": {
      "type": "object",
      "properties": {
        "column": { "type": "string" },
        "op": { "type": "string", "enum": ["eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in", "like", "is_null", "is_not_null", "between"] },
        "value": {},
        "and": { "type": "array", "items": { "$ref": "#/definitions/FilterExpr" } },
        "or": { "type": "array", "items": { "$ref": "#/definitions/FilterExpr" } }
      }
    }
  }
}
```

---

## Schema Relationships

```
ContextIndex
    │
    └── domains[].slicePath ──► ContextSlice
                                    │
                                    └── assets, columns ──► BindingSpec.inputs
                                                                │
                                                                └── query.plan ──► QueryPlanAST
                                                                        │
                                                                        └── executed with ──► ExecutionContext
```

All schemas use JSON Schema draft-07 and are designed for validation via ajv or similar validators.


---



## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-26 | Claude | Initial vision document |
| 2.0 | 2025-12-26 | Claude | Added runtime contracts, governance, entity resolution, cost controls, evaluation harness, provenance model. Expanded security. |
| 3.0 | 2025-12-26 | Claude | Fixed BindingSpec with AST-based queries. Added ExecutionContext, Stable Identity, Plan/Run spec. Updated Entity Resolution with privacy/blocking. Updated Evaluation with AST comparison. Added canonical JSON schemas. |

---

*This document was generated as part of the LiquidRender project.*
*For implementation details, see the source code in `packages/liquid-render/src/platform/context/`.*
