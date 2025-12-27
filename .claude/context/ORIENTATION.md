# ORIENTATION

## Identity

LiquidRender is a DSL-to-React rendering engine that compiles JSON specifications into interactive UI components.

## Cognitive Stance

Think of this as a **compiler pipeline**: DSL → AST → React. Every component is a render target, every style decision flows from design tokens. When in doubt, trace data flow from spec to screen.

## Structure

```
packages/liquid-render/
├── src/compiler/          → DSL parsing & AST generation
├── src/renderer/          → React component output
│   └── components/utils.ts → Design tokens (THE source of truth)
├── specs/LIQUID-RENDER-SPEC.md → DSL grammar & semantics
└── docs/COMPONENT-GUIDE.md → Component authoring patterns
```

## Constraints

- **NEVER** hardcode colors, spacing, or typography—use `utils.ts` tokens
- **NEVER** skip `data-liquid-type` attribute on component roots
- **NEVER** create components without both dynamic and static variants
- **NEVER** ignore empty/null state handling
- **NEVER** read `.archived/` without explicit permission

## Pointers

- **Building a component?** → Read `docs/COMPONENT-GUIDE.md` first
- **Changing DSL behavior?** → Check `specs/LIQUID-RENDER-SPEC.md` for grammar rules
- **Project decisions?** → `_bmad-output/` holds PRD, architecture, epics
