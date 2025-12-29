// Knosia B2B Marketing Copy
// Target: Business Intelligence / Data Teams / Executives

import type {
  ModeCard,
  JourneyStep,
  CompetitorPosition,
  FeatureComparison,
  BriefingItem,
} from "./types";

// ============================================
// HERO SECTION
// ============================================

export const hero = {
  badge: "The future of business intelligence",
  title: "Know what matters.",
  subtitle: "Your business, briefed daily.",
  description:
    "Stop drowning in dashboards. Get proactive intelligence that tells you what's important—before you ask.",
  cta: {
    primary: "Get Early Access",
    secondary: "See How It Works",
  },
  stats: [
    { value: "99%", label: "Less time building dashboards" },
    { value: "10s", label: "Average query response" },
    { value: "24/7", label: "Always watching your data" },
  ],
};

// ============================================
// BRIEFING PREVIEW (Hero visual)
// ============================================

export const briefingPreview: BriefingItem[] = [
  {
    type: "positive",
    icon: "📈",
    title: "Revenue is up 8% WoW",
    detail: "Driven by Enterprise segment (+23%). SMB flat.",
    actions: ["View breakdown", "Compare to forecast"],
  },
  {
    type: "warning",
    icon: "⚠️",
    title: "Churn spiked to 4.2%",
    detail: "12 Enterprise accounts churned. Common factor: API rate limits.",
    actions: ["See affected accounts", "Draft retention campaign"],
  },
  {
    type: "target",
    icon: "🎯",
    title: "Q4 target: 78% achieved",
    detail: "Need $890K more with 6 weeks remaining. Gap: $170K.",
    actions: ["Show pipeline", "Identify expansion opportunities"],
  },
  {
    type: "insight",
    icon: "💡",
    title: "Feature X users have 3x lower churn",
    detail: "Only 23% of Enterprise accounts have enabled it.",
    actions: ["See who hasn't enabled", "Draft enablement email"],
  },
];

// ============================================
// HOW IT WORKS
// ============================================

export const howItWorks = {
  title: "From data chaos to clarity",
  subtitle: "Three steps. Five minutes. Intelligence delivered.",
  steps: [
    {
      number: "01",
      title: "Connect your data",
      description:
        "Point us to your database. We understand your schema instantly—no configuration, no setup wizards.",
      duration: "30 seconds",
    },
    {
      number: "02",
      title: "Confirm what matters",
      description:
        "We detect your metrics, dimensions, and relationships. You just confirm the names.",
      duration: "30 seconds",
    },
    {
      number: "03",
      title: "Receive your first briefing",
      description:
        "Tomorrow morning, you'll know what matters. Every day after, you'll know before anyone asks.",
      duration: "Automatic",
    },
  ],
};

// ============================================
// THREE MODES
// ============================================

export const threeModes: {
  title: string;
  subtitle: string;
  modes: ModeCard[];
} = {
  title: "Three ways to know",
  subtitle: "Proactive, conversational, or deep-dive—your intelligence adapts to you.",
  modes: [
    {
      id: "proactive",
      icon: "☀️",
      title: "Morning Briefing",
      description:
        "Wake up knowing what needs your attention. Revenue changes, churn spikes, target gaps—delivered before you ask.",
      example:
        '"Good morning. Revenue up 8%. Churn spiked—12 Enterprise accounts, all had API complaints. You\'re $170K short of Q4 target."',
    },
    {
      id: "conversational",
      icon: "💬",
      title: "Ask Anything",
      description:
        "Natural language questions, contextual answers. Not just numbers—the story behind them.",
      example:
        '"Revenue last quarter?" → "$4.2M, up 12% YoY. Enterprise grew 34%, SMB declined 8%. Top region: EMEA (+41%)."',
    },
    {
      id: "exploratory",
      icon: "🔍",
      title: "Deep Dive",
      description:
        "When you need to investigate, collaborate with your data. Drill down, compare, correlate—guided by intelligence.",
      example:
        '"Why did Enterprise grow?" → "Three factors: 8 new logos ($320K), expansion ($180K), lower churn. New logos came from Security-First campaign."',
    },
  ],
};

// ============================================
// PARADIGM SHIFT (Features Comparison)
// ============================================

