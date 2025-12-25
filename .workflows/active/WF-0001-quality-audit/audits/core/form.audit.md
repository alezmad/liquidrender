---
component: Form
code: Fo
liquid_file: packages/liquid-render/src/renderer/components/form.tsx
shadcn_ref: form
auditor: A4-agent
date: 2025-12-25
scores:
  accessibility: 5
  api_design: 6
  design_tokens: 9
  features: 6
  testing: 0
  total: 26
priority: P1
---

# Audit: Form

## Component Info

| Attribute | Value |
|-----------|-------|
| liquid-render file | `packages/liquid-render/src/renderer/components/form.tsx` |
| shadcn reference | `form` |
| DSL code | `Fo` |

---

## 1. Accessibility (0-10)

### Checklist
- [ ] ARIA attributes present and correct
- [x] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Focus management correct (focus trap for modals, focus ring visible)
- [ ] Works with screen readers (tested with VoiceOver/NVDA)
- [ ] Color contrast meets WCAG AA

### Findings

**Positive:**
- Error messages use `role="alert"` (line 294), which is good for screen reader announcements
- Required fields display visual indicator (`*`)
- Labels are present and styled

**Issues:**
1. **Missing label-input association**: The `FormField` component does not use `htmlFor`/`id` associations between labels and form controls. The label element does not have a `htmlFor` attribute connecting it to the input.

2. **Missing aria-describedby**: Error messages are not linked to inputs via `aria-describedby`, so screen readers won't announce the error when focusing the field.

3. **Missing aria-invalid**: Form fields with errors don't have `aria-invalid="true"` set on the input elements.

4. **No aria-required**: Required fields lack `aria-required="true"` attribute.

5. **No FormDescription equivalent**: shadcn provides `FormDescription` for additional field context linked via `aria-describedby`. liquid-render lacks this.

### shadcn Comparison

shadcn's form implementation provides comprehensive accessibility:
```typescript
// FormControl wraps inputs with proper ARIA
<Slot
  id={formItemId}
  aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
  aria-invalid={!!error}
  {...props}
/>

// FormLabel properly associates with input
<Label htmlFor={formItemId} {...props} />

// FormMessage provides ID for aria-describedby
<p id={formMessageId} className="text-destructive text-sm">
  {error?.message}
</p>
```

### Score: 5/10

---

## 2. API Design (0-10)

### Checklist
- [x] Props naming matches shadcn patterns (variant, size, disabled, etc.)
- [ ] Consistent variants across components
- [x] Supports both controlled and uncontrolled modes
- [x] TypeScript types are complete and exported
- [x] Default props are sensible

### Current Props

```typescript
// Block-based Form (DSL-driven)
interface Form {
  block: Block;
  data: DataContext;
  children?: React.ReactNode;
}

// ControlledForm (standalone)
interface ControlledFormProps {
  children: React.ReactNode;
  initialValues?: FormValues;
  onSubmit?: (values: FormValues) => void | Promise<void>;
  validate?: (values: FormValues) => FormErrors;
  style?: React.CSSProperties;
}

// FormField
interface FormFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  children: React.ReactElement;
  style?: React.CSSProperties;
}

// Context
interface FormContextValue {
  values: FormValues;
  errors: FormErrors;
  touched: Set<string>;
  setValue: (field: string, value: unknown) => void;
  setError: (field: string, error: string | undefined) => void;
  setTouched: (field: string) => void;
  isSubmitting: boolean;
  isValid: boolean;
}
```

### shadcn Props

```typescript
// shadcn Form is just FormProvider from react-hook-form
const Form = FormProvider;

// FormField uses Controller from react-hook-form
type FormFieldProps<TFieldValues, TName> = ControllerProps<TFieldValues, TName>;

// useFormField returns
{
  id: string;
  name: string;
  formItemId: string;
  formDescriptionId: string;
  formMessageId: string;
  ...fieldState; // error, invalid, isDirty, isTouched, etc.
}
```

### Gaps

