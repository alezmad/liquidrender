# Context Loading Workflow

This diagram shows how an AI agent builds context when starting a task.

```mermaid
flowchart TD
    subgraph Entry["🚀 Entry Point"]
        A[Agent Starts] --> B["/CLAUDE.md<br/>(root)"]
    end

    subgraph Hub["📍 Context Hub"]
        B -->|"After reading"| C[".context/CLAUDE.md<br/>(hub)"]
    end

    subgraph Sources["📚 Two Complementary Sources"]
        C --> D{What type<br/>of task?}

        D -->|"Implementation"| E["_bmad-output/<br/>WHAT + HOW"]
        D -->|"Using framework"| F["turbostarter-framework-context/<br/>FOUNDATION"]
        D -->|"Both needed"| G[Read both]

        G --> E
        G --> F
    end

    subgraph BMAD["📋 BMAD Output (Project Decisions)"]
        E --> E1[Read folder structure]
        E1 --> E2[Read first-level docs<br/>PRD, Architecture]
        E2 -->|"If needed"| E3[Read deeper<br/>Epics, Stories]
    end

    subgraph Framework["🏗️ Framework Context"]
        F --> F1[Check index.md<br/>for keywords]
        F1 -->|"Feature exists?"| F2{Reuse or<br/>extend?}
        F2 -->|"Yes"| F3[Read specific<br/>section docs]
        F2 -->|"No"| F4[Build new<br/>following patterns]
    end

    subgraph Skills["⚡ Skills (Model-Invoked)"]
        C -.->|"Auto-discovered"| S[".context/skills/"]
        S --> S1["public/<br/>Production skills"]
        S --> S2["examples/<br/>Experimental skills"]
    end

    subgraph Execute["✅ Execute Task"]
        E3 --> X[Implement with<br/>full context]
        F3 --> X
        F4 --> X
    end

    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#fff3e0
    style E fill:#e8f5e9
    style F fill:#fce4ec
    style X fill:#c8e6c9
    style S fill:#f3e5f5
```

## Reading Order Summary

```mermaid
flowchart LR
    A["CLAUDE.md<br/>(root)"] --> B[".context/CLAUDE.md<br/>(hub)"]
    B --> C["_bmad-output/<br/>(project)"]
    B --> D["framework-context/<br/>(foundation)"]
    B -.-> E["skills/<br/>(auto)"]

    style A fill:#fff3e0
    style B fill:#fff3e0
    style C fill:#e8f5e9
    style D fill:#fce4ec
    style E fill:#f3e5f5
```

## Conflict Resolution

```mermaid
flowchart TD
    U["👤 User instruction"] --> R["CLAUDE.md (root)"]
    R --> H[".context/CLAUDE.md (hub)"]
    H --> B["_bmad-output/"]
    B --> F["Framework docs"]

    U ---|"Highest priority"| U
    F ---|"Lowest priority"| F

    style U fill:#ffcdd2
    style R fill:#fff3e0
    style H fill:#fff3e0
    style B fill:#e8f5e9
    style F fill:#fce4ec
```

## Key Directives

| Location | Directive |
|----------|-----------|
| Root CLAUDE.md | "After reading this file, read `.context/CLAUDE.md`" |
| .context/CLAUDE.md | "Read `_bmad-output/` folder structure + first-level docs" |
| .context/CLAUDE.md | "Check `index.md` before implementing - reuse or extend" |
| _bmad-output/CLAUDE.md | "For full context, read `.context/CLAUDE.md`" |
