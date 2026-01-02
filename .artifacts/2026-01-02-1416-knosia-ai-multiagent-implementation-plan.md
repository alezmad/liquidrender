# Knosia AI & Multi-Agent Implementation Plan

**Date:** 2026-01-02
**Version:** 1.0
**Target Products:** Home Dashboard, Canvas (Liquid Dashboards)

---

## Executive Summary

This plan outlines the implementation of Knosia's AI-powered analytics platform using a multi-agent architecture. The system transforms raw database connections into intelligent, personalized dashboards through coordinated AI agents that understand business context, generate vocabulary, and produce actionable insights.

**End Products:**
- **Home Dashboard** — Personalized briefing with KPIs, trends, and alerts
- **Canvas** — Interactive, AI-assisted liquid dashboards for exploration

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KNOSIA AI PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        ORCHESTRATOR                                  │   │
│  │  Coordinates agents, manages state, routes requests                  │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│     ┌───────────┬───────────┬───┴───┬───────────┬───────────┐              │
│     │           │           │       │           │           │              │
│     ▼           ▼           ▼       ▼           ▼           ▼              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │Schema│  │ Biz  │  │Vocab │  │Query │  │Insight│  │Canvas│              │
│  │Agent │  │Type  │  │Agent │  │Agent │  │Agent │  │Agent │              │
│  │      │  │Agent │  │      │  │      │  │      │  │      │              │
│  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘              │
│     │         │         │         │         │         │                    │
│     └─────────┴─────────┴────┬────┴─────────┴─────────┘                    │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     LIQUID-CONNECT ENGINE                            │   │
│  │  Schema Extraction │ Semantic Layer │ Query Engine │ SQL Emitters   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      DATA SOURCES                                    │   │
│  │  PostgreSQL │ MySQL │ Snowflake │ CSV │ Excel │ Parquet             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Agent Architecture

### Agent Definitions

| Agent | Purpose | Input | Output |
|-------|---------|-------|--------|
| **Schema Agent** | Extract and analyze database structure | Connection credentials | ExtractedSchema, SchemaInsights |
| **Business Type Agent** | Detect business domain and suggest templates | ExtractedSchema | BusinessTypeMatch, TemplateRecommendation |
| **Vocabulary Agent** | Build and refine semantic vocabulary | Schema + BusinessType | VocabularyDraft, Decisions |
| **Query Agent** | Translate natural language to SQL | NL question + Vocabulary | LiquidFlow IR, SQL, Results |
| **Insight Agent** | Generate proactive insights and alerts | Vocabulary + Data | Insights, Anomalies, Trends |
| **Canvas Agent** | Compose and optimize dashboards | User intent + Vocabulary | DashboardSpec, BlockLayout |

### Agent Communication Protocol

```typescript
interface AgentMessage {
  id: string;
  from: AgentType;
  to: AgentType | "orchestrator";
  type: "request" | "response" | "event" | "error";
  payload: unknown;
  context: {
    workspaceId: string;
    connectionId?: string;
    sessionId: string;
    traceId: string;
  };
  timestamp: string;
}

type AgentType =
  | "orchestrator"
  | "schema"
  | "business_type"
  | "vocabulary"
  | "query"
  | "insight"
  | "canvas";
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)

#### 1.1 Agent Infrastructure

**Objective:** Build the core agent framework and orchestrator.

```
packages/liquid-connect/src/agents/
├── core/
│   ├── agent.ts              # Base agent class
│   ├── orchestrator.ts       # Agent coordinator
│   ├── message-bus.ts        # Inter-agent communication
│   ├── state-manager.ts      # Shared state management
│   └── types.ts              # Agent types and protocols
├── schema/
│   └── schema-agent.ts
├── business-type/
│   └── business-type-agent.ts
├── vocabulary/
│   └── vocabulary-agent.ts
├── query/
│   └── query-agent.ts
├── insight/
│   └── insight-agent.ts
├── canvas/
│   └── canvas-agent.ts
└── index.ts
```

**Base Agent Class:**

```typescript
// agents/core/agent.ts

export abstract class Agent {
  protected id: string;
  protected type: AgentType;
  protected bus: MessageBus;
  protected state: StateManager;
  protected llm: LLMClient;

