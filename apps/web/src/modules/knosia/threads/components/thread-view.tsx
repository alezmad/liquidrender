"use client";

// Thread conversation view with messages and input

import { useState, useRef, useEffect } from "react";
import { Card } from "@turbostarter/ui-web/card";
import { Button } from "@turbostarter/ui-web/button";
import { Textarea } from "@turbostarter/ui-web/textarea";
import { ScrollArea } from "@turbostarter/ui-web/scroll-area";
import { Icons } from "@turbostarter/ui-web/icons";

import { useThread } from "../hooks/use-thread";
import { ThreadMessage } from "./thread-message";
import { ThreadActions } from "./thread-actions";
import type { ThreadViewProps } from "../types";

export function ThreadView({ threadId, workspaceId, connectionId }: ThreadViewProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    thread,
    messages,
    isLoading,
    sendMessage,
    isSending,
  } = useThread({ threadId, workspaceId, connectionId });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const message = input;
    setInput("");
    await sendMessage(message);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Icons.Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Thread not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">
            {thread.title || "New Thread"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {messages.length} messages
          </p>
        </div>
        <ThreadActions threadId={threadId} />
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground">
                Start a conversation by asking a question about your data.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <ThreadMessage
                key={message.id}
                message={message}
                showTrustBadge
              />
            ))
          )}

          {isSending && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icons.Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data..."
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isSending}
          >
            <Icons.Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
