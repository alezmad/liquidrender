# Knosia: Presence Modes & Ambient Intelligence Vision

> **One Brain, Many Views.**

---

## The Core Insight

Knosia isn't a BI tool with AI chat. It's the **company's institutional memory** that happens to know how to query databases.

The presence modes aren't separate features — they're **views** of the same underlying intelligence.

---

## Architecture: One Brain, Many Views

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                         ONE BRAIN                                   │
│                                                                     │
│         ┌─────────────────────────────────────────┐                 │
│         │         SEMANTIC LAYER                  │                 │
│         │   vocabulary + data + memory + context  │                 │
│         └──────────────────┬──────────────────────┘                 │
│                            │                                        │
│              ┌─────────────┼─────────────┐                          │
│              │             │             │                          │
│              ▼             ▼             ▼                          │
│         ┌────────┐   ┌──────────┐   ┌─────────┐                     │
│         │Briefing│   │ Meeting  │   │ Ambient │                     │
│         │  View  │   │   View   │   │  View   │                     │
│         └────────┘   └──────────┘   └─────────┘                     │
│                                                                     │
│         Same brain. Different windows.                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Input/Output Architecture

```
INPUTS                          BRAIN                         OUTPUTS
────────────────────────────────────────────────────────────────────────

  Voice  ──┐                                              ┌── Briefing
           │                                              │
  Text   ──┼──▶  ┌────────────────────────────┐  ──▶  ────┼── Notebook
           │     │                            │           │
  Screen ──┤     │  SEMANTIC INTELLIGENCE     │           ├── Presentation
           │     │                            │           │
  Calendar─┤     │  • Vocabulary (meanings)   │           ├── Meeting
           │     │  • Data (connections)      │           │
  Slack  ──┤     │  • Memory (conversations)  │           ├── Ambient
           │     │  • Context (who/when/why)  │           │
  Email  ──┘     │                            │           └── Notification
                 └────────────────────────────┘
```

**Modes aren't the hard part. The semantic layer is.**

---

## The Five Presence Modes

```
┌────────────────────────────────────────────────────────────────────┐
│                    KNOSIA PRESENCE MODES                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  BRIEFING MODE      Morning standup. 90 seconds. What matters.    │
│  ───────────────    "Revenue up. Churn spiked. One thing to know."│
│                                                                    │
│  ANALYSIS MODE      Deep dive. Full notebook. Blocks grow.        │
│  ───────────────    You're exploring. Time to think.              │
│                                                                    │
│  PRESENTATION MODE  One insight per screen. Clean. Shareable.     │
│  ───────────────    You're showing someone. Make it land.         │
│                                                                    │
│  MEETING MODE       Live companion. Recording. Real-time data.    │
│  ───────────────    "Actually, APAC churn is 4.2%, not 5%."       │
│                                                                    │
│  AMBIENT MODE       Background. Silent. Watches for anomalies.    │
│  ───────────────    Interrupts only when something matters.       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Mode Details

| Mode | Trigger | Display | Interaction |
|------|---------|---------|-------------|
| **Briefing** | Morning / on-demand | Cards with sparklines | Read-only, tap to expand |
| **Analysis** | User initiates deep dive | Full notebook, growing blocks | Full conversation |
| **Presentation** | User toggles / sharing | One block at a time | Next/prev navigation |
| **Meeting** | Calendar event / manual | Last response only | Voice + text query |
| **Ambient** | Always on (background) | Notifications only | Interrupt-driven |

---

## Knosia as Chief of Staff

A great Chief of Staff:
- **Prepares briefings** before you ask
- **Sits in meetings** quietly, surfaces data when relevant
- **Remembers everything** — "Last quarter we decided X because Y"
- **Adapts presence** — silent observer vs. active participant
- **Knows the rhythm** — Monday's exec meeting, Thursday's pipeline review

---

## Meeting Mode: Deep Dive

### The Lifecycle

**Before the meeting:**
- Sees calendar event "Q4 Pipeline Review"
- Pre-loads relevant pipeline data
- Prepares likely questions ("What's the close rate on enterprise deals?")

**During the meeting:**
- Records transcript
- Surfaces data when someone asks a number
- Fact-checks claims in real-time (gentle, not obnoxious)
- Notes when decisions are made
- Always shows last response only (presentation mode)

**After the meeting:**
- Generates summary with data context
- Action items with the numbers attached
- Stored as searchable institutional memory

**Six months later:**
> "What did we decide about APAC expansion pricing?"
>
> *"In the Oct 15 Q4 planning meeting, you decided to hold APAC pricing flat until churn dropped below 3%. Current APAC churn is 2.8%."*

### The Killer Differentiator

Otter.ai, Fireflies, Fathom — they all do transcription.

**None of them know your data.**

> "Hey, did Sarah say APAC churn was 5%?"
>
> *"She said 5%, but the actual number is 4.2%. Here's the query."*

**Knosia is the only meeting companion that can fact-check with real data.**

---

## The Philosophical Shift

| Traditional BI | Knosia |
|----------------|--------|
| You go to the data | The data comes to you |
| Open tool, find dashboard | Briefing is already waiting |
| Take meeting notes manually | Knosia was there, remembers everything |
| "I think we said X last quarter" | "You decided X on Oct 15, here's the recording" |
| Present data from slides | Knosia is your presentation, live data |
| Check if numbers are right | Knosia fact-checks in real-time |

---

## Ambient Computing Vision

Once Knosia has the semantic layer, it becomes **ambient business intelligence**.

Not a tool you open. A presence that's **always there**.

```
You're in a meeting:
  → Knosia is listening, ready if someone asks a number

