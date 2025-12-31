"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@turbostarter/ui";

interface ScrollContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollContainer({ children, className }: ScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 1);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
  }, []);

  // Check on mount, resize, and content changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Initial check
    updateScrollState();

    // Watch for size changes
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);

    // Also observe children for content changes
    const mutationObserver = new MutationObserver(updateScrollState);
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateScrollState]);

  return (
    <div className={cn("relative flex-1 overflow-hidden", className)}>
      {/* Top shadow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-black/10 to-transparent transition-opacity duration-150 dark:from-white/10",
          canScrollUp ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      />

      {/* Scroll content */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="h-full overflow-auto"
      >
        {children}
      </div>

      {/* Bottom shadow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-black/10 to-transparent transition-opacity duration-150 dark:from-white/10",
          canScrollDown ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      />
    </div>
  );
}
