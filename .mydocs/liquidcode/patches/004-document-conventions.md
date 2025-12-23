# Patch 004: Document Conventions

**Status:** Draft
**Target Section:** §0.1 (new section before Section 1)
**Insert Position:** After Table of Contents, before Executive Summary
**Date:** 2025-12-22

---

## §0.1 Document Conventions

### 0.1.1 Normative Keywords

This specification uses normative keywords as defined in RFC 2119 to indicate requirement levels:

| Keyword | Meaning |
|---------|---------|
| **MUST** | Absolute requirement. Implementations cannot claim compliance without this. |
| **MUST NOT** | Absolute prohibition. Implementations cannot claim compliance if they include this. |
| **REQUIRED** | Synonym for MUST. Indicates mandatory implementation. |
| **SHALL** | Synonym for MUST. Used in formal specifications. |
| **SHALL NOT** | Synonym for MUST NOT. Indicates forbidden behavior. |
| **SHOULD** | Strong recommendation. May be ignored with valid justification. |
| **SHOULD NOT** | Strong discouragement. May be included with valid justification. |
| **RECOMMENDED** | Synonym for SHOULD. Indicates best practice. |
| **MAY** | Optional feature. Implementation choice without compliance impact. |
| **OPTIONAL** | Synonym for MAY. Feature can be omitted. |

**Example Usage:**
- "Parsers MUST reject invalid block type codes" (mandatory)
- "Renderers SHOULD implement smooth animations" (recommended but not required)
- "Implementations MAY cache LiquidSchema results" (optional optimization)

### 0.1.2 Document Layers

This specification is organized into three distinct layers with different normative weights:

| Layer | Sections | Purpose | Implementation Requirement |
|-------|----------|---------|---------------------------|
| **Normative Core** | §5-10, §12-14, §17-22 | Defines syntax, semantics, and required behavior | MUST implement for compliance |
| **Reference Algorithms** | §11, §15, §16 | Provides working algorithms that MAY be replaced | SHOULD implement or provide equivalent |
| **Philosophy** | §1-4, §23-24 | Establishes design rationale and guidance | Informative only, not required |

**Layer Descriptions:**

#### Normative Core
Contains the mandatory specification elements:
- **§5 LiquidCode Language** - Core syntax and structure
- **§6 Grammar & Syntax** - Parsing rules and character handling
- **§7 LiquidSchema** - Required output format
- **§8 Block Addressing** - Address resolution rules
- **§9 Binding System** - Data binding semantics
- **§10 Signal System** - Event handling specification
- **§12 Mutation System** - State modification rules
- **§13 Query System** - Data retrieval specification
- **§14 State Management** - State semantics and lifecycle
- **§17 Rendering System** - Visual output requirements
- **§18 Block Definitions** - Block behavior specifications
- **§19 Event System** - User interaction handling
- **§20 Validation Rules** - Error detection requirements
- **§21 Error Handling** - Error reporting standards
- **§22 Extensibility** - Plugin and extension mechanisms

Implementations MUST conform to all normative core specifications to claim LiquidCode v2.1 compliance.

#### Reference Algorithms
Provides concrete algorithms that demonstrate correct behavior:
- **§11 Layout System** - Constraint solver and grid algorithms
- **§15 Reactivity Engine** - Dependency tracking and update propagation
- **§16 Performance Optimization** - Caching and rendering strategies

Implementations MAY use alternative algorithms if they produce equivalent results and maintain the same semantic guarantees. Reference algorithms serve as correctness proofs.

#### Philosophy
Provides context and design rationale:
- **§1 Executive Summary** - Overview and claims
- **§2 Core Philosophy** - Design principles
- **§3 Architecture Overview** - System design
- **§4 Archetypes** - Pattern library
- **§23 Best Practices** - Usage guidance
- **§24 Future Directions** - Evolution roadmap

Philosophy sections are informative only. They guide implementation decisions but do not impose requirements.

### 0.1.3 Minimum Compliance Profile (v2.1 MVP)

