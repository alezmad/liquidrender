"use client";

// AI prompt bar for natural language canvas editing

import { useState } from "react";
import { Button } from "@turbostarter/ui-web/button";
import { Input } from "@turbostarter/ui-web/input";
import { Icons } from "@turbostarter/ui-web/icons";

import type { CanvasPromptBarProps } from "../types";

export function CanvasPromptBar({
  canvasId,
  onSubmit,
  isProcessing = false,
}: CanvasPromptBarProps) {
  const [instruction, setInstruction] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isProcessing) return;

    onSubmit(instruction);
    setInstruction("");
  };

  const suggestions = [
    "Add a revenue trend chart",
    "Show top 5 customers by sales",
    "Create a comparison of this month vs last",
    "Add a KPI for conversion rate",
  ];

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Icons.Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Describe what you want to add or change..."
            className="pl-10"
            disabled={isProcessing}
          />
        </div>
        <Button type="submit" disabled={!instruction.trim() || isProcessing}>
          {isProcessing ? (
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Icons.Sparkle className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            onClick={() => setInstruction(suggestion)}
            disabled={isProcessing}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