  constructor(config: AgentConfig) {
    this.id = generateId();
    this.type = config.type;
    this.bus = config.bus;
    this.state = config.state;
    this.llm = config.llm;
  }

  abstract handle(message: AgentMessage): Promise<AgentMessage>;

  protected async think(prompt: string, context: ThinkContext): Promise<string> {
    return this.llm.complete({
      system: this.getSystemPrompt(),
      user: prompt,
      context,
    });
  }

  protected abstract getSystemPrompt(): string;

  protected emit(to: AgentType, type: string, payload: unknown): void {
    this.bus.send({
      id: generateId(),
      from: this.type,
      to,
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Orchestrator:**

```typescript
// agents/core/orchestrator.ts

export class Orchestrator {
  private agents: Map<AgentType, Agent>;
  private bus: MessageBus;
  private state: StateManager;

  async processRequest(request: OrchestratorRequest): Promise<OrchestratorResponse> {
    const { type, payload, context } = request;

    switch (type) {
      case "analyze_connection":
        return this.runAnalysisPipeline(payload, context);

      case "ask_question":
        return this.runQueryPipeline(payload, context);

      case "generate_dashboard":
        return this.runCanvasPipeline(payload, context);

      case "get_insights":
        return this.runInsightPipeline(payload, context);

      default:
        throw new Error(`Unknown request type: ${type}`);
    }
  }

  private async runAnalysisPipeline(
    payload: AnalyzeConnectionPayload,
    context: RequestContext
  ): Promise<AnalysisResult> {
    // 1. Schema extraction
    const schema = await this.dispatch("schema", "extract", {
      connectionId: payload.connectionId,
    });

    // 2. Business type detection (parallel with hard rules)
    const [businessType, hardRules] = await Promise.all([
      this.dispatch("business_type", "detect", { schema }),
      this.dispatch("vocabulary", "apply_hard_rules", { schema }),
    ]);

    // 3. Template mapping (if business type detected)
    let mapping = null;
    if (businessType.primary) {
      mapping = await this.dispatch("vocabulary", "map_template", {
        detected: hardRules.detected,
        businessType: businessType.primary,
      });
    }

    // 4. Generate adaptive decisions
    const decisions = await this.dispatch("vocabulary", "generate_decisions", {
      detected: hardRules.detected,
      businessType,
      mapping,
    });

    // 5. Generate preview dashboard
    const preview = await this.dispatch("canvas", "generate_preview", {
      mapping,
      businessType,
    });

    return {
      schema,
      businessType,
      vocabulary: hardRules.detected,
      mapping,
      decisions,
      preview,
    };
  }
}
```

#### 1.2 Business Type Detection

**Objective:** Implement business type detection with confidence scoring.

**Tasks:**
- [ ] Create `BusinessTypeAgent` class
- [ ] Implement signature-based detection (patterns)
- [ ] Add LLM-enhanced detection for ambiguous cases
- [ ] Build confidence aggregation logic
- [ ] Create initial templates: SaaS, E-commerce, Marketplace

**Detection Flow:**

```typescript
// agents/business-type/business-type-agent.ts

export class BusinessTypeAgent extends Agent {
  async handle(message: AgentMessage): Promise<AgentMessage> {
    switch (message.type) {
      case "detect":
        return this.detectBusinessType(message.payload.schema);
      case "suggest_template":
        return this.suggestTemplate(message.payload);
      case "confirm_type":
        return this.confirmType(message.payload);
    }
  }

  private async detectBusinessType(schema: ExtractedSchema): Promise<DetectionResult> {
    // Step 1: Pattern-based detection
    const patternMatch = detectByPatterns(schema);

    // Step 2: If ambiguous, use LLM for semantic analysis
    if (patternMatch.ambiguous) {
      const llmAnalysis = await this.analyzeSemantically(schema, patternMatch);
      return mergeResults(patternMatch, llmAnalysis);
    }

    return patternMatch;
  }

  private async analyzeSemantically(
    schema: ExtractedSchema,
    patternMatch: PatternMatchResult
  ): Promise<LLMAnalysis> {
    const prompt = `
      Analyze this database schema and determine the most likely business type.

      Schema summary:
      ${summarizeSchema(schema)}

      Pattern detection found these candidates:
      ${formatCandidates(patternMatch.matches)}

      Consider:
      1. Table relationships and naming patterns
      2. Typical data flows for each business type
      3. Key metrics that would be tracked

      Respond with JSON:
      {
        "primaryType": "saas" | "ecommerce" | "marketplace" | "fintech" | "other",
        "confidence": 0-100,
        "reasoning": "explanation"
      }
    `;

    const response = await this.think(prompt, { schema });
    return JSON.parse(response);
  }
}
```

#### 1.3 Vocabulary Agent Enhancement

**Objective:** Enhance vocabulary building with template mapping and adaptive decisions.

**Tasks:**
- [ ] Integrate template mapper into agent
- [ ] Implement adaptive decision generation
- [ ] Add LLM-powered disambiguation
- [ ] Build confidence propagation

```typescript
// agents/vocabulary/vocabulary-agent.ts

export class VocabularyAgent extends Agent {
  async handle(message: AgentMessage): Promise<AgentMessage> {
    switch (message.type) {
      case "apply_hard_rules":
        return this.applyHardRules(message.payload.schema);

      case "map_template":
        return this.mapToTemplate(message.payload);

      case "generate_decisions":
        return this.generateDecisions(message.payload);

      case "apply_decision":
        return this.applyDecision(message.payload);

      case "refine_vocabulary":
        return this.refineWithLLM(message.payload);
    }
  }

  private async generateDecisions(payload: GenerateDecisionsPayload): Promise<Decision[]> {
    const { detected, businessType, mapping } = payload;
    const decisions: Decision[] = [];

    // 1. Business type confirmation (if detected)
    if (businessType.primary && businessType.ambiguous) {
      decisions.push({
        id: "business_type",
        type: "selection",
        priority: 1,
        question: "What type of business is this?",
        context: `We detected ${businessType.primary.type} with ${businessType.primary.confidence}% confidence`,
        options: businessType.matches.slice(0, 4).map(m => ({
          value: m.type,
          label: formatBusinessType(m.type),
          confidence: m.confidence,
          recommended: m === businessType.primary,
        })),
        allowCustom: true,
      });
    }

    // 2. Mapping conflicts (multiple candidates for same slot)
    if (mapping) {
      for (const conflict of mapping.conflicts) {
        decisions.push({
          id: `mapping_${conflict.kpiId}_${conflict.slot}`,
          type: "selection",
          priority: 2,
          question: `Which column represents "${conflict.slot}" for ${conflict.kpiId}?`,
          options: conflict.candidates.map(c => ({
            value: c,
            label: c,
          })),
          allowCustom: true,
        });
      }
    }

    // 3. Low-confidence detections
    const lowConfidence = detected.metrics.filter(m => m.certainty < 0.7);
    for (const metric of lowConfidence.slice(0, 3)) {
      decisions.push({
        id: `classify_${metric.id}`,
        type: "classification",
        priority: 3,
        question: `How should "${metric.name}" be used?`,
        context: `Column: ${metric.table}.${metric.column}`,
        options: [
          { value: "metric", label: "Aggregate (sum/avg)" },
          { value: "dimension", label: "Group by" },
          { value: "skip", label: "Ignore" },
        ],
      });
    }

    // 4. Use LLM to identify additional important decisions
    const llmDecisions = await this.identifyAdditionalDecisions(detected, mapping);
    decisions.push(...llmDecisions);

    return decisions.sort((a, b) => a.priority - b.priority).slice(0, 10);
  }
}
```

---

### Phase 2: Query Intelligence (Weeks 4-5)

#### 2.1 Query Agent

**Objective:** Natural language to SQL with context awareness.

```typescript
// agents/query/query-agent.ts

export class QueryAgent extends Agent {
  async handle(message: AgentMessage): Promise<AgentMessage> {
    switch (message.type) {
      case "parse":
        return this.parseQuery(message.payload);

      case "execute":
        return this.executeQuery(message.payload);

      case "explain":
        return this.explainQuery(message.payload);

      case "suggest":
        return this.suggestQueries(message.payload);
    }
  }

  private async parseQuery(payload: ParseQueryPayload): Promise<ParseResult> {
    const { question, vocabulary, context } = payload;

    // Step 1: Try pattern matching (fast path)
    const patternMatch = this.matchPatterns(question, vocabulary);

    if (patternMatch.confidence >= 0.9) {
      return this.buildFromPattern(patternMatch);
    }

    // Step 2: LLM-powered parsing for complex queries
    const llmParse = await this.parseWithLLM(question, vocabulary, context);

    return {
      liquidFlow: llmParse.flow,
      sql: this.emit(llmParse.flow),
      confidence: llmParse.confidence,
      interpretation: llmParse.interpretation,
      assumptions: llmParse.assumptions,
    };
  }

  private async parseWithLLM(
    question: string,
    vocabulary: ResolvedVocabulary,
    context: QueryContext
  ): Promise<LLMParseResult> {
    const prompt = `
      Convert this natural language question to a LiquidConnect query.

      Question: "${question}"

      Available vocabulary:
      Metrics: ${formatMetrics(vocabulary.metrics)}
      Dimensions: ${formatDimensions(vocabulary.dimensions)}
      Entities: ${formatEntities(vocabulary.entities)}
      Time fields: ${formatTimeFields(vocabulary.timeFields)}

      User context:
      - Role: ${context.role}
      - Recent queries: ${context.recentQueries.slice(0, 3).join(", ")}

      Output JSON:
      {
        "interpretation": "What the user is asking for",
        "metrics": ["metric_slug", ...],
        "dimensions": ["dimension_slug", ...],
        "filters": [{"field": "...", "op": "...", "value": "..."}],
        "timeRange": "last_30_days" | "this_month" | etc,
        "groupBy": ["dimension_slug", ...],
        "orderBy": {"field": "...", "direction": "asc|desc"},
        "confidence": 0-100,
        "assumptions": ["assumption1", ...]
      }
    `;

    const response = await this.think(prompt, { vocabulary, context });
    return JSON.parse(response);
  }
}
```

#### 2.2 Conversation Threading

**Objective:** Enable multi-turn conversations with context retention.

```typescript
// Thread-aware query handling
interface ThreadContext {
  threadId: string;
  messages: ThreadMessage[];
  resolvedReferences: Map<string, unknown>;  // "it", "that metric", etc.
  activeFilters: Filter[];
  lastResult: QueryResult | null;
}

// In QueryAgent
private async parseWithContext(
  question: string,
  thread: ThreadContext
): Promise<ParseResult> {
  // Resolve pronouns and references
  const resolved = await this.resolveReferences(question, thread);

  // Inherit filters from previous queries if applicable
  const inheritedFilters = this.shouldInheritFilters(question)
    ? thread.activeFilters
    : [];

  return this.parseQuery({
    question: resolved.question,
    vocabulary: this.state.get("vocabulary"),
    context: {
      ...resolved.context,
      inheritedFilters,
      previousResult: thread.lastResult,
    },
  });
}
```

---

### Phase 3: Insight Generation (Weeks 6-7)

#### 3.1 Insight Agent

**Objective:** Proactive intelligence - anomalies, trends, opportunities.

```typescript
// agents/insight/insight-agent.ts

export class InsightAgent extends Agent {
  async handle(message: AgentMessage): Promise<AgentMessage> {
    switch (message.type) {
      case "generate_briefing":
        return this.generateBriefing(message.payload);

      case "detect_anomalies":
        return this.detectAnomalies(message.payload);

      case "find_trends":
        return this.findTrends(message.payload);

      case "suggest_actions":
        return this.suggestActions(message.payload);
    }
  }

  async generateBriefing(payload: BriefingPayload): Promise<Briefing> {
    const { workspaceId, role, date } = payload;

    // 1. Fetch key metrics
    const metrics = await this.fetchKeyMetrics(workspaceId, role);

    // 2. Calculate period-over-period changes
    const changes = await this.calculateChanges(metrics);

    // 3. Detect anomalies
    const anomalies = await this.detectAnomalies({ metrics, changes });

    // 4. Generate natural language summary
    const summary = await this.generateSummary({
      metrics,
      changes,
      anomalies,
      role,
    });

    return {
      date,
      summary,
      highlights: this.extractHighlights(changes, anomalies),
      metrics: this.formatMetricsForRole(metrics, role),
      alerts: anomalies.filter(a => a.severity >= "warning"),
      suggestedQuestions: await this.suggestQuestions(metrics, changes, role),
    };
  }

  private async generateSummary(data: SummaryData): Promise<string> {
    const prompt = `
      Generate a concise morning briefing for a ${data.role}.

      Key metrics:
      ${formatMetricsForPrompt(data.metrics)}

      Changes from last period:
      ${formatChangesForPrompt(data.changes)}

      Anomalies detected:
      ${formatAnomaliesForPrompt(data.anomalies)}

      Write 2-3 sentences highlighting:
      1. The most important metric and its status
      2. Any concerning trends or anomalies
      3. One positive development (if any)

      Be specific with numbers. Be concise. Match the ${data.role} perspective.
    `;

    return this.think(prompt, { data });
  }

  private async detectAnomalies(payload: AnomalyPayload): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    for (const metric of payload.metrics) {
      // Statistical anomaly detection
      const stats = await this.getHistoricalStats(metric);
      const zscore = (metric.currentValue - stats.mean) / stats.stdDev;

      if (Math.abs(zscore) > 2) {
        anomalies.push({
          metricId: metric.id,
          type: "statistical",
          severity: Math.abs(zscore) > 3 ? "critical" : "warning",
          description: `${metric.name} is ${zscore > 0 ? "unusually high" : "unusually low"}`,
          value: metric.currentValue,
          expected: stats.mean,
          deviation: zscore,
        });
      }

      // Trend break detection
      const trendBreak = this.detectTrendBreak(metric.history);
      if (trendBreak) {
        anomalies.push({
          metricId: metric.id,
          type: "trend_break",
          severity: "info",
          description: `${metric.name} trend changed from ${trendBreak.previousTrend} to ${trendBreak.newTrend}`,
          breakPoint: trendBreak.date,
        });
      }
    }

    // Use LLM for semantic anomaly detection
    const semanticAnomalies = await this.detectSemanticAnomalies(payload.metrics);
    anomalies.push(...semanticAnomalies);

    return anomalies;
  }
}
```

#### 3.2 Alert System

**Objective:** Configurable alerts based on thresholds and patterns.

```typescript
interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: AlertCondition;
  threshold: number | "auto";  // "auto" uses ML-based thresholds
  channels: ("email" | "slack" | "in_app")[];
  frequency: "realtime" | "hourly" | "daily";
}

type AlertCondition =
  | { type: "above"; value: number }
  | { type: "below"; value: number }
  | { type: "change_percent"; direction: "up" | "down" | "any"; value: number }
  | { type: "anomaly"; sensitivity: "low" | "medium" | "high" };
```

---

### Phase 4: Home Dashboard (Weeks 8-9)

#### 4.1 Dashboard Structure

**Objective:** Personalized, role-aware home dashboard.

```typescript
// Home dashboard components
interface HomeDashboard {
  briefing: Briefing;           // AI-generated summary
  kpiCards: KPICard[];          // Key metrics with trends
  charts: DashboardChart[];     // Time series visualizations
  alerts: Alert[];              // Active alerts
  recentQuestions: Question[];  // Recent Q&A history
  suggestedQuestions: string[]; // AI-suggested next questions
  quickActions: QuickAction[];  // Common actions for role
}

interface KPICard {
  metric: MetricDefinition;
  currentValue: number;
  previousValue: number;
  change: {
    absolute: number;
    percentage: number;
    direction: "up" | "down" | "flat";
  };
  trend: TrendData;
  status: "good" | "warning" | "critical" | "neutral";
  sparkline: number[];  // Last 7/30 data points
}
```

#### 4.2 Home Dashboard API

```typescript
// packages/api/src/modules/knosia/dashboard/router.ts

export const dashboardRouter = new Hono()
  .get("/home", async (c) => {
    const { workspaceId } = c.req.query();
    const user = c.get("user");

    const orchestrator = getOrchestrator();

    // Generate personalized dashboard
    const dashboard = await orchestrator.processRequest({
      type: "generate_home_dashboard",
      payload: {
        workspaceId,
        userId: user.id,
        role: await getUserRole(user.id, workspaceId),
      },
    });

    return c.json(dashboard);
  })

  .get("/briefing", async (c) => {
    const { workspaceId, date } = c.req.query();

    const briefing = await orchestrator.processRequest({
      type: "get_insights",
      payload: {
        workspaceId,
        type: "briefing",
        date: date || new Date().toISOString(),
      },
    });

    return c.json(briefing);
  })

  .post("/ask", async (c) => {
    const { workspaceId, question, threadId } = await c.req.json();

    const result = await orchestrator.processRequest({
      type: "ask_question",
      payload: {
        workspaceId,
        question,
        threadId,
      },
    });

    return c.json(result);
  });
```

#### 4.3 Frontend Components

```
apps/web/src/modules/knosia/dashboard/
├── components/
│   ├── home-dashboard.tsx        # Main container
│   ├── briefing-card.tsx         # AI summary card
│   ├── kpi-grid.tsx              # KPI cards grid
│   ├── kpi-card.tsx              # Individual KPI card
│   ├── trend-chart.tsx           # Time series chart
│   ├── alerts-panel.tsx          # Active alerts
│   ├── ask-knosia.tsx            # Question input
│   ├── conversation-thread.tsx   # Q&A thread
│   └── suggested-questions.tsx   # AI suggestions
├── hooks/
│   ├── use-dashboard.ts          # Dashboard data hook
│   ├── use-briefing.ts           # Briefing hook
│   ├── use-ask-question.ts       # Question mutation
│   └── use-thread.ts             # Conversation state
└── types.ts
```

---

### Phase 5: Canvas (Liquid Dashboards) (Weeks 10-12)

#### 5.1 Canvas Agent

**Objective:** AI-assisted dashboard composition and optimization.

```typescript
// agents/canvas/canvas-agent.ts

export class CanvasAgent extends Agent {
  async handle(message: AgentMessage): Promise<AgentMessage> {
    switch (message.type) {
      case "generate_preview":
        return this.generatePreview(message.payload);

      case "create_from_intent":
        return this.createFromIntent(message.payload);

      case "add_block":
        return this.addBlock(message.payload);

      case "optimize_layout":
        return this.optimizeLayout(message.payload);

      case "suggest_visualizations":
        return this.suggestVisualizations(message.payload);
    }
  }

  async createFromIntent(payload: CreateFromIntentPayload): Promise<CanvasSpec> {
    const { intent, vocabulary, context } = payload;

    // Parse user intent
    const parsed = await this.parseIntent(intent);

    // Select appropriate blocks
    const blocks = await this.selectBlocks(parsed, vocabulary);

    // Arrange layout
    const layout = await this.arrangeLayout(blocks, parsed.preferences);

    // Generate queries for each block
    const queriedBlocks = await Promise.all(
      blocks.map(block => this.generateBlockQuery(block, vocabulary))
    );

    return {
      id: generateId(),
      title: parsed.suggestedTitle,
      blocks: queriedBlocks,
      layout,
      filters: parsed.globalFilters,
    };
  }

  private async parseIntent(intent: string): Promise<ParsedIntent> {
    const prompt = `
      Parse this dashboard creation intent:
      "${intent}"

      Extract:
      1. Main focus/topic
      2. Key metrics to show
      3. Preferred visualizations
      4. Time range
      5. Any filters or segments
      6. Layout preference (compact/detailed/presentation)

      Output JSON:
      {
        "topic": "...",
        "metrics": ["metric1", "metric2"],
        "visualizations": ["line_chart", "kpi_cards"],
        "timeRange": "last_30_days",
        "filters": [...],
        "layoutPreference": "compact",
        "suggestedTitle": "..."
      }
    `;

    const response = await this.think(prompt, { intent });
    return JSON.parse(response);
  }

  async suggestVisualizations(payload: SuggestVisualizationsPayload): Promise<Suggestion[]> {
    const { metric, dimensions, data } = payload;

    // Analyze data characteristics
    const characteristics = analyzeDataCharacteristics(data);

    // Match to visualization types
    const suggestions: Suggestion[] = [];

    if (characteristics.hasTimeSeries) {
      suggestions.push({
        type: "line_chart",
        confidence: 0.9,
        reason: "Time series data is best shown as a line chart",
      });
    }

    if (characteristics.isCategorical && dimensions.length === 1) {
      suggestions.push({
        type: "bar_chart",
        confidence: 0.85,
        reason: "Categorical comparison works well as a bar chart",
      });
    }

    if (characteristics.isPartOfWhole) {
      suggestions.push({
        type: "pie_chart",
        confidence: 0.7,
        reason: "Part-of-whole relationships can be shown as pie chart",
      });
    }

    // Use LLM for nuanced suggestions
    const llmSuggestions = await this.getLLMVisualizationSuggestions(payload);
    suggestions.push(...llmSuggestions);

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }
}
```

#### 5.2 Canvas Data Model

```typescript
interface Canvas {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  blocks: CanvasBlock[];
  layout: CanvasLayout;
  globalFilters: Filter[];
  refreshInterval?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

interface CanvasBlock {
  id: string;
  type: BlockType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: BlockConfig;
  query?: LiquidConnectQuery;
  cachedData?: unknown;
  lastRefresh?: string;
}

type BlockType =
  | "kpi_card"
  | "line_chart"
  | "bar_chart"
  | "area_chart"
  | "pie_chart"
  | "table"
  | "text"
  | "filter"
  | "metric_list"
  | "heatmap"
  | "scatter"
  | "funnel";

interface CanvasLayout {
  type: "grid" | "freeform";
  columns: number;
  rowHeight: number;
  gap: number;
}
```

#### 5.3 Canvas Frontend

```
apps/web/src/modules/knosia/canvas/
├── components/
│   ├── canvas-editor.tsx         # Main canvas editor
│   ├── canvas-viewer.tsx         # Read-only view
│   ├── block-renderer.tsx        # Renders any block type
│   ├── block-toolbar.tsx         # Block actions
│   ├── block-config-panel.tsx    # Block settings
│   ├── add-block-dialog.tsx      # Add new block
│   ├── ai-assistant.tsx          # AI canvas helper
│   ├── filter-bar.tsx            # Global filters
│   ├── layout-grid.tsx           # Drag-drop grid
│   └── blocks/
│       ├── kpi-block.tsx
│       ├── chart-block.tsx
│       ├── table-block.tsx
│       └── text-block.tsx
├── hooks/
│   ├── use-canvas.ts             # Canvas CRUD
│   ├── use-blocks.ts             # Block management
│   ├── use-canvas-ai.ts          # AI assistance
│   └── use-block-data.ts         # Block data fetching
└── types.ts
```

#### 5.4 AI-Assisted Canvas Creation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CREATE NEW CANVAS                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Describe your dashboard:                                             │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │ I want to track our SaaS revenue metrics with MRR trends,      │ │  │
│  │  │ customer growth, and churn analysis                             │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  [Generate Dashboard]                                                │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  PREVIEW                                                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │   │
│  │  │ $847K    │ │ 2,847    │ │ 2.3%     │ │ 108%     │               │   │
│  │  │ MRR      │ │ Customers│ │ Churn    │ │ NRR      │               │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    MRR Trend (12 months)                     │   │   │
│  │  │    [Line chart visualization]                                │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  │  ┌──────────────────────┐  ┌──────────────────────────────────┐   │   │
│  │  │  Customer Growth     │  │  Churn Analysis                   │   │   │
│  │  │  [Bar chart]         │  │  [Area chart]                     │   │   │
│  │  └──────────────────────┘  └──────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  AI Suggestions:                                                            │
│  • Add "Revenue by Plan" breakdown                                         │
│  • Include "Expansion vs New Revenue" comparison                           │
│  • Add customer cohort retention chart                                     │
│                                                                             │
│  [Edit Layout]  [Customize Blocks]  [Save Dashboard]                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 6: Integration & Polish (Weeks 13-14)

### 6.1 Cross-Feature Integration

- [ ] Home Dashboard → Canvas navigation
- [ ] Question results → Save to Canvas
- [ ] Alerts → Dashboard deep links
- [ ] Vocabulary refinement → Dashboard updates

### 6.2 Performance Optimization

- [ ] Query caching with invalidation
- [ ] Incremental dashboard updates
- [ ] Background insight generation
- [ ] Lazy block loading

### 6.3 Collaboration Features

- [ ] Share dashboards
- [ ] Comment on blocks
- [ ] Export to PDF/PNG
- [ ] Embed widgets

---

## Database Schema Additions

```typescript
// New tables for Canvas

export const knosiaCanvas = pgTable("knosia_canvas", {
  id: text().primaryKey().$defaultFn(generateId),
  workspaceId: text().references(() => knosiaWorkspace.id).notNull(),
  title: text().notNull(),
  description: text(),
  layout: jsonb().$type<CanvasLayout>().notNull(),
  globalFilters: jsonb().$type<Filter[]>().default([]),
  refreshInterval: integer(),
  isPublic: boolean().default(false),
  createdBy: text().references(() => user.id).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow().$onUpdate(() => new Date()),
});

export const knosiaCanvasBlock = pgTable("knosia_canvas_block", {
  id: text().primaryKey().$defaultFn(generateId),
  canvasId: text().references(() => knosiaCanvas.id, { onDelete: "cascade" }).notNull(),
  type: text().notNull(),
  title: text().notNull(),
  position: jsonb().$type<BlockPosition>().notNull(),
  config: jsonb().$type<BlockConfig>().notNull(),
  query: jsonb().$type<LiquidConnectQuery>(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow().$onUpdate(() => new Date()),
});

export const knosiaBriefing = pgTable("knosia_briefing", {
  id: text().primaryKey().$defaultFn(generateId),
  workspaceId: text().references(() => knosiaWorkspace.id).notNull(),
  date: timestamp().notNull(),
  content: jsonb().$type<Briefing>().notNull(),
  generatedAt: timestamp().notNull().defaultNow(),
});

export const knosiaAlert = pgTable("knosia_alert", {
  id: text().primaryKey().$defaultFn(generateId),
  workspaceId: text().references(() => knosiaWorkspace.id).notNull(),
  ruleId: text().notNull(),
  metricId: text().notNull(),
  severity: text().notNull(),  // "info" | "warning" | "critical"
  message: text().notNull(),
  data: jsonb(),
  acknowledgedAt: timestamp(),
  createdAt: timestamp().notNull().defaultNow(),
});
```

---

## Timeline Summary

| Phase | Weeks | Focus | Deliverables |
|-------|-------|-------|--------------|
| 1 | 1-3 | Foundation | Agent framework, Business type detection, Vocabulary enhancement |
| 2 | 4-5 | Query Intelligence | Query agent, NL parsing, Conversation threading |
| 3 | 6-7 | Insights | Insight agent, Anomaly detection, Alert system |
| 4 | 8-9 | Home Dashboard | Briefing, KPIs, Q&A interface |
| 5 | 10-12 | Canvas | AI-assisted dashboards, Block system, Layout engine |
| 6 | 13-14 | Polish | Integration, Performance, Collaboration |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding completion | > 80% | Users who finish onboarding |
| Time to first insight | < 60 seconds | From connection to first KPI |
| Business type accuracy | > 85% | Correct detection rate |
| Query understanding | > 90% | Questions answered correctly |
| Dashboard creation time | < 2 minutes | From intent to usable dashboard |
| Daily active usage | > 60% | Users returning daily |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM latency | Cache common patterns, use streaming, pre-compute where possible |
| LLM accuracy | Hybrid approach (patterns + LLM), confidence thresholds, human fallback |
| Cost control | Token budgets per request, tiered AI features, caching |
| Data privacy | No data sent to LLM (only metadata), on-premise LLM option |
| Complexity | Progressive rollout, feature flags, A/B testing |

---

*This plan provides a comprehensive roadmap for implementing Knosia's AI-powered analytics platform. Each phase builds on the previous, with clear deliverables and integration points.*
