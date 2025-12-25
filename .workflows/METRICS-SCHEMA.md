# Workflow Metrics Schema

## Overview

The workflow system tracks timing data for estimation and historical analysis.

## Files

### `.workflows/metrics.yaml`

Created by `/workflow:init`. Stores estimation baselines and execution history.

```yaml
estimates:
  # Human-readable complexity-to-time mapping
  S: "30s-1min"
  M: "1-3min"
  L: "3-10min"

  # Seconds-based for calculations
  S_seconds: { min: 30, max: 60, avg: 45 }
  M_seconds: { min: 60, max: 180, avg: 120 }
  L_seconds: { min: 180, max: 600, avg: 300 }

history:
  - workflow_id: WF-TIMING
    name: "Workflow Timing Enhancement"
    started_at: "2025-12-25T20:45:12Z"
    completed_at: "2025-12-25T20:48:47Z"
    duration: "3m 35s"
    duration_s: 215
    tasks:
      - id: T1
        duration: "33s"
        duration_s: 33
        complexity: S
        estimated: "30s-1min"
        status: "on_target"
    accuracy: "85%"
```

### `.workflows/active/WF-XXX/STATUS.yaml`

Timing section added during execution:

```yaml
timing:
  workflow:
    started_at: "2025-12-25T20:45:12Z"
    completed_at: null  # Set when complete
    duration: null      # Calculated when complete
    duration_s: null

  waves:
    - wave: 1
      type: parallel
      started_at: "2025-12-25T20:45:12Z"
      completed_at: "2025-12-25T20:47:30Z"
      duration: "2m 18s"
      duration_s: 138
      agents:
        - id: T1
          name: "Task name"
          complexity: S
          started_at: "2025-12-25T20:45:12Z"
          completed_at: "2025-12-25T20:45:45Z"
          duration: "33s"
          duration_s: 33
          status: completed

  # For resumed workflows
  interruptions:
    - paused_at: "2025-12-25T20:47:15Z"
      resumed_at: "2025-12-25T21:00:00Z"
      gap: "12m 45s"
```

## Timing Display Formats

### Pre-Execution (Proposal)

```
### Effort Estimation

| Wave | Type | Tasks | Est. Time |
|------|------|-------|-----------|
| 1 | Parallel (4) | T1, T2, T3, T4 | ~2-3 min |
| 2 | Sequential | T5, T6 | ~1 min |

**Estimated Total**: 3-4 min
**Estimated Agent Time**: 6-8 min (sum)
```

### During Execution (Status)

```
### Current Timing

**Started**: Dec 25, 2025 at 8:45 PM
**Elapsed**: 2m 15s (running)

| Agent | Status | Duration |
|-------|--------|----------|
| T1 | ✅ Done | 33s |
| T2 | 🔄 Running | 1m 15s... |
| T3 | ⏳ Pending | - |
```

### Post-Execution (Complete)

```
### Timing Report

**Started**: Dec 25, 2025 at 8:45 PM
**Completed**: Dec 25, 2025 at 8:48 PM
**Duration**: 3m 35s

| Agent | Est. | Actual | Status |
|-------|------|--------|--------|
| T1 | 30s-1min | 33s | ✅ |
| T2 | 30s-1min | 1m 46s | ⚠️ slow |

**Accuracy**: 85% (5/6 agents within estimate)
```

## Status Indicators

| Icon | Meaning |
|------|---------|
| ✅ | Completed within estimate |
| ⚠️ | Completed but slower than estimate |
| ❌ | Significantly over estimate (>50%) |
| 🔄 | Currently running |
| ⏳ | Pending (not started) |

## Calculation Notes

1. **Wall Clock Time**: For parallel waves, use longest agent duration
2. **Agent Time**: Sum of all agent durations
3. **Accuracy**: `(agents_within_estimate / total_agents) * 100`
4. **Interruption Handling**: Subtract gap durations from total elapsed