You're reading an email:
  → "Is the $4.2M in this board update correct?"
  → "It's $4.18M. Close enough for rounding."

You're on a call:
  → Knosia hears "I think churn is around 5%"
  → Subtle notification: "Churn is 4.2%"

You're about to present:
  → Knosia auto-refreshes your deck's numbers

You wake up Monday:
  → Briefing is already waiting
```

---

## Calendar Intelligence (V2/V3)

Knosia connects to company calendar. Knows the rhythm.

```
Monday 9am    → Executive meeting → Auto-prepares exec briefing
Tuesday 2pm   → Sales pipeline    → Pre-loads pipeline data
Thursday 10am → Product review    → Surfaces product metrics
```

---

## Implementation Roadmap

### Effort vs Value Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EFFORT vs VALUE MATRIX                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  HIGH VALUE                                                         │
│       │                                                             │
│       │   ★ SWEET SPOT                    ○ Hard but powerful       │
│       │   ┌─────────────┐                 ┌──────────────────┐      │
│       │   │Meeting Mode │                 │Real-time         │      │
│       │   │(basic)      │                 │fact-checking     │      │
│       │   │             │                 │                  │      │
│       │   │Presentation │                 │Calendar AI       │      │
│       │   │Mode         │                 │prep              │      │
│       │   └─────────────┘                 └──────────────────┘      │
│       │                                                             │
│       │   ┌─────────────┐                 ┌──────────────────┐      │
│       │   │Meeting      │                 │Institutional     │      │
│       │   │summaries    │                 │memory            │      │
│       │   │             │                 │("what did we     │      │
│       │   │Meeting      │                 │decide about X")  │      │
│       │   │search       │                 │                  │      │
│       │   └─────────────┘                 └──────────────────┘      │
│       │                                                             │
│  LOW VALUE                                                          │
│       └───────────────────────────────────────────────────────────  │
│               EASY                                    HARD          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase Breakdown

| Phase | Feature | Effort | Unlock |
|-------|---------|--------|--------|
| **V1.5** | Presentation Mode | 2 days | Shareable insights |
| **V1.5** | Meeting Mode (basic) | 1.5 weeks | "Data-aware meeting companion" positioning |
| **V2** | Meeting search | 1 week | "What did we discuss about X?" |
| **V2** | Meeting summaries | 3 days | Auto action items |
| **V3** | Calendar prep | 2 weeks | Pre-briefing magic |
| **V3** | Real-time fact-check | 3 weeks | "Actually, that number is..." |

### Sweet Spot: 2-Week Build

**Presentation Mode + Basic Meeting Mode = 2 weeks**

Marketing message unlocked:

> *"Knosia: The meeting companion that knows your data."*

Competitors can't copy this without building a semantic layer first.

---

## Technical Foundation (Already Have)

| What You're Building | What It Unlocks |
|----------------------|-----------------|
| Vocabulary system | Knows what "churn" means to YOU |
| Database connection | Can answer with real numbers |
| Conversation memory | Remembers context across sessions |
| Transcription (STT) | Can hear meetings |
| Role awareness | Knows CEO needs different view than analyst |

**Stack these together and the modes emerge naturally.**

---

## Implementation Notes

### Presentation Mode (2 days)

```typescript
// Just UI state toggle on existing notebook
const [viewMode, setViewMode] = useState<'notebook' | 'presentation'>('notebook');

// Presentation = show blocks[currentIndex] only
// Add ← → keyboard nav and swipe
```

### Meeting Mode Basic (1.5 weeks)

What you already have:
- ✅ STT in codebase (`packages/api/src/modules/ai/stt.ts`)
- ✅ Conversation API
- ✅ Notebook storage

What you need:
```
┌──────────────────────────────────────────────┐
│ 1. MediaRecorder API → capture audio         │  ← Browser native
│ 2. Chunk upload to S3                        │  ← Already have storage
│ 3. Whisper transcription                     │  ← Already have STT
│ 4. Conversation during meeting               │  ← Already have this
│ 5. Save as "meeting notebook"                │  ← New notebook type
│ 6. Always-presentation display               │  ← Boolean flag
└──────────────────────────────────────────────┘
```

---

## Why This Isn't Ambitious — It's Inevitable

The modes are just:
- Different triggers (morning, meeting, anomaly)
- Different displays (cards, notebook, single-block)
- Same brain

**The hard work is the semantic layer. Everything else is product design and UI polish.**

---

## Competitive Moat

| Competitor | What They Do | What They Lack |
|------------|--------------|----------------|
| Otter.ai | Transcription | No data layer |
| Fireflies | Meeting notes | No data layer |
| Fathom | Meeting summaries | No data layer |
| Tableau | Dashboards | No conversation, no vocabulary |
| Looker | Semantic layer | No conversation, not ambient |

**Knosia = Semantic Layer + Conversation + Transcription + Ambient Presence**

No one else has this combination.

---

*Document created: 2025-12-31*
*Vision: Knosia as ambient business intelligence — always present, never intrusive.*
