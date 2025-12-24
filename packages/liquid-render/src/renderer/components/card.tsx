// Card Component - Content container with optional header/footer
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, baseStyles } from './utils';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  card: cardStyles({
    overflow: 'hidden',
  }),

  header: {
    padding: tokens.spacing.md,
    borderBottom: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  title: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    margin: 0,
  } as React.CSSProperties,

  description: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    marginTop: tokens.spacing.xs,
  } as React.CSSProperties,

  content: {
    padding: tokens.spacing.md,
  } as React.CSSProperties,

  footer: {
    padding: tokens.spacing.md,
    borderTop: `1px solid ${tokens.colors.border}`,
    backgroundColor: tokens.colors.muted,
  } as React.CSSProperties,
};

// ============================================================================
// Main Component (Block-based)
// ============================================================================

export function Card({ block, data, children }: LiquidComponentProps): React.ReactElement {
  const label = block.label || '';
  const hasTitle = Boolean(label);

  return (
    <div data-liquid-type="card" style={styles.card}>
      {hasTitle && (
        <div style={styles.header}>
          <h3 style={styles.title}>{label}</h3>
        </div>
      )}
      <div style={styles.content}>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Static Card Components (Composition Pattern - shadcn style)
// ============================================================================

interface CardRootProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function CardRoot({ children, style: customStyle }: CardRootProps): React.ReactElement {
  return (
    <div style={mergeStyles(styles.card, customStyle)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function CardHeader({ children, style: customStyle }: CardHeaderProps): React.ReactElement {
  return (
    <div style={mergeStyles(styles.header, customStyle)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  style?: React.CSSProperties;
}

export function CardTitle({
  children,
  as: Element = 'h3',
  style: customStyle
}: CardTitleProps): React.ReactElement {
  return (
    <Element style={mergeStyles(styles.title, customStyle)}>
      {children}
    </Element>
  );
}

interface CardDescriptionProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function CardDescription({ children, style: customStyle }: CardDescriptionProps): React.ReactElement {
  return (
    <p style={mergeStyles(styles.description, customStyle)}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function CardContent({ children, style: customStyle }: CardContentProps): React.ReactElement {
  return (
    <div style={mergeStyles(styles.content, customStyle)}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function CardFooter({ children, style: customStyle }: CardFooterProps): React.ReactElement {
  return (
    <div style={mergeStyles(styles.footer, customStyle)}>
      {children}
    </div>
  );
}

// ============================================================================
// Convenience Component
// ============================================================================

interface SimpleCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}

export function SimpleCard({
  title,
  description,
  children,
  footer,
  style: customStyle,
}: SimpleCardProps): React.ReactElement {
  return (
    <CardRoot style={customStyle}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </CardRoot>
  );
}

export default Card;
