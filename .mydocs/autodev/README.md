# Triangulated Compiler Synthesis (TCS)

**Autonomous compiler development through LLM triangulation**

## Overview

TCS is a novel approach to compiler construction where:

1. **Multiple LLM agents generate semantically equivalent representations** (JSX, Schema, LiquidCode)
2. **Cross-validation reveals specification gaps** through disagreement
3. **The specification evolves** based on findings
4. **Compiler modules are built in parallel** and tested
5. **Failures are diagnosed and fixed** automatically
6. **Process repeats until convergence**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TRIANGULATED COMPILER SYNTHESIS                          │
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│   │    JSX      │◄──►│   Schema    │◄──►│ LiquidCode  │                    │
│   │  (UI Code)  │    │   (JSON)    │    │   (DSL)     │                    │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                    │
│          │                  │                  │                           │
│          └──────────────────┼──────────────────┘                           │
│                             │                                              │
│                             ▼                                              │
│                    ┌─────────────────┐                                     │
│                    │ Cross-Validate  │                                     │
│                    │    (Judge)      │                                     │
│                    └────────┬────────┘                                     │
│                             │                                              │
│              ┌──────────────┼──────────────┐                              │
│              ▼              ▼              ▼                              │
│         Consistent?    Findings      Evolve Spec                          │
│              │              │              │                              │
│              ▼              │              ▼                              │
│         Test Suite ◄────────┴────────► New Spec                           │
│              │                             │                              │
│              ▼                             ▼                              │
│      ┌───────────────────────────────────────────┐                        │
│      │           Build Compiler (Parallel)        │                        │
│      │  Scanner │ Parser │ Emitter │ Streaming   │                        │
│      └───────────────────────────────────────────┘                        │
│                             │                                              │
│                             ▼                                              │
│                    ┌─────────────────┐                                     │
│                    │   Run Tests     │                                     │
│                    └────────┬────────┘                                     │
│                             │                                              │
│              ┌──────────────┴──────────────┐                              │
│              ▼                             ▼                              │
│         All Pass?                    Diagnose & Fix                       │
│              │                             │                              │
│              ▼                             │                              │
│           SUCCESS ◄────────────────────────┘                              │
│                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
cd .mydocs/autodev
pnpm install
```

## Usage

### Full Synthesis

Run the complete autonomous compiler development workflow:

```bash
pnpm run synth
# or
npx tsx src/index.ts synthesize --spec ./specs/LIQUID-SPEC.md --output ./output
```

Options:
- `-s, --spec <path>` - Path to initial specification (default: `./specs/LIQUID-SPEC.md`)
- `-o, --output <dir>` - Output directory (default: `./output`)
- `-t, --tests <count>` - Target test count (default: `100`)
- `-i, --iterations <count>` - Max iterations (default: `50`)
- `-p, --parallel <count>` - Parallel samples per iteration (default: `10`)
- `-c, --checkpoint <interval>` - Checkpoint interval (default: `5`)
- `-r, --resume` - Resume from checkpoint

### Generate Sample

Generate a single sample for testing:

```bash
npx tsx src/index.ts sample --prompt "Create a sales dashboard with revenue KPIs"
```

### Validate Compiler

Test a compiled compiler against the test suite:

```bash
npx tsx src/index.ts validate --compiler ./output/compiler --tests ./output/test-suite.json
```

## Architecture

```
src/
├── index.ts           # CLI entry point
├── mastra.ts          # Mastra instance configuration
├── types/
│   └── index.ts       # Zod schemas and types
├── agents/
│   └── index.ts       # LLM agent definitions
├── steps/
│   ├── index.ts       # Step exports
│   ├── sample-generation.ts  # Parallel sample generation
│   ├── spec-evolution.ts     # Spec evolution steps
│   └── compiler-build.ts     # Parallel compiler building
├── workflows/
│   ├── index.ts       # Workflow exports
│   └── synthesis.ts   # Main synthesis workflow
└── utils/
    └── index.ts       # Utilities (parallel, retry, etc.)
```

## Agents

| Agent | Purpose |
|-------|---------|
| `jsx-generator` | Generates React JSX from prompts |
| `schema-extractor` | Extracts LiquidSchema from JSX |
| `liquidcode-writer` | Writes LiquidCode from Schema |
| `judge` | Cross-validates representations |
| `spec-evolver` | Evolves spec based on findings |
| `module-builder` | Builds compiler modules |
| `code-reviewer` | Reviews code for production quality |
| `reflector` | Diagnoses test failures |
| `prompt-generator` | Generates diverse prompts |

## Key Features

### Parallel Execution

- Sample generation runs in parallel batches
- Cross-validation runs in parallel
- Spec sections evolve in parallel
- Compiler modules build in parallel
- Module fixes apply in parallel

### Checkpoint & Resume

The workflow automatically checkpoints state and can resume from failures:

```bash
# If workflow fails or is interrupted
pnpm run synth --resume
```

### Self-Correcting

- Inconsistent samples reveal spec gaps
- Failed tests trigger diagnosis
- Low-quality code is refactored automatically
- Architecture flaws are detected and addressed

## Output

After successful synthesis:

```
output/
├── compiler/
│   ├── scanner.ts
│   ├── parser.ts
│   ├── emitter.ts
│   ├── streaming.ts
│   ├── react-adapter.ts
│   └── index.ts
├── LIQUID-SPEC-vN.md    # Evolved specification
├── test-suite.json      # Validated test cases
└── checkpoint.json      # Resume state
```

## Theory

### Why Triangulation Works

When three independent LLM generations of semantically equivalent content disagree, at least one is wrong. By requiring agreement across:

1. **JSX** (visual/structural)
2. **Schema** (structured data)
3. **LiquidCode** (compressed DSL)

We create a cross-validation system where errors in any single representation are caught by the others.

### Formal Definition

```
TRIANGULATED COMPILER SYNTHESIS (TCS)

Given:
  R = {R₁, R₂, R₃} = Representation set (JSX, Schema, LiquidCode)
  S = Specification
  C = Compiler

Process:
  1. Generate: ∀ prompt p, generate (r₁, r₂, r₃) ∈ R
  2. Validate: Check V(rᵢ, rⱼ) for semantic equivalence
  3. Evolve: If V fails, S' = evolve(S, findings)
  4. Build: C' = buildCompiler(S')
  5. Test: Run C'(r₃) against r₂
  6. Fix: If tests fail, diagnose and repair
  7. Repeat until convergence

Termination:
  |failures| = 0 ∧ |testSuite| ≥ threshold
```

## License

MIT
