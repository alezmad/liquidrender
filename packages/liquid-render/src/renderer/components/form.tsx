// Form Component - Form container with validation and submission
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, baseStyles } from './utils';
import { useLiquidContext } from '../LiquidUI';

// ============================================================================
// Types
// ============================================================================

interface FormErrors {
  [field: string]: string | undefined;
}

interface FormValues {
  [field: string]: unknown;
}

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

// ============================================================================
// Context
// ============================================================================

const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error('useFormContext must be used within a Form component');
  }
  return ctx;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
  } as React.CSSProperties,

  fieldset: {
    border: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
  } as React.CSSProperties,

  legend: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    marginBottom: tokens.spacing.sm,
  } as React.CSSProperties,

  row: {
    display: 'flex',
    gap: tokens.spacing.md,
    flexWrap: 'wrap',
  } as React.CSSProperties,

  field: {
    flex: '1 1 200px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  required: {
    color: tokens.colors.error,
    marginLeft: '2px',
  } as React.CSSProperties,

  error: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.error,
  } as React.CSSProperties,

  actions: {
    display: 'flex',
    gap: tokens.spacing.sm,
    justifyContent: 'flex-end',
    marginTop: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
    borderTop: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,
};

// ============================================================================
// Main Component (Block-based)
// ============================================================================

export function Form({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const { signalActions } = useLiquidContext();

  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouchedState] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((field: string, value: unknown) => {
    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const setError = useCallback((field: string, error: string | undefined) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const setTouched = useCallback((field: string) => {
    setTouchedState(prev => new Set(prev).add(field));
  }, []);

  const isValid = useMemo(() => {
    return Object.values(errors).every(e => !e);
  }, [errors]);

  const contextValue: FormContextValue = useMemo(() => ({
    values,
    errors,
    touched,
    setValue,
    setError,
    setTouched,
    isSubmitting,
    isValid,
  }), [values, errors, touched, setValue, setError, setTouched, isSubmitting, isValid]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // Emit signal if configured
    const emitSignal = block.signals?.emit;
    if (emitSignal?.name) {
      signalActions.emit(emitSignal.name, JSON.stringify(values));
    }
  }, [block.signals, signalActions, values]);

  const label = block.label;

  return (
    <FormContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        style={styles.form}
        data-liquid-type="form"
      >
        {label && (
          <div style={styles.legend}>{label}</div>
        )}
        {children}
      </form>
    </FormContext.Provider>
  );
}

// ============================================================================
// Controlled Form
// ============================================================================

interface ControlledFormProps {
  children: React.ReactNode;
  initialValues?: FormValues;
  onSubmit?: (values: FormValues) => void | Promise<void>;
  validate?: (values: FormValues) => FormErrors;
  style?: React.CSSProperties;
}

export function ControlledForm({
  children,
  initialValues = {},
  onSubmit,
  validate,
  style: customStyle,
}: ControlledFormProps): React.ReactElement {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouchedState] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((field: string, value: unknown) => {
    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const setError = useCallback((field: string, error: string | undefined) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const setTouched = useCallback((field: string) => {
    setTouchedState(prev => new Set(prev).add(field));
  }, []);

  const isValid = useMemo(() => {
    return Object.values(errors).every(e => !e);
  }, [errors]);

  const contextValue: FormContextValue = useMemo(() => ({
    values,
    errors,
    touched,
    setValue,
    setError,
    setTouched,
    isSubmitting,
    isValid,
  }), [values, errors, touched, setValue, setError, setTouched, isSubmitting, isValid]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Run validation
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);

      if (Object.values(validationErrors).some(e => e)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit?.(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  return (
    <FormContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        style={mergeStyles(styles.form, customStyle)}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

// ============================================================================
// Form Field
// ============================================================================

interface FormFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  children: React.ReactElement;
  style?: React.CSSProperties;
}

export function FormField({
  name,
  label,
  required,
  children,
  style: customStyle,
}: FormFieldProps): React.ReactElement {
  const { errors, touched } = useFormContext();

  const error = touched.has(name) ? errors[name] : undefined;

  return (
    <div style={mergeStyles(styles.field, customStyle)}>
      {label && (
        <label style={styles.label}>
          {label}
          {required && <span style={styles.required}>*</span>}
        </label>
      )}
      {children}
      {error && (
        <span style={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Form Row (horizontal layout)
// ============================================================================

interface FormRowProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function FormRow({ children, style: customStyle }: FormRowProps): React.ReactElement {
  return (
    <div style={mergeStyles(styles.row, customStyle)}>
      {children}
    </div>
  );
}

// ============================================================================
// Form Actions (submit/cancel buttons area)
// ============================================================================

interface FormActionsProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function FormActions({ children, style: customStyle }: FormActionsProps): React.ReactElement {
  return (
    <div style={mergeStyles(styles.actions, customStyle)}>
      {children}
    </div>
  );
}

// ============================================================================
// useField Hook
// ============================================================================

interface UseFieldReturn {
  value: unknown;
  error: string | undefined;
  touched: boolean;
  onChange: (value: unknown) => void;
  onBlur: () => void;
}

export function useField(name: string): UseFieldReturn {
  const { values, errors, touched, setValue, setTouched } = useFormContext();

  return {
    value: values[name],
    error: touched.has(name) ? errors[name] : undefined,
    touched: touched.has(name),
    onChange: (value: unknown) => setValue(name, value),
    onBlur: () => setTouched(name),
  };
}

export default Form;
