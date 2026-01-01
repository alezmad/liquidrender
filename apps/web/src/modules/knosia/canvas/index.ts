// Canvas module - Visual dashboard builder UI
export * from "./types";

// Hooks
export { useCanvas } from "./hooks/use-canvas";
export { useCanvasesList } from "./hooks/use-canvases-list";
export { useCanvasBlocks } from "./hooks/use-canvas-blocks";

// Components
export { CanvasView } from "./components/canvas-view";
export { CanvasSidebar } from "./components/canvas-sidebar";
export { CanvasGrid } from "./components/canvas-grid";
export { CanvasBlockComponent as CanvasBlock } from "./components/canvas-block";
export { BlockRenderer } from "./components/blocks/block-renderer";
export { LiquidRenderBlock, BLOCK_TYPE_TO_LIQUID_TYPE } from "./components/blocks/liquid-render-block";
export { CanvasPromptBar } from "./components/canvas-prompt-bar";
export { CanvasEditor } from "./components/canvas-editor";
export { CanvasAlertsPanel } from "./components/canvas-alerts-panel";
