"use client";

import { cn } from "@turbostarter/ui";

import {
  Section,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "~/modules/marketing/layout/section";

import { competitorMap } from "./copy";
import type { CompetitorPosition } from "./types";

// ============================================
// Competitor Dot Component
// ============================================

const CompetitorDot = ({
  position,
  index,
}: {
  position: CompetitorPosition;
  index: number;
}) => {
  const isUs = position.isUs;

  return (
    <div
      className="absolute animate-fade-in opacity-0"
      style={{
        left: `${position.x}%`,
        bottom: `${position.y}%`,
        transform: "translate(-50%, 50%)",
        animationDelay: `${300 + index * 100}ms`,
      }}
    >
      {/* Glow effect for Knosia */}
      {isUs && (
        <div className="bg-primary/30 absolute -inset-4 animate-pulse rounded-full blur-xl" />
      )}

      {/* Dot */}
      <div
        className={cn(
          "relative rounded-full transition-transform duration-300 hover:scale-125",
          isUs
            ? "bg-primary ring-primary/30 size-5 shadow-lg ring-4 md:size-6"
            : "bg-muted-foreground/60 hover:bg-muted-foreground size-3 md:size-4"
        )}
      />

      {/* Label */}
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs md:text-sm",
          isUs
            ? "text-primary -top-7 font-semibold md:-top-8"
            : "text-muted-foreground -top-5 md:-top-6"
        )}
      >
        {position.name}
      </span>
    </div>
  );
};

// ============================================
// Mobile List View
// ============================================

const MobileListView = ({ positions }: { positions: CompetitorPosition[] }) => {
  const sortedPositions = [...positions].sort(
    (a, b) => (b.x + b.y) / 2 - (a.x + a.y) / 2
  );

  return (
    <div className="w-full space-y-3 md:hidden">
      {sortedPositions.map((position, index) => {
        const isUs = position.isUs;
        const score = Math.round((position.x + position.y) / 2);

        return (
          <div
            key={position.name}
            className={cn(
              "animate-fade-in flex items-center justify-between rounded-lg border p-4 opacity-0",
              isUs
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-card/50"
            )}
            style={{ animationDelay: `${300 + index * 100}ms` }}
          >
            <div className="flex items-center gap-3">
              {/* Rank indicator */}
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-medium",
                  isUs
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </div>

              {/* Name */}
              <span
                className={cn(
                  "font-medium",
                  isUs ? "text-primary" : "text-foreground"
                )}
              >
                {position.name}
              </span>
            </div>

            {/* Score bar */}
            <div className="flex items-center gap-2">
              <div className="bg-muted h-2 w-24 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isUs ? "bg-primary" : "bg-muted-foreground/50"
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-muted-foreground w-8 text-right text-xs">
                {score}%
              </span>
            </div>
          </div>
        );
      })}

      {/* Axis legend for mobile */}
      <div className="text-muted-foreground mt-6 grid grid-cols-2 gap-4 text-center text-xs">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="font-medium">Proactivity</div>
          <div className="text-muted-foreground/70">
            {competitorMap.xAxis.left} to {competitorMap.xAxis.right}
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="font-medium">Automation</div>
          <div className="text-muted-foreground/70">
            {competitorMap.yAxis.bottom} to {competitorMap.yAxis.top}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Desktop Chart View
// ============================================

const DesktopChartView = ({
  positions,
}: {
  positions: CompetitorPosition[];
}) => {
  return (
    <div className="hidden w-full max-w-4xl md:block">
      {/* Chart container */}
      <div className="relative aspect-square w-full">
        {/* Background gradient quadrants */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          {/* Bottom-left: Low (muted) */}
          <div className="from-muted/30 absolute inset-0 bg-gradient-to-tr to-transparent" />

          {/* Top-right: High (primary accent) */}
          <div className="from-primary/10 absolute inset-0 bg-gradient-to-bl to-transparent" />
        </div>

        {/* Grid lines */}
        <svg className="absolute inset-0 h-full w-full">
          {/* Vertical grid lines */}
          {[20, 40, 60, 80].map((x) => (
            <line
              key={`v-${x}`}
              x1={`${x}%`}
              y1="0%"
              x2={`${x}%`}
              y2="100%"
              className="stroke-border"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
          {/* Horizontal grid lines */}
          {[20, 40, 60, 80].map((y) => (
            <line
              key={`h-${y}`}
              x1="0%"
              y1={`${100 - y}%`}
              x2="100%"
              y2={`${100 - y}%`}
              className="stroke-border"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
        </svg>

        {/* Border */}
        <div className="border-border absolute inset-0 rounded-2xl border-2" />

        {/* Quadrant labels */}
        <div className="text-muted-foreground/50 pointer-events-none absolute inset-0 text-sm font-medium">
          {/* Top-right quadrant label */}
          <span className="absolute right-4 top-4">Proactive + Autonomous</span>
          {/* Bottom-left quadrant label */}
          <span className="absolute bottom-4 left-4">Reactive + Manual</span>
        </div>

        {/* Competitor dots */}
        <div className="absolute inset-8">
          {positions.map((position, index) => (
            <CompetitorDot
              key={position.name}
              position={position}
              index={index}
            />
          ))}
        </div>

        {/* Y-axis labels */}
        <div className="absolute -left-4 top-1/2 -translate-x-full -translate-y-1/2 -rotate-90 transform">
          <div className="flex items-center gap-4 whitespace-nowrap">
            <span className="text-muted-foreground text-sm">
              {competitorMap.yAxis.bottom}
            </span>
            <div className="bg-border h-px w-12" />
            <span className="text-foreground text-sm font-medium">
              {competitorMap.yAxis.top}
            </span>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 transform">
          <div className="flex items-center gap-4 whitespace-nowrap">
            <span className="text-muted-foreground text-sm">
              {competitorMap.xAxis.left}
            </span>
            <div className="bg-border h-px w-12" />
            <span className="text-foreground text-sm font-medium">
              {competitorMap.xAxis.right}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export const CompetitorMap = () => {
  return (
    <Section className="overflow-hidden">
      <SectionHeader>
        <SectionTitle className="animate-fade-in opacity-0 [--animation-delay:0ms]">
          {competitorMap.title}
        </SectionTitle>
        <SectionDescription className="animate-fade-in opacity-0 [--animation-delay:100ms]">
          {competitorMap.subtitle}
        </SectionDescription>
      </SectionHeader>

      {/* Desktop scatter plot */}
      <DesktopChartView positions={competitorMap.positions} />

      {/* Mobile list view */}
      <MobileListView positions={competitorMap.positions} />
    </Section>
  );
};