To achieve LiquidCode v2.1 compliance, an implementation MUST support:

#### Required Block Types
At minimum, implementations MUST support these block types:
- **Container Blocks**: `row`, `col`, `grid`, `stack`
- **Display Blocks**: `text`, `label`, `badge`, `icon`
- **Input Blocks**: `input`, `textarea`, `select`, `checkbox`, `radio`, `switch`
- **Action Blocks**: `button`
- **Data Blocks**: `list`, `item`
- **Structural Blocks**: `card`, `panel`, `divider`, `spacer`

Total minimum block type count: **18 block types**

#### Required Features
Implementations MUST support:

1. **Core Syntax** (§5-6)
   - Block declarations with type codes
   - Label syntax and text content
   - Attribute binding (all forms in §6.2)
   - Nesting and hierarchy

2. **Binding System** (§9)
   - Basic field binding (`@binding="field"`)
   - Dotted path access (`@binding="user.profile.name"`)
   - Collection binding (`*items` and iteration)
   - Filter conditions (§9.6)
   - Sort specifications (§9.7)
   - Limit/pagination (§9.8)

3. **Signal System** (§10)
   - Signal declaration (`>signal`)
   - Signal emission (`~signal`)
   - Signal receiving (`:signal`)
   - At least one signal type: `click` (user events)

4. **Mutation System** (§12)
   - Set operations (`!set field=value`)
   - Increment operations (`!inc counter`)
   - Toggle operations (`!toggle flag`)

5. **Layout System** (§11)
   - Grid-based positioning
   - Priority-based layout resolution
   - Responsive breakpoints (mobile, tablet, desktop)
   - Basic flex properties (flex, span)

6. **State Management** (§14)
   - Local state initialization
   - Reactive updates on state changes
   - State isolation per block instance

7. **Validation** (§20)
   - Syntax error detection
   - Invalid block type rejection
   - Binding reference validation

8. **Error Handling** (§21)
   - Error messages with line/column information
   - Graceful degradation for runtime errors

#### Optional Features
Implementations MAY defer these features for post-MVP:

- **Advanced Block Types**: `table`, `tabs`, `modal`, `drawer`, `chart`, `image`, `video`, `audio`, `progress`, `slider`, `date`, `time`, `color`, `file`, `rich`, `code`, `markdown`, `canvas`, `form`
- **Advanced Bindings**: Computed bindings (§9.3.4), multi-field bindings (§9.3.2)
- **Query System**: Full §13 query capabilities (SELECT/FROM/WHERE)
- **Derived Fields**: §9.9 computed field definitions
- **Advanced Signals**: Lifecycle signals, custom signal types
- **Performance Features**: §16 optimizations (memoization, virtual scrolling)
- **Extensibility**: §22 plugin system

#### Compliance Testing
To verify compliance, implementations SHOULD:
1. Parse and render all examples in normative core sections
2. Pass the LiquidCode v2.1 test suite (when published)
3. Produce valid LiquidSchema output for valid LiquidCode input
4. Report errors for invalid LiquidCode input per §21

#### Version Compatibility
- v2.1 implementations MUST accept v2.0 LiquidCode (backward compatible)
- v2.1 implementations MAY warn on deprecated v2.0 features
- v2.1 LiquidCode MAY NOT render correctly on v2.0 implementations (forward compatibility not guaranteed)

### 0.1.4 Specification Interpretation

When interpreting this specification:

1. **Precedence Rules**
   - Explicit normative statements override examples
   - Later sections clarify but do not contradict earlier sections
   - Specific rules override general principles

2. **Example Status**
   - Code examples are illustrative unless marked as normative
   - Examples demonstrate correct usage but are not exhaustive
   - Implementations MUST support the patterns shown in examples

3. **Algorithm Pseudocode**
   - Pseudocode is normative for behavior, not implementation
   - Alternative algorithms are permitted if semantically equivalent
   - Edge cases in pseudocode MUST be handled

4. **Undefined Behavior**
   - Behavior not specified is implementation-defined
   - Implementations SHOULD document extension behavior
   - Extensions MUST NOT conflict with specified behavior

