"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, useRef, useEffect } from "react";

import { useTranslation } from "@turbostarter/i18n";
import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";

const examples = [
  {
    icon: Icons.TrendingUp,
    labelKey: "knosia:briefing.example.performance.label" as const,
    promptKey: "knosia:briefing.example.performance.prompt" as const,
  },
  {
    icon: Icons.UsersRound,
    labelKey: "knosia:briefing.example.customers.label" as const,
    promptKey: "knosia:briefing.example.customers.prompt" as const,
  },
  {
    icon: Icons.ChartNoAxesColumn,
    labelKey: "knosia:briefing.example.compare.label" as const,
    promptKey: "knosia:briefing.example.compare.prompt" as const,
  },
  {
    icon: Icons.AlertCircle,
    labelKey: "knosia:briefing.example.anomalies.label" as const,
    promptKey: "knosia:briefing.example.anomalies.prompt" as const,
  },
  {
    icon: Icons.Lightbulb,
    labelKey: "knosia:briefing.example.insights.label" as const,
    promptKey: "knosia:briefing.example.insights.prompt" as const,
  },
];

interface DashboardPrompterProps {
  readonly className?: string;
  readonly onSubmit: (query: string) => void;
}

export function DashboardPrompter({
  className,
  onSubmit,
}: DashboardPrompterProps) {
  const { t } = useTranslation(["knosia", "common"]);
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120); // max ~4 lines
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Handle click outside to blur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!input.trim()) {
          setIsFocused(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input.trim());
      setInput("");
      setIsFocused(false);
    }
  };

  const handleExampleClick = (promptKey: typeof examples[number]["promptKey"]) => {
    onSubmit(t(promptKey));
    setIsFocused(false);
  };

  const showExamples = isFocused && !input.trim();

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 px-4 pb-4 pt-2",
        "pointer-events-none",
        className,
      )}
    >
      <div className="pointer-events-auto mx-auto max-w-2xl">
        {/* Examples - show on focus when empty */}
        <AnimatePresence>
          {showExamples && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="mb-2 flex flex-row flex-wrap items-center justify-center gap-1.5"
            >
              {examples.map(({ icon: Icon, labelKey, promptKey }) => (
                <Button
                  key={labelKey}
                  variant="secondary"
                  size="sm"
                  className="h-7 gap-1.5 rounded-full bg-background/80 text-xs backdrop-blur-sm"
                  onClick={() => handleExampleClick(promptKey)}
                >
                  <Icon className="size-3" />
                  <span>{t(labelKey)}</span>
                </Button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input bar */}
        <form onSubmit={handleSubmit}>
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl border bg-background/95 px-4 py-2 shadow-lg backdrop-blur-md",
              "transition-shadow duration-200",
              isFocused && "ring-2 ring-ring/20",
            )}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) {
                    handleSubmit(e);
                  }
                }
              }}
              placeholder={t("knosia:conversation.placeholder")}
              maxLength={2_000}
              rows={1}
              className={cn(
                "flex-1 resize-none bg-transparent text-sm outline-none",
                "placeholder:text-muted-foreground",
                "min-h-[24px] py-0.5",
              )}
            />
            <Button
              className="shrink-0 rounded-full"
              disabled={!input.trim()}
              size="icon"
              type="submit"
            >
              <Icons.ArrowUp className="size-4" />
              <span className="sr-only">{t("common:send")}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
