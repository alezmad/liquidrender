# Adaptive Onboarding: A Living Intelligence System

**Date:** 2026-01-02
**Type:** Vision Document
**Status:** Conceptual Architecture

---

## The Paradigm Shift

Traditional onboarding asks: *"How do we get users through setup?"*

We ask: *"How do we build a system that continuously understands the user better?"*

**Onboarding is not a gate to pass through. It's the first conversation in an ongoing relationship.**

The moment a user connects their database, Knosia begins learning. That learning never stops. "Onboarding" is simply the period of highest uncertainty—where the AI knows the least and needs the most input. As confidence grows, the system requires less. But the capability to refine, correct, and evolve remains forever.

---

## Core Philosophy: Compression, Not Collection

Most onboarding collects information through forms. We **compress understanding** through intelligent inference and selective confirmation.

```
TRADITIONAL ONBOARDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User fills 20 fields → System stores 20 values → Done

Problem: High effort, low signal. Users lie on forms.
         System knows facts but not intent.


ADAPTIVE ONBOARDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI infers 100 things from schema
        ↓
AI surfaces 5 things it's uncertain about
        ↓
User confirms/corrects → AI updates 20 related inferences
        ↓
AI surfaces next 3 uncertainties
        ↓
Repeat until confidence threshold reached
        ↓
User can refine anytime, forever

Benefit: Low effort, high signal. AI learns intent, not just facts.
```

---

## The Interface Model: Generative Decisions, Not Forms

The AI doesn't present a form. It presents **decisions**—structured choices that narrow understanding.

### Decision Types

```
┌─────────────────────────────────────────────────────────────────────┐
│  DECISION TYPE: CONFIRMATION                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AI is confident. Needs validation.                                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  "revenue" appears to be your primary revenue metric,        │    │
│  │  calculated as SUM(orders.total_amount)                      │    │
│  │                                                              │    │
│  │  [✓ Correct]    [✗ Not quite]    [Skip for now]             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  "Not quite" → expands to SELECTION or SPECIFICATION                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  DECISION TYPE: SELECTION                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AI found multiple candidates. User picks.                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Which represents your primary revenue metric?               │    │
│  │                                                              │    │
│  │  ○ orders.total_amount (SUM) — 1.2M records                 │    │
│  │  ○ invoices.amount (SUM) — 89K records                      │    │
│  │  ○ subscriptions.mrr (LATEST) — 3.4K records                │    │
│  │  ○ None of these / I'll define it                           │    │
│  │                                                              │    │
│  │  [Continue]                                                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  "None of these" → expands to SPECIFICATION                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  DECISION TYPE: SPECIFICATION                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AI couldn't infer. User provides.                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Describe your primary revenue metric:                       │    │
│  │                                                              │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │ Total monthly recurring revenue from active          │    │    │
│  │  │ subscriptions, excluding trials and churned          │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │                                                              │    │
│  │  AI will generate: MRR = SUM(subscriptions.amount)          │    │
│  │                    WHERE status = 'active'                   │    │
│  │                    AND trial = false                         │    │
│  │                                                              │    │
│  │  [Generate]    [Show me the SQL]                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  DECISION TYPE: DISAMBIGUATION                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AI found semantic conflict. Needs clarification.                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  "user" means different things in your data:                 │    │
│  │                                                              │    │
│  │  ┌──────────────────┐  ┌──────────────────┐                 │    │
│  │  │ users table      │  │ app_users table  │                 │    │
│  │  │ 12K records      │  │ 145K records     │                 │    │
│  │  │ Has: email,      │  │ Has: device_id,  │                 │    │
│  │  │ company_id       │  │ session_count    │                 │    │
│  │  └──────────────────┘  └──────────────────┘                 │    │
│  │                                                              │    │
│  │  ○ These are the same entity (merge)                        │    │
│  │  ○ "users" = paying customers, "app_users" = all visitors   │    │
│  │  ○ Let me explain the difference...                         │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  DECISION TYPE: PRIORITY                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AI found many valid items. User indicates importance.              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  We found 47 potential metrics. Which matter most to you?    │    │
│  │                                                              │    │
│  │  Drag to reorder, or star your top 5:                        │    │
│  │                                                              │    │
│  │  ★ Monthly Recurring Revenue                                 │    │
│  │  ★ Customer Churn Rate                                       │    │
│  │  ☆ Average Order Value                                       │    │
│  │  ☆ Customer Acquisition Cost                                 │    │
│  │  ☆ Net Promoter Score                                        │    │
│  │  ☆ ... 42 more                                               │    │
│  │                                                              │    │
│  │  [Continue with top 5]    [Review all 47]                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### The Escape Hatch Principle

Every decision includes an escape:
- **"Not quite"** — I want to modify
- **"None of these"** — Show me alternatives
- **"Let me explain"** — Free-form input
- **"Skip for now"** — Defer, don't block
- **"I don't know"** — Honest uncertainty is valid

The system should never force a false choice.

---

## Progressive Narrowing: The Funnel of Understanding

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    SCHEMA INGESTION                                 │
│                         │                                           │
│                         ▼                                           │
│         ┌───────────────────────────────┐                          │
│         │    RAW INFERENCE SPACE        │                          │
│         │    (Everything possible)       │                          │
│         │    ~500 potential items        │                          │
│         └───────────────┬───────────────┘                          │
│                         │                                           │
│              AI applies heuristics                                  │
│              (naming, types, patterns)                              │
│                         │                                           │
│                         ▼                                           │
│         ┌───────────────────────────────┐                          │
│         │    PROBABLE VOCABULARY        │                          │
│         │    ~80 items, confidence scored│                          │
│         └───────────────┬───────────────┘                          │
│                         │                                           │
│              User confirms high-confidence                          │
│              (5 quick decisions)                                    │
│                         │                                           │
│                         ▼                                           │
│         ┌───────────────────────────────┐                          │
│         │    CORE VOCABULARY            │                          │
│         │    ~20 items, user-validated   │                          │
│         │    + 60 auto-approved          │                          │
│         └───────────────┬───────────────┘                          │
│                         │                                           │
│              User works, system learns                              │
│              (usage patterns, corrections)                          │
│                         │                                           │
│                         ▼                                           │
│         ┌───────────────────────────────┐                          │
│         │    REFINED VOCABULARY         │                          │
│         │    Continuously improving      │                          │
│         │    User can always adjust      │                          │
│         └───────────────────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Confidence Thresholds

```typescript
interface InferredItem {
  item: VocabularyItem;
  confidence: number;        // 0-100
  reasoning: string[];       // Why AI thinks this
  alternatives: Alternative[]; // Other interpretations
}

