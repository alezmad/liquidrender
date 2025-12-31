"use client";

// Section showing suggested tasks/actions

import { Card, CardContent } from "@turbostarter/ui-web/card";
import { Button } from "@turbostarter/ui-web/button";
import { Checkbox } from "@turbostarter/ui-web/checkbox";
import { Icons } from "@turbostarter/ui-web/icons";

import type { TasksSectionProps, BriefItem } from "../types";

export function TasksSection({ items, onTaskAction }: TasksSectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icons.ScrollText className="h-5 w-5 text-purple-500" />
        <h2 className="text-lg font-semibold">Suggested Actions</h2>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {items.map((item) => (
            <TaskItem
              key={item.id}
              item={item}
              onAction={(action) => onTaskAction?.(item.id, action)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

interface TaskItemProps {
  item: BriefItem;
  onAction?: (action: string) => void;
}

function TaskItem({ item, onAction }: TaskItemProps) {
  return (
    <div className="flex items-start gap-3 p-4">
      <Checkbox
        id={item.id}
        className="mt-0.5"
        onCheckedChange={(checked) => {
          if (checked) onAction?.("complete");
        }}
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={item.id}
          className="font-medium leading-tight cursor-pointer"
        >
          {item.title}
        </label>
        {item.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>
      {item.action && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (item.action?.onClick) {
              item.action.onClick();
            } else {
              onAction?.("view");
            }
          }}
        >
          {item.action.label}
          <Icons.ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
