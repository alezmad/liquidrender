import React from "react";
import type { LiquidComponentProps } from "./utils";
import { tokens } from "./utils";

const styles = {
  wrapper: {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.muted,
    border: `1px dashed ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
  },
  type: {
    fontFamily: "monospace",
    fontWeight: tokens.fontWeight.medium,
  },
};

export function UnknownComponent({
  block,
}: LiquidComponentProps): React.ReactElement {
  return (
    <div data-liquid-type="unknown" style={styles.wrapper}>
      Unknown component type:{" "}
      <span style={styles.type}>{block.type || "undefined"}</span>
    </div>
  );
}

export default UnknownComponent;