// Confidence determines UI treatment:
// 95-100: Auto-approve, show in "What we learned" summary
// 70-94:  Confirmation decision (quick yes/no)
// 40-69:  Selection decision (pick from options)
// 0-39:   Specification decision (user must provide)
```

---

## The Onboarding Flow: Adaptive Screens

Instead of fixed wizard steps, the flow is **generated based on what remains uncertain**.

### Screen Generation Logic

```typescript
function generateNextScreen(state: OnboardingState): Screen | null {
  const uncertainties = getUncertainties(state);

  if (uncertainties.length === 0) {
    return null; // Onboarding complete
  }

  // Group by theme for cognitive coherence
  const themed = groupByTheme(uncertainties);

  // Pick highest-impact theme
  const nextTheme = themed.sort(byImpact)[0];

  // Generate decisions for this theme
  const decisions = nextTheme.items.map(generateDecision);

  return {
    title: nextTheme.title,
    subtitle: nextTheme.description,
    decisions: decisions.slice(0, 5), // Max 5 per screen
    progress: calculateProgress(state),
    canSkip: true,
  };
}
```

### Example Generated Flow

**User A (E-commerce SaaS):**
```
Screen 1: "Core Metrics" — Revenue, Orders, Customers (3 confirmations)
Screen 2: "Customer Definition" — Which table is customers? (1 selection)
Screen 3: "Ready!" — 45 items auto-approved, 5 user-confirmed
```

**User B (Complex Enterprise Data):**
```
Screen 1: "Data Sources" — Multiple schemas detected (2 disambiguations)
Screen 2: "Revenue Metrics" — 4 candidates found (1 selection)
Screen 3: "Customer Hierarchy" — Accounts vs Users vs Contacts (1 disambiguation)
Screen 4: "Time Dimensions" — Multiple date columns (2 confirmations)
Screen 5: "Ready!" — 120 items auto-approved, 8 user-confirmed
```

The flow **adapts to data complexity**. Simple data = fast onboarding. Complex data = more decisions, but only what's necessary.

---

## Post-Onboarding: The Refinement Loop

Onboarding doesn't end. It transitions to **ambient refinement**.

### Refinement Triggers

```
┌─────────────────────────────────────────────────────────────────────┐
│  TRIGGER: USAGE PATTERNS                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  System notices: "user_count" hasn't been used in 30 days,          │
│  but "active_users" is used daily.                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Quick refinement:                                           │    │
│  │                                                              │    │
│  │  You always use "Active Users" but never "User Count".       │    │
│  │  Should we:                                                  │    │
│  │                                                              │    │
│  │  ○ Archive "User Count" (hide from suggestions)              │    │
│  │  ○ Merge them (User Count → alias for Active Users)          │    │
│  │  ○ Keep both (they mean different things)                    │    │
│  │                                                              │    │
│  │  [Decide]    [Remind me later]                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  TRIGGER: MISMATCH REPORT                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User reported: "This doesn't match our finance team's number"      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Refinement needed:                                          │    │
│  │                                                              │    │
│  │  "Revenue" was calculated as SUM(orders.amount)              │    │
│  │  You reported this doesn't match expectations.               │    │
│  │                                                              │    │
│  │  Common issues:                                              │    │
│  │  ○ Should exclude refunds                                    │    │
│  │  ○ Should exclude test orders                                │    │
│  │  ○ Should use different date (invoice vs order)              │    │
│  │  ○ Let me describe the correct calculation...                │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  TRIGGER: SCHEMA CHANGE                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  System detected: New table "subscriptions" added to database       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  New data detected:                                          │    │
│  │                                                              │    │
│  │  We found a new "subscriptions" table with columns:          │    │
│  │  mrr, status, started_at, canceled_at                        │    │
│  │                                                              │    │
│  │  This looks like subscription/recurring revenue data.        │    │
│  │                                                              │    │
│  │  [Analyze & Add Vocabulary]    [Ignore]    [Remind Later]   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### The Vocabulary Detail Panel

