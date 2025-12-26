---
component: ComponentName
code: Xx
liquid_file: path/to/component.tsx
shadcn_ref: shadcn-component-name
auditor: agent
date: 2025-12-25
scores:
  accessibility: 0
  api_design: 0
  design_tokens: 0
  features: 0
  testing: 0
  total: 0
priority: P2
---

# Audit: [ComponentName]

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `[path]` |
| shadcn reference | `[name]` |
| DSL code | `[Xx]` |

---

## 1. Accessibility (0-10)

### Checklist
- [ ] ARIA attributes present and correct
- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Focus management correct (focus trap for modals, focus ring visible)
- [ ] Works with screen readers (tested with VoiceOver/NVDA)
- [ ] Color contrast meets WCAG AA

### Findings
[Describe what was found]

### shadcn Comparison
[How does shadcn handle this?]

### Score: __/10

---

## 2. API Design (0-10)

### Checklist
- [ ] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [ ] Consistent variants across components
- [ ] Supports both controlled and uncontrolled modes
- [ ] TypeScript types are complete and exported
- [ ] Default props are sensible

### Current Props
```typescript
// List current props interface
```

### shadcn Props
```typescript
// List shadcn props for comparison
```

### Gaps
[List missing or inconsistent props]

### Score: __/10

---

## 3. Design Tokens (0-10)

### Checklist
- [ ] Uses `tokens.colors.*` (no hardcoded colors)
- [ ] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [ ] Uses `tokens.radius.*` (no hardcoded border-radius)
- [ ] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [ ] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Violations Found
```typescript
// List any hardcoded values found
```

### Score: __/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Feature 1
- [x] Feature 2
- [ ] Missing feature

### shadcn Features
- [x] Feature 1
- [x] Feature 2
- [x] Feature 3 (we don't have)

### Gap Analysis
| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Feature 1 | ✅ | ✅ | - |
| Feature 2 | ❌ | ✅ | P1 |

### Score: __/10

---

## 5. Testing (0-10)

### Checklist
- [ ] Unit tests exist
- [ ] Covers happy path
- [ ] Covers edge cases (null, empty, overflow)
- [ ] Covers error states
- [ ] Accessibility tests (if applicable)
- [ ] Snapshot tests (if applicable)

### Current Test Coverage
- Tests file: `[path or "none"]`
- Test count: [N]
- Coverage: [%]

### Missing Tests
[List what should be tested but isn't]

### Score: __/10

---

## Overall Score: __/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | /10 | High | |
| API Design | /10 | Medium | |
| Design Tokens | /10 | Medium | |
| Features | /10 | Low | |
| Testing | /10 | Medium | |
| **Total** | **/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)
1. [Issue]: [Recommended fix]

### P1 - Important (Next Sprint)
1. [Issue]: [Recommended fix]

### P2 - Nice to Have (Backlog)
1. [Issue]: [Recommended fix]

---

## Action Items for WF-0002

- [ ] [Specific task 1]
- [ ] [Specific task 2]
