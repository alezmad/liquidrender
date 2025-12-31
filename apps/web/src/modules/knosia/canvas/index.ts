// Canvas module - Visual dashboard builder UI
export * from "./types";

// Hooks
export { useCanvas } from "./hooks/use-canvas";
export { useCanvasesList } from "./hooks/use-canvases-list";
export { useCanvasBlocks } from "./hooks/use-canvas-blocks";

// Components
export { CanvasView } from "./components/canvas-view";
export { CanvasGrid } from "./components/canvas-grid";
export { CanvasBlockComponent as CanvasBlock } from "./components/canvas-block";
export { BlockRenderer } from "./components/blocks/block-renderer";
export { CanvasPromptBar } from "./components/canvas-prompt-bar";
export { CanvasEditor } from "./components/canvas-editor";
