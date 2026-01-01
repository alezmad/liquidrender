// Knosia frontend modules
// Note: Using explicit re-exports to avoid duplicate type name conflicts
// (AlertSeverity exists in both brief/types.ts and canvas/types.ts with different values)

// Threads module - conversation management
export * from "./threads";

// Canvas module - visual dashboard builder (exclude AlertSeverity - use CanvasAlertSeverity alias)
export {
  // Types (no AlertSeverity to avoid conflict with brief)
  type Canvas,
  type CanvasStatus,
  type CanvasLayout,
  type CanvasBlock,
  type BlockType,
  type BlockPosition,
  type BlockConfig,
  type BlockDataSource,
  type AlertOperator,
  type AlertChannel,
  type AlertStatus,
  type CanvasAlert,
  type AlertCondition,
  type CanvasViewProps,
  type CanvasGridProps,
  type CanvasBlockProps,
  type CanvasEditorProps,
  type CanvasPromptBarProps,
  type BlockRendererProps,
  // Export canvas AlertSeverity with alias
  type AlertSeverity as CanvasAlertSeverity,
  // Hooks
  useCanvas,
  useCanvasesList,
  useCanvasBlocks,
  // Components (CanvasBlock component renamed to avoid conflict with CanvasBlock type)
  CanvasView,
  CanvasSidebar,
  CanvasGrid,
  CanvasBlock as CanvasBlockComponent,
  BlockRenderer,
  LiquidRenderBlock,
  BLOCK_TYPE_TO_LIQUID_TYPE,
  CanvasPromptBar,
  CanvasEditor,
  CanvasAlertsPanel,
} from "./canvas";

// Brief module - AI-generated briefings
export * from "./brief";
