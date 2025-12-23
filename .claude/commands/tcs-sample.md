# TCS Sample - Generate One Triangulated Sample

Generate a single sample with full triangulation. NO API - you do it all.

## Arguments
- $ARGUMENTS: The dashboard prompt to generate (optional, random if not provided)

## Instructions

Read the spec first:
```
cat .mydocs/autodev/specs/LIQUID-SPEC.md
```

### Step 1: Generate JSX

Create clean, semantic React JSX with Tailwind CSS for the prompt.
Keep it focused - one component, clear structure.

### Step 2: Extract LiquidSchema

Convert your JSX to this JSON structure:
```json
{
  "version": "3.0",
  "signals": ["signalName"],
  "layers": [{
    "id": 0,
    "visible": true,
    "root": {
      "uid": "unique-id",
      "type": "container|kpi|button|text|list|...",
      "binding": { "type": "named|indexed|literal", "value": "..." },
      "children": [...]
    }
  }]
}
```

### Step 3: Write LiquidCode

Convert your Schema to LiquidCode v3 DSL following the spec.

### Step 4: Self-Validate

Compare all three:
- Structure matches?
- Bindings consistent?
- Signals aligned?
- Interactions preserved?

### Step 5: Output

Show the three representations clearly labeled.
Rate consistency and list any findings.

If inconsistent, explain why and show corrected versions.
