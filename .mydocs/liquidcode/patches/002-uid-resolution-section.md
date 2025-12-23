# Patch 002: Add §8.7 "Selector Resolution Semantics"

**Target:** LIQUIDCODE-SPEC-v2.1.md
**Location:** Insert after §8.6 (before §9)
**Status:** PROPOSED
**Date:** 2025-12-22

## Summary

Elevates UID resolution semantics from Appendix B.2.2 into the main Block Addressing System (§8). This makes the critical distinction between positional selectors (convenience syntax) and UID sets (runtime reality) visible in the core specification.

## Rationale

- **Current state:** B.2.2 buries UID resolution in appendix, treating it as implementation detail
- **Problem:** Developers may assume positional selectors are first-class, leading to fragile code
- **Solution:** Promote to §8.7 to establish that all selectors resolve to UID sets before mutation

## Patch Content

---

### 8.7 Selector Resolution Semantics

#### 8.7.1 Resolution to UID Sets

**All positional selectors resolve to UID sets at mutation time.**

Positional selectors (`@K0`, `@[0,1]`, etc.) are **convenience syntax only**. The resolution process:

```typescript
interface AddressResolution {
  selector: string;           // Original: "@K0"
  resolvedUids: string[];     // ["b_a7f3c9e2b4d1"]
  ambiguous: boolean;         // True if multiple matches for singular selector
  timestamp: number;          // When resolved
}
```

**Key properties:**
- Selectors are ephemeral; UIDs are canonical
- Grid position changes do NOT affect resolved mutations
- Mutations target UIDs, not positions

#### 8.7.2 Ambiguity Policy (Normative)

**DEFAULT:** Ambiguity is an ERROR for singular operations.

When a positional selector matches multiple blocks:

| Operation Type | Policy | Example |
|----------------|--------|---------|
| **Singular** (expects 1) | ERROR + disambiguation | `Δ~@K0.label:"x"` matches 2 KPIs → ERROR |
| **Plural** (expects N) | ALLOWED | `Δ~@K*.showTrend:true` matches 3 KPIs → OK |
| **Explicit tiebreak** | ALLOWED + LOGGED | `Δ~@K0?first.label:"x"` → uses first match |

**Singular operations MUST error on ambiguous matches** unless an explicit tiebreaker is provided.

```typescript
// ERROR: Two KPIs at position "first"
Δ~@K0.label:"Revenue"
// Error: Selector @K0 matched 2 blocks: [b_a7f3c9e2, b_d4e1f8a9]
// Use @K0?first for deterministic selection or @#explicitId

// OK: Tiebreaker provided
Δ~@K0?first.label:"Revenue"
// Warning: Ambiguous selector @K0 resolved via ?first tiebreaker
```

#### 8.7.3 Explicit Tiebreak Syntax

**Syntax:** `@<selector>?first`

When multiple blocks match a positional selector, `?first` uses the first block in traversal order (top-to-bottom, left-to-right grid scan).

**Requirements:**
- MUST be logged as warning to audit trail
- MUST include all matched UIDs in log
- Traversal order is deterministic (grid row-major scan)

**Example:**
```liquidcode
# Two KPIs exist at different grid positions
@K0 → matches [b_123 at [0,0], b_456 at [0,1]]

# Explicit tiebreak
Δ~@K0?first.label:"Q1 Revenue"
# Resolves to: b_123
# Log: "Ambiguous @K0 resolved to b_123 via ?first (alternatives: b_456)"
```

#### 8.7.4 Resolution Algorithm

**Normative resolution process:**

```
1. Parse selector
   - @K0      → type="kpi", index=0
   - @[1,2]   → row=1, col=2
   - @:revenue → binding="revenue"

2. Query current schema
   - Match blocks by selector criteria
   - Return all matching UIDs

3. Validate cardinality
   IF operation expects singular (e.g., property mutation):
     IF matches.length > 1:
       IF tiebreaker present (?first):
         - Use first in traversal order
         - LOG warning with all matched UIDs
       ELSE:
         - ERROR with disambiguation options
     ELSE IF matches.length == 0:
       - ERROR "No blocks matched @K0"
     ELSE:
       - Return single UID
   ELSE:
     - Return UID array

4. Execute mutation on resolved UID(s)
   - Schema changes after resolution do NOT affect target
   - Mutation always operates on UID, not position
```

**Traversal order:** Grid blocks scanned row-major (top-to-bottom, left-to-right). Ungridded blocks follow insertion order.

#### 8.7.5 UID Stability Guarantees

Once a selector resolves to a UID:

| Event | UID Persists? | Selector Remains Valid? |
|-------|---------------|-------------------------|
| Grid position changes | YES | NO (re-resolution would match different block) |
| Block type changes | YES | NO (type selector now fails) |
| Binding changes | YES | NO (binding selector now fails) |
| Block deleted | NO | NO |

**Implication:** Batch operations that modify grid positions MUST resolve all selectors before applying any mutations.

**Example:**
```liquidcode
# WRONG: Positions shift during batch
Δ~@[0,0].position:[0,1]  # Moves first block right
Δ~@[0,1].position:[0,2]  # AMBIGUOUS: old [0,1] or new [0,1]?

# CORRECT: Pre-resolve to UIDs
Δ~@[0,0].position:[0,1] & @[0,1].position:[0,2]
# Engine resolves both selectors BEFORE applying either mutation
# @[0,0] → uid_a, @[0,1] → uid_b
# Then applies: uid_a.position=[0,1], uid_b.position=[0,2]
```

---

## Integration Notes

**Cross-references to update:**
- §8.3 "Resolution Priority" → add forward reference to §8.7.4
- §9 "Binding System" → reference §8.7.1 for `:binding` selector resolution
- Appendix B.2.2 → replace with "See §8.7 for normative resolution semantics"

**New dependencies:**
- UID assignment (§B.2.1) remains in appendix as implementation detail
- Mutation targeting (§B.2.3) should reference §8.7.5 for stability guarantees

## Testing Implications

Implementations MUST test:
1. Ambiguous selector error handling (§8.7.2)
2. `?first` tiebreaker with logging (§8.7.3)
3. Grid position mutation batching (§8.7.5 example)
4. UID persistence across schema changes (§8.7.5 table)

## Open Questions

- [ ] Should `?last` tiebreaker also be supported? (Reverse traversal order)
- [ ] Should `?random` be allowed for non-deterministic testing scenarios?
- [ ] How should snapshot addressing (`@snapshot:3.@K0`) interact with ambiguity errors?