1. **No react-hook-form integration**: shadcn builds on react-hook-form for robust validation and state management. liquid-render has custom implementation that lacks features like:
   - Schema validation (zod, yup)
   - Field arrays
   - Watch/subscribe to specific fields
   - Form reset with specific values
   - Dirty/pristine tracking

2. **Missing `FormDescription` component**: For accessible field hints.

3. **Missing `FormControl` wrapper**: For proper ARIA slot injection.

4. **No generic type support**: shadcn uses TypeScript generics for type-safe field names. liquid-render uses loose `string` keys.

5. **No `data-slot` attributes**: shadcn uses `data-slot` for styling hooks. liquid-render only has `data-liquid-type` on the form.

### Score: 6/10

---

## 3. Design Tokens (0-10)

### Checklist
- [x] Uses `tokens.colors.*` (no hardcoded colors)
- [x] Uses `tokens.spacing.*` (no hardcoded px values for spacing)
- [x] Uses `tokens.radius.*` (no hardcoded border-radius)
- [x] Uses `tokens.fontSize.*` (no hardcoded font sizes)
- [ ] Uses `tokens.shadow.*` (no hardcoded box-shadows)

### Violations Found

```typescript
// Line 91: Hardcoded margin pixel value
required: {
  color: tokens.colors.error,
  marginLeft: '2px',  // Should use tokens.spacing.xs or similar
},

// Line 78: Hardcoded flex-basis pixel value
field: {
  flex: '1 1 200px',  // 200px is hardcoded
  ...
},
```

### Token Compliance

The component properly uses tokens for:
- All colors (`tokens.colors.foreground`, `tokens.colors.error`, `tokens.colors.border`)
- Most spacing values (`tokens.spacing.md`, `tokens.spacing.sm`, `tokens.spacing.xs`)
- Font sizes (`tokens.fontSize.lg`, `tokens.fontSize.sm`, `tokens.fontSize.xs`)
- Font weights (`tokens.fontWeight.semibold`, `tokens.fontWeight.medium`)

Minor violations exist but overall excellent token usage.

### Score: 9/10

---

## 4. Features (0-10)

### liquid-render Features
- [x] Form context provider for child field access
- [x] Value state management
- [x] Error state management
- [x] Touched state tracking
- [x] Submission handling with async support
- [x] Custom validation function support
- [x] Signal emission on submit (DSL integration)
- [x] `useField` hook for custom field integration
- [x] `FormField` wrapper with label/error display
- [x] `FormRow` for horizontal layout
- [x] `FormActions` for button area
- [x] Both block-based and controlled variants

### shadcn Features
- [x] Built on react-hook-form (industry standard)
- [x] Schema validation integration (zod)
- [x] `FormItem` context for unique IDs
- [x] `FormLabel` with error-aware styling
- [x] `FormControl` with ARIA injection
- [x] `FormDescription` for field hints
- [x] `FormMessage` for error/validation messages
- [x] `useFormField` hook with full field state
- [ ] FormRow layout (not present - composable)
- [ ] FormActions (not present - composable)

### Gap Analysis

| Feature | liquid-render | shadcn | Priority |
|---------|---------------|--------|----------|
| Context-based form state | Yes | Yes (react-hook-form) | - |
| Field label/error display | Yes | Yes | - |
| Schema validation (zod) | No | Yes | P1 |
| Form description/hints | No | Yes | P1 |
| Unique ID generation per field | No | Yes (useId) | P1 |
| aria-describedby linking | No | Yes | P0 |
| aria-invalid on error | No | Yes | P0 |
| Field arrays | No | Yes | P2 |
| Watch/subscribe fields | No | Yes | P2 |
| Form reset | No | Yes | P1 |
| Dirty/pristine tracking | No | Yes | P2 |
| Row/Actions layout helpers | Yes | No (composable) | - |

### Score: 6/10

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
- Tests file: **none**
- Test count: 0
- Coverage: 0%

### Missing Tests