5. **Ambiguity Resolution**
   - If ambiguity exists, contact specification authors
   - Implementations SHOULD choose the most restrictive interpretation
   - Future versions will clarify ambiguities

### 0.1.5 Document Organization

This specification follows a layered learning path:

**Part 1: Foundation & Philosophy** (§1-10)
- Introduces core concepts and philosophy
- Defines syntax and basic systems
- Suitable for initial learning

**Part 2: Core Systems** (§11-16)
- Details layout, reactivity, and performance
- Deep dives into algorithmic components
- Reference material for implementers

**Part 3: Implementation Guide** (§17-22)
- Covers rendering, validation, and extensibility
- Practical implementation guidance
- Required reading for developers

**Part 4: Guidance & Evolution** (§23-24)
- Best practices and future directions
- Informative material
- Guides ecosystem development

### 0.1.6 Notation Conventions

Throughout this document:

- **Inline code**: `row`, `@binding`, `>signal` - Literal LiquidCode syntax
- **Variables**: `<blockId>`, `<fieldName>` - Placeholder values
- **Optional**: `[parameter]` - Optional syntax elements
- **Alternatives**: `option1 | option2` - Mutually exclusive choices
- **Repetition**: `item...` - Zero or more repetitions
- **Grouping**: `(group)` - Grouped elements

**Grammar Notation:**
```
BlockDeclaration ::= BlockType [Label] [Attributes] [Body]
BlockType        ::= <typeCode>
Label            ::= <text>
Attributes       ::= Attribute...
Body             ::= '{' Block... '}'
```

### 0.1.7 Terminology

**Consistent terms used throughout:**

- **Block**: A single UI element defined in LiquidCode
- **Component**: Synonym for block (interchangeable)
- **Binding**: Connection between a block and data source
- **Signal**: Event or message emitted by a block
- **Mutation**: State modification operation
- **Query**: Data retrieval operation
- **Archetype**: Pre-configured block pattern
- **LiquidSchema**: JSON output format produced by parser
- **LiquidCode**: The source language (this specification)
- **Renderer**: System that converts LiquidSchema to UI
- **Parser**: System that converts LiquidCode to LiquidSchema

---

## Integration Notes

**Position:** Insert after current Table of Contents and before "## 1. Executive Summary"

**Table of Contents Update:** Add to Front Matter section:
```markdown
### Front Matter
- [Document Information](#document-information)
- [Document Conventions](#01-document-conventions)  ← NEW
  - 0.1.1 Normative Keywords
  - 0.1.2 Document Layers
  - 0.1.3 Minimum Compliance Profile
  - 0.1.4 Specification Interpretation
  - 0.1.5 Document Organization
  - 0.1.6 Notation Conventions
  - 0.1.7 Terminology
- [Change Log](#change-log)
```

**Change Log Entry:**
```markdown
### v2.1.0 (2025-12-22)
- Added §0.1 Document Conventions (Patch 004)
  - RFC 2119 normative keywords
  - Document layer definitions
  - Minimum compliance profile for MVP
  - Specification interpretation guidelines
```

**Cross-Reference Updates:**
- Reference §0.1.1 when using normative keywords (MUST, SHOULD, MAY)
- Reference §0.1.3 when discussing MVP scope decisions
- Reference §0.1.2 when distinguishing required vs. recommended features

---

## Rationale

This patch establishes critical meta-documentation that:

1. **Clarifies Requirements**: Normative keywords remove ambiguity about what's required vs. optional
2. **Enables Phased Development**: MVP profile allows teams to build incrementally while maintaining compliance
3. **Prevents Scope Creep**: Clear document layers separate "nice to have" philosophy from "must have" implementation
4. **Improves Interoperability**: Compliance profile ensures different implementations can work together
5. **Facilitates Review**: Reviewers know where to focus (normative core) vs. skim (philosophy)

The MVP profile targets ~18 block types and core features, making v2.1 achievable while leaving room for future expansion.
