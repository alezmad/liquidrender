// TurboStarter Theme - Placeholder
// Full implementation requires @turbostarter/ui-web components
// See .artifacts/2025-12-30-liquid-theme-turbostarter.md for reference

import type { LiquidTheme } from "../../types/theme";
import { mergeThemes } from "../../types/theme";
import { defaultTheme } from "../../themes/default";

/**
 * TurboStarter theme placeholder
 *
 * This theme will map Liquid blocks to TurboStarter UI components.
 * Currently extends defaultTheme as a foundation.
 *
 * Full implementation will include:
 * - Button adapter with variant mapping
 * - Card adapter with header/content/footer structure
 * - Input adapters for form components
 * - Table adapter with sorting/pagination
 * - Chart adapters using Recharts (already in TurboStarter)
 *
 * @example
 * ```tsx
 * import { turbostarterTheme } from '@repo/liquid-render';
 *
 * <LiquidProvider theme={turbostarterTheme}>
 *   <LiquidUI schema={schema} data={data} />
 * </LiquidProvider>
 * ```
 */
export const turbostarterTheme: LiquidTheme = mergeThemes(defaultTheme, {
  name: "turbostarter",
  version: "0.1.0",
  // Component overrides will be added here
  // components: {
  //   button: { component: TurboButton, mapProps: buttonMapper },
  //   card: { component: TurboCard, mapProps: cardMapper },
  //   ...
  // }
});
