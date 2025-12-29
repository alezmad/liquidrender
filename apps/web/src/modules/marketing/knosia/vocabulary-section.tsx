"use client";

import { useState } from "react";

import { cn } from "@turbostarter/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@turbostarter/ui-web/card";

import {
  Section,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "~/modules/marketing/layout/section";

import { vocabularySection } from "./copy";

// Feature card component
const FeatureCard = ({
  title,
  description,
  index,
}: {
  title: string;
  description: string;
  index: number;
}) => {
  const icons = ["schema", "learning", "invisible"] as const;
  type IconKey = (typeof icons)[number];
  const iconKey: IconKey = icons[index % icons.length] ?? "schema";
  const iconMap: Record<IconKey, React.ReactNode> = {
    schema: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
        />
      </svg>
    ),
    learning: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
        />
      </svg>
    ),
    invisible: (
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
        />
      </svg>
    ),
  };

  return (
    <Card
      className={cn(
        "animate-fade-in border-border/50 bg-card/50 backdrop-blur-sm opacity-0",
        `[--animation-delay:${index * 150}ms]`
      )}
    >
      <CardHeader className="pb-3">
        <div className="text-primary mb-2">{iconMap[iconKey]}</div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
};

// Interactive scenario display
const ScenarioDisplay = () => {
  const [activeScenario, setActiveScenario] = useState(0);
  const scenarios = vocabularySection.example.scenarios;
  const currentScenario = scenarios[activeScenario];

  if (!currentScenario) return null;

  return (
    <div
      className={cn(
        "animate-fade-in w-full opacity-0 [--animation-delay:600ms]"
      )}
    >
      <p className="text-muted-foreground mb-4 text-center text-sm font-medium">
        {vocabularySection.example.title}
      </p>

      {/* Scenario tabs */}
      <div className="mb-4 flex justify-center gap-2">
        {scenarios.map((scenario, idx) => (
          <button
            key={scenario.type}
            onClick={() => setActiveScenario(idx)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-all",
              activeScenario === idx
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {scenario.type}
          </button>
        ))}
      </div>

      {/* Terminal-style display */}
      <div className="border-border bg-card/80 mx-auto max-w-2xl overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm">
        {/* Terminal header */}
        <div className="bg-muted/50 border-border flex items-center gap-2 border-b px-4 py-2">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
          <span className="text-muted-foreground ml-2 text-xs font-mono">
            Knosia Intelligence
          </span>
        </div>

        {/* Terminal content */}
        <div className="space-y-4 p-4 font-mono text-sm">
          {/* User question */}
          <div className="flex items-start gap-3">
            <span className="text-primary shrink-0 font-semibold">You:</span>
            <span className="text-foreground">
              {currentScenario.question}
            </span>
          </div>

          {/* System response */}
          <div className="flex items-start gap-3">
            <span className="text-emerald-500 shrink-0 font-semibold">AI:</span>
            <span className="text-muted-foreground leading-relaxed">
              {currentScenario.response}
            </span>
          </div>

          {/* Blinking cursor */}
          <div className="flex items-center gap-3">
            <span className="text-primary shrink-0 font-semibold">You:</span>
            <span className="bg-foreground inline-block h-4 w-2 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const VocabularySection = () => {
  return (
    <Section className="relative">
      <SectionHeader>
        <SectionTitle className="animate-fade-in opacity-0 [--animation-delay:0ms]">
          {vocabularySection.title}
        </SectionTitle>
        <SectionDescription className="animate-fade-in opacity-0 [--animation-delay:150ms]">
          {vocabularySection.subtitle}
        </SectionDescription>
      </SectionHeader>

      {/* Feature cards */}
      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
        {vocabularySection.features.map((feature, idx) => (
          <FeatureCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
            index={idx}
          />
        ))}
      </div>

      {/* Interactive example */}
      <ScenarioDisplay />
    </Section>
  );
};