1. **Form rendering**: Basic form renders with children
2. **Form submission**: onSubmit is called with correct values
3. **Validation**: validate function runs and sets errors
4. **Error display**: Errors show after field is touched
5. **Required field indicator**: Asterisk shows for required fields
6. **useField hook**: Returns correct value, error, touched state
7. **FormContext**: Throws error when used outside Form
8. **Signal emission**: Block-based form emits signals on submit
9. **isSubmitting state**: Disables form during async submission
10. **ControlledForm vs Form**: Both variants work correctly
11. **Accessibility**: role="alert" on error messages
12. **FormRow layout**: Children render in row
13. **FormActions layout**: Children render with proper styling

### Score: 0/10

---

## Overall Score: 26/50

| Category | Score | Weight | Notes |
|----------|-------|--------|-------|
| Accessibility | 5/10 | High | Missing label-input association, aria-describedby, aria-invalid |
| API Design | 6/10 | Medium | Good structure but lacks react-hook-form integration |
| Design Tokens | 9/10 | Medium | Excellent - only 2 minor hardcoded values |
| Features | 6/10 | Low | Core features present, missing schema validation |
| Testing | 0/10 | Medium | No tests exist |
| **Total** | **26/50** | | |

---

## Recommendations

### P0 - Critical (Blocks Release)

1. **Add label-input association**: Use `htmlFor` on labels and `id` on inputs
   ```tsx
   const fieldId = generateId('field');
   <label htmlFor={fieldId} style={styles.label}>
     {label}
   </label>
   {React.cloneElement(children, { id: fieldId })}
   ```

2. **Add aria-describedby for errors**: Link error messages to inputs
   ```tsx
   const errorId = `${fieldId}-error`;
   {React.cloneElement(children, {
     id: fieldId,
     'aria-describedby': error ? errorId : undefined,
     'aria-invalid': !!error,
   })}
   {error && <span id={errorId} role="alert">{error}</span>}
   ```

3. **Add aria-required**: For required fields
   ```tsx
   {React.cloneElement(children, {
     'aria-required': required,
   })}
   ```

### P1 - Important (Next Sprint)

1. **Add FormDescription component**: For accessible field hints
   ```tsx
   interface FormDescriptionProps {
     children: React.ReactNode;
   }
   export function FormDescription({ children }: FormDescriptionProps) {
     // Use context to get description ID, link via aria-describedby
   }
   ```

2. **Add FormControl wrapper**: For ARIA attribute injection
   ```tsx
   export function FormControl({ children }: { children: React.ReactElement }) {
     const { fieldId, errorId, descriptionId, hasError } = useFieldContext();
     return React.cloneElement(children, {
       id: fieldId,
       'aria-describedby': [descriptionId, hasError && errorId].filter(Boolean).join(' '),
       'aria-invalid': hasError,
     });
   }
   ```

3. **Add data-liquid-type to sub-components**: For consistent testing/styling
   ```tsx
   <div data-liquid-type="form-field" style={styles.field}>
   <div data-liquid-type="form-row" style={styles.row}>
   <div data-liquid-type="form-actions" style={styles.actions}>
   ```

4. **Replace hardcoded values**:
   - `marginLeft: '2px'` -> `marginLeft: tokens.spacing.xs` or create `tokens.spacing.xxs`
   - `flex: '1 1 200px'` -> Consider a design token for min field width

5. **Add basic test suite**: Create `tests/form.test.ts` with at least 8-10 tests

### P2 - Nice to Have (Backlog)

1. **Consider react-hook-form integration**: Would provide schema validation, field arrays, watch, and more
2. **Add dirty/pristine tracking**: Useful for "unsaved changes" warnings
3. **Add field arrays support**: For dynamic form fields
4. **Add form reset functionality**: `resetForm(values?)` method

---

## Action Items for WF-0002

- [ ] Fix accessibility: Add htmlFor/id association in FormField
- [ ] Fix accessibility: Add aria-describedby linking for errors
- [ ] Fix accessibility: Add aria-invalid and aria-required
- [ ] Add FormDescription component
- [ ] Add FormControl wrapper component
- [ ] Replace hardcoded `marginLeft: '2px'` with token
- [ ] Add data-liquid-type to FormField, FormRow, FormActions
- [ ] Create tests/form.test.ts with comprehensive test suite
