# Platform Documentation

This folder contains permanent platform reference documentation for LiquidRender and Knosia.

## Purpose

- **Stable reference docs** - Long-term architecture and design documentation
- **Platform specs** - Technical specifications for platform components
- **Architecture guides** - System architecture and data flow documentation

## Current Documents

| Document | Description |
|----------|-------------|
| `knosia-architecture.md` | Complete Knosia platform architecture (26 tables, V1+V2) |

## vs. Other Documentation Folders

- `.docs/` - **Platform reference** (permanent, versioned)
- `.artifacts/` - Temporary outputs, reports, analysis
- `.context/` - TurboStarter framework documentation
- `.cognitive/` - AI agent rules, capabilities, cached wisdom
- `CLAUDE.md` - AI agent instructions and project guidelines
- `NEXT-STEPS.md` - Current work priorities and roadmap

## Adding New Documents

New platform documentation should:
1. Be stable reference material (not temporary analysis)
2. Include metadata: Location, Version, Status, Last Updated
3. Include a changelog for major updates
4. Be added to the table above
5. Be referenced in `CLAUDE.md` under "Deep References" if AI agents need it
