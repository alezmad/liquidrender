# LiquidSurvey DSL v1.0 Specification

A compact, human-readable DSL for encoding survey graphs.

## Design Principles

1. **Semantic Density** - Maximum meaning in minimum characters
2. **Structural Clarity** - Graph structure is visually apparent
3. **Lossless Roundtrip** - Schema ↔ DSL ↔ Runtime without data loss
4. **Readable by Humans** - Can understand survey flow at a glance

## Node Types

| Symbol | Type     | Description              |
|--------|----------|--------------------------|
| `>`    | start    | Entry point              |
| `?`    | question | Collects user response   |
| `!`    | message  | Display-only content     |
| `<`    | end      | Terminal node            |

## Question Types (2-char codes)

| Code | Type          | Code | Type          |
|------|---------------|------|---------------|
| `Tx` | text          | `Ta` | textarea      |
| `Rt` | rating        | `Ch` | choice        |
| `Mc` | multiChoice   | `Ms` | multiSelect   |
| `Np` | nps           | `Dt` | date          |
| `Dr` | dateRange     | `Tm` | time          |
| `Cb` | combobox      | `Nu` | number        |
| `Cl` | color         | `Fd` | fileDropzone  |
| `Em` | email         | `Ph` | phone         |
| `Ur` | url           | `Cu` | currency      |
| `Lk` | likert        | `Mx` | matrix        |
| `Lo` | location      | `Sl` | slider        |
| `Ic` | imageChoice   | `Sg` | signature     |
| `Rg` | range         | `Yn` | yesNo         |
| `Pc` | percentage    | `Dm` | dimensions    |
| `Il` | imageLocation | `Gl` | geolocation   |
| `Rk` | ranking       | `Hd` | hidden        |
| `Pw` | password      | `Cp` | captcha       |
| `Au` | audio         | `Vd` | video         |
| `Ad` | address       |      |               |

## Syntax

### Basic Structure

```
SURVEY_ID "Title" "Description"
---
> id "title" "message" -> next_id
? id Type "question" [options] [conditions] -> next_id
! id "title" "message" -> next_id
< id "title" "message"
```

### Node Definition

```
TYPE id [attributes] -> targets
```

Where:
- `TYPE` is `>`, `?`, `!`, or `<`
- `id` is the node identifier
- `attributes` are type-specific
- `targets` are transition rules

### Question Attributes

```
? id Type* "question" "description"? [opts]? {config}?
```

- `Type*` - Type code with `*` suffix if required
- `"question"` - The question text
- `"description"` - Optional description
- `[opts]` - For choice types: `[A:val, B:val, ...]`
- `{config}` - Type-specific config: `{min:0, max:10}`

### Conditions (Branching)

```
-> target_id                    # Unconditional
-> target_id ?= value           # Equals
-> target_id ?>= value          # Greater or equal
-> target_id ?<= value          # Less or equal
-> target_id ?> value           # Greater than
-> target_id ?< value           # Less than
-> target_id ?in [a,b,c]        # In set
-> target_id ?contains value    # Contains
```

Multiple conditions create branches:

```
? nps Np* "Rate us" {0-10}
  -> promoter ?>= 9
  -> passive ?>= 7
  -> detractor ?<= 6
```

### Options Syntax

```
[opt1:value1, opt2:value2, ...]
```

Short form for simple labels:

```
[Yes, No, Maybe]  # Expands to [Yes:yes, No:no, Maybe:maybe]
```

## Example

NPS Survey in LiquidSurvey DSL:

```
nps-survey "Net Promoter Score Survey" "Simple NPS with branching"
---
> start "Welcome!" "Thank you for taking the time..."
  -> nps-question

? nps-question Np* "How likely to recommend?" "Rate 0-10" {0-10}
  -> promoter-q ?>= 9
  -> passive-q ?>= 7
  -> detractor-q ?<= 6

? promoter-q Tx "What do you love most?" "We'd love to know!"
  -> end

? passive-q Tx "What would make you rate higher?" "Help us improve"
  -> end

? detractor-q Tx "What went wrong?" "Please help us understand"
  -> detractor-issues

? detractor-issues Mc "Which issues?" "Select all" [
    "Poor customer service":customer-service,
    "Product quality":product-quality,
    "Pricing concerns":pricing,
    "Technical problems":technical,
    "Delivery issues":delivery,
    "Other":other
  ]
  -> end

< end "Thank you!" "We appreciate your feedback."
```

## Compression Metrics

Target compression ratios vs TypeScript schema:

| Metric              | Target  |
|---------------------|---------|
| Character count     | 10-20%  |
| Line count          | 30-50%  |
| Semantic density    | 3-5x    |

## Validation Rules

1. Exactly one start node (`>`)
2. At least one end node (`<`)
3. All nodes reachable from start
4. All paths lead to end
5. No orphan nodes
6. Valid question type codes
7. Required fields marked with `*`
