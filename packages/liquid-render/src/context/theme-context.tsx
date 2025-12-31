"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LiquidTheme } from "../types/theme";
import { defaultTheme } from "../themes/default";

interface ThemeContextValue {
  theme: LiquidTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface LiquidProviderProps {
  theme?: LiquidTheme;
  children: ReactNode;
}

export function LiquidProvider({ theme, children }: LiquidProviderProps) {
  const value: ThemeContextValue = {
    theme: theme ?? defaultTheme,
  };
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useLiquidTheme(): LiquidTheme {
  const context = useContext(ThemeContext);
  if (!context) {
    return defaultTheme;
  }
  return context.theme;
}

export function useLiquidComponent(type: string) {
  const theme = useLiquidTheme();
  return theme.components[type] ?? theme.fallback ?? null;
}
