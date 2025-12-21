import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import { Uniwind } from "uniwind";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { ThemeMode, themes } from "@turbostarter/ui";

import { appConfig } from "~/config/app";

import type { ColorVariable, ThemeConfig } from "@turbostarter/ui";

const useThemeConfig = create<{
  config: ThemeConfig;
  setConfig: (config: ThemeConfig) => void;
}>()(
  persist(
    (set) => ({
      config: appConfig.theme,
      setConfig: (config) => set({ config }),
    }),
    {
      name: "theme-config",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const { config, setConfig } = useThemeConfig();

  const isDark = useMemo(
    () =>
      config.mode === ThemeMode.DARK ||
      (config.mode === ThemeMode.SYSTEM && colorScheme === ThemeMode.DARK),
    [config.mode, colorScheme],
  );

  const resolvedTheme = useMemo(
    () => (isDark ? ThemeMode.DARK : ThemeMode.LIGHT),
    [isDark],
  );

  const updateTheme = useCallback(() => {
    Uniwind.setTheme(config.mode);

    const colors = themes[config.color][resolvedTheme];
    Uniwind.updateCSSVariables(
      resolvedTheme,
      Object.entries(colors).reduce(
        (acc, [key, value]: [string, ColorVariable]) => {
          const [l, c, h, a] = value;
          acc[`--${key}`] =
            a !== undefined
              ? `oklch(${l} ${c} ${h} / ${a * 100}%)`
              : `oklch(${l} ${c} ${h})`;
          return acc;
        },
        {} as Record<string, string>,
      ),
    );
  }, [resolvedTheme, config]);

  useEffect(() => {
    updateTheme();
  }, [updateTheme]);

  return {
    config,
    setConfig,
    resolvedTheme,
  };
};