Every vocabulary item is forever refinable:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Monthly Recurring Revenue (MRR)                      [★ Favorite]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TYPE        Metric                                                 │
│  STATUS      ✓ Approved                                             │
│  SCOPE       Organization                                           │
│  OWNER       Finance Team                                           │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  DEFINITION                                                         │
│  Sum of monthly subscription amounts from active customers          │
│                                                                     │
│  FORMULA (SQL)                                        [Edit]        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  SELECT SUM(amount)                                          │    │
│  │  FROM subscriptions                                          │    │
│  │  WHERE status = 'active'                                     │    │
│  │    AND canceled_at IS NULL                                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  INTERPRETATION                                       [Edit]        │
│  ↑ Higher is better                                                 │
│  📊 Currency format                                                 │
│  📅 Point-in-time (snapshot)                                        │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  YOUR NOTES                                           [Edit]        │
│  "Remember: excludes annual prepays, those are in ARR"              │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ACTIONS                                                            │
│  [Report Issue]  [Suggest Edit]  [Create Variant]  [Archive]       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Speed Paths: Respect User Time

Not everyone wants to decide. Offer acceleration:

### "Trust the AI" Fast Path

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  We analyzed your database and found:                               │
│                                                                     │
│  📊  23 Metrics (Revenue, Users, Orders...)                         │
│  📐  18 Dimensions (Date, Region, Product...)                       │
│  👤  5 Entities (Customer, Order, Product...)                       │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  [Accept All & Start]              [Review & Customize]             │
│       ~10 seconds                       ~3 minutes                  │
│                                                                     │
│  You can always refine later from the Vocabulary page.              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Role-Based Fast Path

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  What's your role?                                                  │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │ Executive  │  │  Finance   │  │   Sales    │  │  Product   │    │
│  │            │  │            │  │            │  │            │    │
│  │ High-level │  │ Revenue &  │  │ Pipeline & │  │ Usage &    │    │
│  │ KPIs       │  │ margins    │  │ deals      │  │ engagement │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │
│                                                                     │
│  We'll prioritize vocabulary relevant to your role.                 │
│  (You'll still have access to everything)                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture: Generative UI

### Decision Component System

```typescript
// Core decision types
type DecisionType =
  | "confirmation"      // Yes/No with escape
  | "selection"         // Pick one from options
  | "multi_selection"   // Pick multiple
  | "specification"     // Free-form input
  | "disambiguation"    // Clarify ambiguity
  | "priority"          // Rank/star items
  | "slider"            // Threshold/range

interface Decision {
  id: string;
  type: DecisionType;
  question: string;
  context?: string;          // Why we're asking
  options?: Option[];        // For selection types
  defaultValue?: unknown;    // AI's best guess
  allowSkip: boolean;
  allowCustom: boolean;      // "None of these" option
  impact: string[];          // What this affects
}

interface Option {
  id: string;
  label: string;
  description?: string;
  confidence?: number;       // AI confidence in this option
  preview?: unknown;         // What selecting this would produce
}

// The AI generates these dynamically
function generateDecisions(
  schema: SchemaSnapshot,
  currentState: OnboardingState,
  userContext: UserContext
): Decision[]
```

### Screen Composition

```tsx
// Screens are composed from decisions
interface OnboardingScreen {
  id: string;
  title: string;
  subtitle?: string;
  decisions: Decision[];
  progress: number;           // 0-100
  estimatedTime: string;      // "~30 seconds"
  canSkip: boolean;
  skipLabel?: string;         // "I'll do this later"
}

// Render dynamically
function OnboardingScreen({ screen }: { screen: OnboardingScreen }) {
  return (
    <ScreenLayout progress={screen.progress}>
      <ScreenHeader
        title={screen.title}
        subtitle={screen.subtitle}
        time={screen.estimatedTime}
      />

      <DecisionList>
        {screen.decisions.map(decision => (
          <DecisionRenderer
            key={decision.id}
            decision={decision}
            onResolve={handleDecisionResolve}
          />
        ))}
      </DecisionList>

      <ScreenFooter>
        {screen.canSkip && (
          <SkipButton label={screen.skipLabel} />
        )}
        <ContinueButton />
      </ScreenFooter>
    </ScreenLayout>
  );
}

// Each decision type has its own renderer
function DecisionRenderer({ decision, onResolve }) {
  switch (decision.type) {
    case "confirmation":
      return <ConfirmationDecision {...} />;
    case "selection":
      return <SelectionDecision {...} />;
    case "specification":
      return <SpecificationDecision {...} />;
    // ...
  }
}
```

---

## The Meta-Principle: Uncertainty is the Product

Traditional products hide uncertainty. Knosia **surfaces and resolves it**.

The onboarding makes uncertainty explicit:
- "We're 95% confident this is your revenue metric"
- "We found 3 possible interpretations, which is correct?"
- "We couldn't figure this out, can you help?"

This builds trust. Users know what Knosia knows and doesn't know. They become partners in building understanding, not passengers being processed through a funnel.

**The capability isn't "onboarding users."**

**The capability is "building shared understanding between AI and human, continuously, forever."**

---

## Summary: Design Principles

1. **Compression over collection** — Infer 100, confirm 5
2. **Decisions over forms** — Structured choices with escapes
3. **Progressive narrowing** — Uncertainty decreases with each interaction
4. **Speed paths for trust** — "Accept all" for those who trust AI
5. **Escape hatches everywhere** — Never force false choices
6. **Refinement is forever** — Onboarding transitions, never ends
7. **Uncertainty is visible** — Confidence scores build trust
8. **Impact is clear** — Show what each decision affects
9. **Context is provided** — Explain why we're asking
10. **Roles guide, not restrict** — Personalize relevance, not access

---

## Implementation Priority

```
PHASE 1: Core Decision System
├── Decision type components (confirmation, selection, specification)
├── Screen generation from uncertainty list
├── Basic confidence scoring
└── "Accept all" fast path

PHASE 2: Intelligent Inference
├── Schema analysis → confidence-scored vocabulary
├── Pattern detection (naming conventions, types)
├── Disambiguation detection
└── Role-based prioritization

PHASE 3: Ambient Refinement
├── Usage tracking → refinement suggestions
├── Mismatch report → guided correction
├── Schema change detection
└── Periodic accuracy checks

PHASE 4: Advanced Intelligence
├── Cross-user learning (anonymized patterns)
├── Industry-specific vocabulary templates
├── Natural language formula generation
└── Proactive insight suggestions
```

---

*The best onboarding is one the user doesn't notice—because it feels like a conversation with a colleague who's trying to understand their world.*
