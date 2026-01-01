"use client";

import {
  Layers,
  BarChart3,
  Grid3x3,
  Clock,
  Save,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@turbostarter/ui";
import { Button } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";
import { Input } from "@turbostarter/ui-web/input";
import { Label } from "@turbostarter/ui-web/label";
import { Textarea } from "@turbostarter/ui-web/textarea";

interface SaveStepProps {
  readonly stats: {
    entities: number;
    metrics: number;
    dimensions: number;
    timeFields: number;
    filters: number;
  };
  readonly onSave: (data: { name: string; description?: string }) => void;
  readonly onBack: () => void;
  readonly isLoading?: boolean;
  readonly isSaving?: boolean;
}

interface StatItemProps {
  readonly label: string;
  readonly value: number;
  readonly icon: React.ReactNode;
}

const StatItem = ({ label, value, icon }: StatItemProps) => (
  <div className="flex items-center gap-3">
    <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
      {icon}
    </div>
    <div className="flex flex-col">
      <span className="text-foreground text-lg font-semibold">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  </div>
);

export const SaveStep = ({
  stats,
  onSave,
  onBack,
  isLoading = false,
  isSaving = false,
}: SaveStepProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setNameError("Vocabulary name is required");
      return;
    }

    setNameError(null);
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setIsSaved(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (nameError) {
      setNameError(null);
    }
  };

  const handleCreateAnother = () => {
    setName("");
    setDescription("");
    setIsSaved(false);
    setNameError(null);
  };

  if (isSaved) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="bg-success/10 flex h-20 w-20 items-center justify-center rounded-full">
          <Icons.CheckCircle2
            className="text-success h-12 w-12"
            strokeWidth={1.5}
          />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Vocabulary Saved Successfully
          </h2>
          <p className="text-muted-foreground mt-2">
            Your vocabulary &ldquo;{name}&rdquo; has been created and is ready
            to use.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCreateAnother}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Create Another
          </Button>
          <Button>
            <Icons.Eye className="mr-2 h-4 w-4" />
            View Vocabulary
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
          {/* Stats Summary */}
          <div className="border-border bg-muted/30 rounded-lg border p-4">
            <h3 className="text-foreground mb-4 text-sm font-medium">
              Vocabulary Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <StatItem
                label="Entities"
                value={stats.entities}
                icon={<Layers className="h-4 w-4" aria-hidden="true" />}
              />
              <StatItem
                label="Metrics"
                value={stats.metrics}
                icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
              />
              <StatItem
                label="Dimensions"
                value={stats.dimensions}
                icon={<Grid3x3 className="h-4 w-4" aria-hidden="true" />}
              />
              <StatItem
                label="Time Fields"
                value={stats.timeFields}
                icon={<Clock className="h-4 w-4" aria-hidden="true" />}
              />
              <StatItem
                label="Filters"
                value={stats.filters}
                icon={<Icons.Filter className="h-4 w-4" aria-hidden="true" />}
              />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vocabulary-name">
                Vocabulary Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vocabulary-name"
                placeholder="e.g., Sales Analytics Vocabulary"
                value={name}
                onChange={handleNameChange}
                disabled={isLoading || isSaving}
                className={cn(nameError && "border-destructive")}
                autoFocus
              />
              {nameError && (
                <p className="text-destructive text-sm">{nameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vocabulary-description">
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="vocabulary-description"
                placeholder="Describe what this vocabulary is used for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading || isSaving}
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                disabled={isLoading || isSaving}
              >
                <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={isLoading || isSaving}>
                {isSaving ? (
                  <>
                    <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Vocabulary
                  </>
                )}
              </Button>
            </div>
          </form>
    </div>
  );
};
