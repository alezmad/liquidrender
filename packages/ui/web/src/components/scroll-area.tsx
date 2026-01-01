"use client";

import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import * as React from "react";
import { useRef, useState, useEffect } from "react";

import { cn } from "@turbostarter/ui";

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

interface ScrollAreaWithShadowsProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

/**
 * Scroll container with top/bottom shadow indicators.
 * Shows gradient shadows when content is scrollable.
 */
function ScrollAreaWithShadows({
  children,
  className,
  maxHeight = "60vh",
}: ScrollAreaWithShadowsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ top: false, bottom: false });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateScrollState = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      setScrollState({
        top: scrollTop > 10,
        bottom: scrollTop + clientHeight < scrollHeight - 10,
      });
    };

    updateScrollState();
    el.addEventListener("scroll", updateScrollState);
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="relative">
      {/* Top shadow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-background to-transparent transition-opacity duration-200",
          scrollState.top ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        ref={scrollRef}
        className={cn(
          "overflow-y-auto scroll-smooth [scrollbar-gutter:stable]",
          className
        )}
        style={{ maxHeight }}
      >
        {children}
      </div>

      {/* Bottom shadow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-background to-transparent transition-opacity duration-200",
          scrollState.bottom ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollAreaWithShadows, ScrollBar };
