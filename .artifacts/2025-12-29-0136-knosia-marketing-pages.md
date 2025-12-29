# Knosia Marketing Pages

> Created: 2025-12-29
> Domain: knosia.com
> Location: `apps/web/src/modules/marketing/knosia/`

## Brand Identity

**Name:** Knosia (Know + Gnosis)
**Tagline:** Know what matters.
**Subline:** Your business, briefed daily.

**Core Promise:** Not dashboards, briefings. Not queries, answers.
**Differentiator:** Proactive intelligence that delivers before you ask.

## Target Audience

B2B Intelligence Clients:
- Executives who need daily briefings
- Data teams drowning in dashboards
- Companies that can't afford a dedicated data scientist

## Page Sections

### 1. Hero
- Badge: "The future of business intelligence"
- Title: "Know what matters."
- Subtitle: "Your business, briefed daily."
- Visual: Interactive briefing preview mockup showing:
  - Revenue up 8% WoW
  - Churn spike warning (4.2%)
  - Q4 target progress (78%)
  - Feature adoption insight
- CTAs: "Get Early Access" / "See How It Works"

### 2. How It Works
**"From data chaos to clarity"**

| Step | Title | Duration |
|------|-------|----------|
| 01 | Connect your data | 30 seconds |
| 02 | Confirm what matters | 30 seconds |
| 03 | Receive your first briefing | Automatic |

### 3. Three Modes
**"Three ways to know"**

| Mode | Icon | Description |
|------|------|-------------|
| Morning Briefing | ☀️ | Proactive - wake up knowing what needs attention |
| Ask Anything | 💬 | Conversational - natural language Q&A |
| Deep Dive | 🔍 | Exploratory - investigate and correlate |

### 4. Competitor Map
**"A new category"**

2D positioning chart:
- X-axis: Reactive → Proactive
- Y-axis: Manual Effort → Autonomous

Competitors plotted:
- Tableau (15, 25)
- PowerBI (20, 30)
- Metabase (25, 35)
- Mode (30, 35)
- Looker (35, 40)
- ThoughtSpot (45, 55)
- **Knosia (85, 90)** ← Top-right quadrant

### 5. Learning Journey
**"It gets smarter every day"**

| Day | Milestone | Description |
|-----|-----------|-------------|
| Day 1 | Instant Understanding | Schema analysis, business model detection |
| Day 7 | Pattern Recognition | Learns your habits and terminology |
| **Day 30** | **Anticipation** | Knows your meetings, prepares briefings |
| Day 90 | Proactive Intelligence | Detects problems before they escalate |
| Day 365 | Institutional Memory | Organizational learning and recall |

### 6. Vocabulary Section
**"Intelligence, not configuration"**

Features:
- Auto-discovered (schema understanding)
- Continuously learning (questions teach the system)
- Invisible infrastructure (surfaces only at friction)

Interactive demo showing:
- Ambiguity handling: "Show me conversion rate" → offers 3 options
- Missing definition: "Show me healthy accounts" → asks for clarification

### 7. Final CTA
**"Ready to know what matters?"**

- Primary: "Get Early Access"
- Secondary: "Schedule a Demo"
- Note: "Free for teams up to 5. No credit card required."

## File Structure

```
apps/web/src/modules/marketing/knosia/
├── index.ts              # Barrel exports
├── types.ts              # TypeScript interfaces
├── copy.ts               # All marketing copy
├── hero.tsx              # Hero with briefing preview
├── how-it-works.tsx      # 3-step process
├── three-modes.tsx       # Proactive/Conversational/Exploratory
├── competitor-map.tsx    # 2D positioning chart
├── learning-journey.tsx  # Day 1→365 timeline
├── vocabulary-section.tsx # Feature cards + interactive demo
└── final-cta.tsx         # Closing CTA
```

## Technical Stack

- Next.js 16 App Router
- Tailwind CSS with design tokens
- Motion (framer-motion v12) for animations
- `@turbostarter/ui-web` components
- Responsive design (mobile-first)
- CSS animations with `--animation-delay` variables

## Key Design Patterns

1. **Terminal/Chat aesthetic** - Briefing preview and vocabulary demo use terminal-style UI
2. **Staggered animations** - Elements fade in sequentially on scroll
3. **Primary color accents** - Knosia highlighted in competitor map and timeline
4. **Mobile-responsive** - Chart becomes list on mobile, timeline becomes cards

## Integration

Page route: `apps/web/src/app/[locale]/(marketing)/page.tsx`

```tsx
import {
  Hero,
  HowItWorks,
  ThreeModes,
  CompetitorMap,
  LearningJourney,
  VocabularySection,
  FinalCta,
} from "~/modules/marketing/knosia";
```