export const paradigmShift: {
  title: string;
  subtitle: string;
  comparisons: FeatureComparison[];
} = {
  title: "Not a dashboard. A data scientist.",
  subtitle: "The paradigm shift from reactive to proactive intelligence.",
  comparisons: [
    {
      feature: "Getting insights",
      traditional: "You build dashboards",
      knosia: "Briefings are delivered to you",
    },
    {
      feature: "Asking questions",
      traditional: "You write queries",
      knosia: "You ask in plain English",
    },
    {
      feature: "Finding problems",
      traditional: "You discover issues",
      knosia: "Issues find you first",
    },
    {
      feature: "Reports",
      traditional: "Static monthly decks",
      knosia: "Living, real-time intelligence",
    },
    {
      feature: "Understanding data",
      traditional: "Shows numbers",
      knosia: "Tells stories",
    },
    {
      feature: "Getting help",
      traditional: "Wait for the data team",
      knosia: "Instant answers, 24/7",
    },
  ],
};

// ============================================
// COMPETITOR POSITIONING
// ============================================

export const competitorMap: {
  title: string;
  subtitle: string;
  xAxis: { left: string; right: string };
  yAxis: { bottom: string; top: string };
  positions: CompetitorPosition[];
} = {
  title: "A new category",
  subtitle: "We're not competing with BI tools. We're replacing the need for them.",
  xAxis: { left: "Reactive", right: "Proactive" },
  yAxis: { bottom: "Manual Effort", top: "Autonomous" },
  positions: [
    { name: "Tableau", x: 15, y: 25 },
    { name: "PowerBI", x: 20, y: 30 },
    { name: "Metabase", x: 25, y: 35 },
    { name: "Looker", x: 35, y: 40 },
    { name: "Mode", x: 30, y: 35 },
    { name: "ThoughtSpot", x: 45, y: 55 },
    { name: "Knosia", x: 85, y: 90, isUs: true },
  ],
};

// ============================================
// LEARNING JOURNEY
// ============================================

export const learningJourney: {
  title: string;
  subtitle: string;
  steps: JourneyStep[];
} = {
  title: "It gets smarter every day",
  subtitle: "The more you use it, the more it understands your business.",
  steps: [
    {
      day: "Day 1",
      title: "Instant Understanding",
      description:
        "Analyzes your schema. Detects your business model. Infers metrics, dimensions, relationships. Ready to answer questions.",
    },
    {
      day: "Day 7",
      title: "Pattern Recognition",
      description:
        "Learns what you check, when you check it. Notices that 'customers' usually means paying customers, not trials.",
    },
    {
      day: "Day 30",
      title: "Anticipation",
      description:
        "Knows your board meeting is tomorrow. Prepares the metrics you always need. Drafts the briefing before you ask.",
      highlight: true,
    },
    {
      day: "Day 90",
      title: "Proactive Intelligence",
      description:
        "Detects unusual patterns before they become problems. Correlates support tickets with deployments. Alerts you with recommendations.",
    },
    {
      day: "Day 365",
      title: "Institutional Memory",
      description:
        "Remembers how you solved similar problems. Recalls what worked last time. Applies learnings across your entire organization.",
    },
  ],
};

// ============================================
// VOCABULARY SECTION
// ============================================

export const vocabularySection = {
  title: "Intelligence, not configuration",
  subtitle:
    "No semantic layers to build. No metrics to define. We understand your data—and learn what you mean.",
  features: [
    {
      title: "Auto-discovered",
      description: "We read your schema and understand your business model in seconds.",
    },
    {
      title: "Continuously learning",
      description:
        "Every question teaches us what you mean. 'Revenue' becomes YOUR revenue.",
    },
    {
      title: "Invisible infrastructure",
      description:
        "You never see the vocabulary. It only surfaces when we need clarification.",
    },
  ],
  example: {
    title: "Surfaces only at friction points",
    scenarios: [
      {
        type: "Ambiguity",
        question: "Show me conversion rate",
        response:
          "I found 3 metrics that could be 'conversion rate': Trial → Paid (12%), Visitor → Signup (3.2%), Lead → Customer (8%). Which one?",
      },
      {
        type: "Missing definition",
        question: "Show me healthy accounts",
        response:
          "I don't know what 'healthy' means for your business yet. NPS > 8? No support tickets in 30 days? Using > 80% of features?",
      },
    ],
  },
};

// ============================================
// FINAL CTA
// ============================================

export const finalCta = {
  title: "Ready to know what matters?",
  subtitle:
    "Join the companies who wake up informed. No dashboards to build. No queries to write.",
  cta: {
    primary: "Get Early Access",
    secondary: "Schedule a Demo",
  },
  note: "Free for teams up to 5. No credit card required.",
};
