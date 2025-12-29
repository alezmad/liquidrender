"use client";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Database, Layers, Pencil } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { cn } from "@turbostarter/ui";
import { Badge } from "@turbostarter/ui-web/badge";
import { Button } from "@turbostarter/ui-web/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@turbostarter/ui-web/card";
import { Checkbox } from "@turbostarter/ui-web/checkbox";
import { Icons } from "@turbostarter/ui-web/icons";
import { Input } from "@turbostarter/ui-web/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@turbostarter/ui-web/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@turbostarter/ui-web/tabs";

import type { ColumnDef } from "@tanstack/react-table";

// =============================================================================
// Types - Inline definitions to avoid cross-package type resolution issues
// =============================================================================

/** Detected entity from database schema */
export interface DetectedEntity {
  name: string;
  table: string;
  schema: string;
  primaryKey: string | string[];
  columnCount: number;
  certainty: number;
  isJunction: boolean;
}

/** Aggregation types for metrics */
export type AggregationType =
  | "SUM"
  | "AVG"
  | "COUNT"
  | "COUNT_DISTINCT"
  | "MIN"
  | "MAX";

/** Detected metric from database schema */
export interface DetectedMetric {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  aggregation: AggregationType;
  certainty: number;
  suggestedDisplayName?: string;
  expression?: string;
}

/** Detected dimension from database schema */
export interface DetectedDimension {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  cardinality?: number;
  certainty: number;
}

/** Detected time field from database schema */
export interface DetectedTimeField {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  isPrimaryCandidate: boolean;
  certainty: number;
}

/** Detected filter from database schema */
export interface DetectedFilter {
  id: string;
  name: string;
  table: string;
  column: string;
  dataType: string;
  certainty: number;
  expression?: string;
}

/** Relationship types */
export type RelationshipType =
  | "one_to_one"
  | "one_to_many"
  | "many_to_one"
  | "many_to_many";

/** Detected relationship from database schema */
export interface DetectedRelationship {
  id: string;
  from: { entity: string; field: string };
  to: { entity: string; field: string };
  type: RelationshipType;
  via?: string;
  certainty: number;
}

/** Reviewed vocabulary output */
export interface ReviewedVocabulary {
  entities: ReviewedEntity[];
  metrics: ReviewedMetric[];
  dimensions: ReviewedDimension[];
  timeFields: DetectedTimeField[];
  filters: DetectedFilter[];
  relationships: DetectedRelationship[];
}

/** Entity with review state */
export interface ReviewedEntity extends DetectedEntity {
  included: boolean;
  displayName: string;
}

/** Metric with review state */
export interface ReviewedMetric extends DetectedMetric {
  included: boolean;
  displayName: string;
}

/** Dimension with review state */
export interface ReviewedDimension extends DetectedDimension {
  included: boolean;
  displayName: string;
}

/** Props for the ReviewStep component */
export interface ReviewStepProps {
  detected: {
    entities: DetectedEntity[];
    metrics: DetectedMetric[];
    dimensions: DetectedDimension[];
    timeFields: DetectedTimeField[];
    filters: DetectedFilter[];
    relationships: DetectedRelationship[];
  };
  onNext: (reviewed: ReviewedVocabulary) => void;
  onBack: () => void;
  isLoading?: boolean;
}

// =============================================================================
// Certainty Badge Component
// =============================================================================

type CertaintyLevel = "high" | "medium" | "low";

function getCertaintyLevel(certainty: number): CertaintyLevel {
  if (certainty >= 0.8) return "high";
  if (certainty >= 0.5) return "medium";
  return "low";
}

function CertaintyBadge({ certainty }: { certainty: number }) {
  const level = getCertaintyLevel(certainty);
  const percentage = Math.round(certainty * 100);

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        level === "high" &&
          "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
        level === "medium" &&
          "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
        level === "low" &&
          "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
      )}
    >
      {percentage}%
    </Badge>
  );
}

// =============================================================================
// Editable Name Cell Component
// =============================================================================

interface EditableNameCellProps {
  value: string;
  onChange: (value: string) => void;
}

function EditableNameCell({ value, onChange }: EditableNameCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSubmit = useCallback(() => {
    onChange(editValue.trim() || value);
    setIsEditing(false);
  }, [editValue, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSubmit();
      } else if (e.key === "Escape") {
        setEditValue(value);
        setIsEditing(false);
      }
    },
    [handleSubmit, value],
  );

  if (isEditing) {
    return (
      <Input
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        className="h-7 w-full max-w-[200px]"
        autoFocus
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="hover:text-primary flex items-center gap-1.5 text-left underline-offset-4 hover:underline"
    >
      <span className="truncate">{value}</span>
      <Pencil className="text-muted-foreground size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

// =============================================================================
// Data Table Component
// =============================================================================

interface ReviewDataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  emptyMessage?: string;
}

function ReviewDataTable<TData>({
  data,
  columns,
  emptyMessage = "No items found",
}: ReviewDataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10">
                    {header.isPlaceholder
                      ? null
                      : typeof header.column.columnDef.header === "function"
                        ? header.column.columnDef.header(header.getContext())
                        : header.column.columnDef.header}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {typeof cell.column.columnDef.cell === "function"
                        ? cell.column.columnDef.cell(cell.getContext())
                        : (cell.getValue() as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-muted-foreground text-sm">
            {/* eslint-disable i18next/no-literal-string */}
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
            {/* eslint-enable i18next/no-literal-string */}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <Icons.ChevronLeft className="size-4" />
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <span className="sr-only">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <Icons.ChevronRight className="size-4" />
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <span className="sr-only">Next</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ReviewStep({
  detected,
  onNext,
  onBack,
  isLoading = false,
}: ReviewStepProps) {
  // Initialize reviewed state with included=true and displayName from detected
  const [entities, setEntities] = useState<ReviewedEntity[]>(() =>
    detected.entities.map((e) => ({
      ...e,
      included: true,
      displayName: e.name,
    })),
  );

  const [metrics, setMetrics] = useState<ReviewedMetric[]>(() =>
    detected.metrics.map((m) => ({
      ...m,
      included: true,
      displayName: m.suggestedDisplayName ?? m.name,
    })),
  );

  const [dimensions, setDimensions] = useState<ReviewedDimension[]>(() =>
    detected.dimensions.map((d) => ({
      ...d,
      included: true,
      displayName: d.name,
    })),
  );

  // Entity update handlers
  const updateEntity = useCallback(
    (index: number, updates: Partial<ReviewedEntity>) => {
      setEntities((prev) =>
        prev.map((e, i) => (i === index ? { ...e, ...updates } : e)),
      );
    },
    [],
  );

  // Metric update handlers
  const updateMetric = useCallback(
    (index: number, updates: Partial<ReviewedMetric>) => {
      setMetrics((prev) =>
        prev.map((m, i) => (i === index ? { ...m, ...updates } : m)),
      );
    },
    [],
  );

  // Dimension update handlers
  const updateDimension = useCallback(
    (index: number, updates: Partial<ReviewedDimension>) => {
      setDimensions((prev) =>
        prev.map((d, i) => (i === index ? { ...d, ...updates } : d)),
      );
    },
    [],
  );

  // Toggle all handlers
  const toggleAllEntities = useCallback((included: boolean) => {
    setEntities((prev) => prev.map((e) => ({ ...e, included })));
  }, []);

  const toggleAllMetrics = useCallback((included: boolean) => {
    setMetrics((prev) => prev.map((m) => ({ ...m, included })));
  }, []);

  const toggleAllDimensions = useCallback((included: boolean) => {
    setDimensions((prev) => prev.map((d) => ({ ...d, included })));
  }, []);

  // Column definitions
  const entityColumns = useMemo<ColumnDef<ReviewedEntity>[]>(
    () => [
      {
        id: "select",
        header: () => {
          const allSelected = entities.every((e) => e.included);
          const someSelected = entities.some((e) => e.included);
          return (
            <Checkbox
              checked={
                allSelected ? true : someSelected ? "indeterminate" : false
              }
              onCheckedChange={(checked) => toggleAllEntities(!!checked)}
              aria-label="Select all"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.included}
            onCheckedChange={(checked) =>
              updateEntity(row.index, { included: !!checked })
            }
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: "displayName",
        header: "Name",
        cell: ({ row }) => (
          <EditableNameCell
            value={row.original.displayName}
            onChange={(displayName) => updateEntity(row.index, { displayName })}
          />
        ),
      },
      {
        accessorKey: "table",
        header: "Source Table",
        cell: ({ row }) => (
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
            {row.original.schema}.{row.original.table}
          </code>
        ),
      },
      {
        accessorKey: "primaryKey",
        header: "Primary Key",
        cell: ({ row }) => {
          const pk = row.original.primaryKey;
          const pkDisplay = Array.isArray(pk) ? pk.join(", ") : pk;
          return (
            <span className="text-muted-foreground text-sm">{pkDisplay}</span>
          );
        },
      },
      {
        accessorKey: "columnCount",
        header: "Columns",
        cell: ({ row }) => row.original.columnCount,
      },
      {
        accessorKey: "certainty",
        header: "Confidence",
        cell: ({ row }) => <CertaintyBadge certainty={row.original.certainty} />,
      },
    ],
    [entities, toggleAllEntities, updateEntity],
  );

  const metricColumns = useMemo<ColumnDef<ReviewedMetric>[]>(
    () => [
      {
        id: "select",
        header: () => {
          const allSelected = metrics.every((m) => m.included);
          const someSelected = metrics.some((m) => m.included);
          return (
            <Checkbox
              checked={
                allSelected ? true : someSelected ? "indeterminate" : false
              }
              onCheckedChange={(checked) => toggleAllMetrics(!!checked)}
              aria-label="Select all"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.included}
            onCheckedChange={(checked) =>
              updateMetric(row.index, { included: !!checked })
            }
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: "displayName",
        header: "Name",
        cell: ({ row }) => (
          <EditableNameCell
            value={row.original.displayName}
            onChange={(displayName) => updateMetric(row.index, { displayName })}
          />
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => (
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
            {row.original.table}.{row.original.column}
          </code>
        ),
      },
      {
        accessorKey: "dataType",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.dataType}
          </span>
        ),
      },
      {
        accessorKey: "aggregation",
        header: "Aggregation",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-mono text-xs">
            {row.original.aggregation}
          </Badge>
        ),
      },
      {
        accessorKey: "certainty",
        header: "Confidence",
        cell: ({ row }) => <CertaintyBadge certainty={row.original.certainty} />,
      },
    ],
    [metrics, toggleAllMetrics, updateMetric],
  );

  const dimensionColumns = useMemo<ColumnDef<ReviewedDimension>[]>(
    () => [
      {
        id: "select",
        header: () => {
          const allSelected = dimensions.every((d) => d.included);
          const someSelected = dimensions.some((d) => d.included);
          return (
            <Checkbox
              checked={
                allSelected ? true : someSelected ? "indeterminate" : false
              }
              onCheckedChange={(checked) => toggleAllDimensions(!!checked)}
              aria-label="Select all"
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            checked={row.original.included}
            onCheckedChange={(checked) =>
              updateDimension(row.index, { included: !!checked })
            }
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: "displayName",
        header: "Name",
        cell: ({ row }) => (
          <EditableNameCell
            value={row.original.displayName}
            onChange={(displayName) =>
              updateDimension(row.index, { displayName })
            }
          />
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => (
          <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
            {row.original.table}.{row.original.column}
          </code>
        ),
      },
      {
        accessorKey: "dataType",
        header: "Type",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.dataType}
          </span>
        ),
      },
      {
        accessorKey: "cardinality",
        header: "Cardinality",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.cardinality?.toLocaleString() ?? "-"}
          </span>
        ),
      },
      {
        accessorKey: "certainty",
        header: "Confidence",
        cell: ({ row }) => <CertaintyBadge certainty={row.original.certainty} />,
      },
    ],
    [dimensions, toggleAllDimensions, updateDimension],
  );

  // Calculate counts
  const includedCounts = useMemo(
    () => ({
      entities: entities.filter((e) => e.included).length,
      metrics: metrics.filter((m) => m.included).length,
      dimensions: dimensions.filter((d) => d.included).length,
    }),
    [entities, metrics, dimensions],
  );

  // Handle next step
  const handleNext = useCallback(() => {
    const reviewed: ReviewedVocabulary = {
      entities: entities.filter((e) => e.included),
      metrics: metrics.filter((m) => m.included),
      dimensions: dimensions.filter((d) => d.included),
      timeFields: detected.timeFields,
      filters: detected.filters,
      relationships: detected.relationships,
    };
    onNext(reviewed);
  }, [entities, metrics, dimensions, detected, onNext]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center">
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <h3 className="text-lg font-semibold">Review Detected Items</h3>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <p className="text-muted-foreground mt-1 text-sm">
          Review and customize the automatically detected entities, metrics, and
          dimensions. Uncheck items you want to exclude.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <CardTitle className="text-sm font-medium">Entities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {includedCounts.entities}
              <span className="text-muted-foreground text-sm font-normal">
                {" "}
                / {entities.length}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <CardTitle className="text-sm font-medium">Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {includedCounts.metrics}
              <span className="text-muted-foreground text-sm font-normal">
                {" "}
                / {metrics.length}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <CardTitle className="text-sm font-medium">Dimensions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {includedCounts.dimensions}
              <span className="text-muted-foreground text-sm font-normal">
                {" "}
                / {dimensions.length}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="entities" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entities" className="gap-2">
            <Database className="size-4" />
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <span>Entities ({includedCounts.entities})</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2">
            <Icons.TrendingUp className="size-4" />
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <span>Metrics ({includedCounts.metrics})</span>
          </TabsTrigger>
          <TabsTrigger value="dimensions" className="gap-2">
            <Layers className="size-4" />
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <span>Dimensions ({includedCounts.dimensions})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="mt-4">
          <ReviewDataTable
            data={entities}
            columns={entityColumns}
            emptyMessage="No entities detected"
          />
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <ReviewDataTable
            data={metrics}
            columns={metricColumns}
            emptyMessage="No metrics detected"
          />
        </TabsContent>

        <TabsContent value="dimensions" className="mt-4">
          <ReviewDataTable
            data={dimensions}
            columns={dimensionColumns}
            emptyMessage="No dimensions detected"
          />
        </TabsContent>
      </Tabs>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          <Icons.ArrowLeft className="mr-2 size-4" />
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span>Back</span>
        </Button>
        <Button onClick={handleNext} disabled={isLoading}>
          {isLoading ? (
            <>
              <Icons.Loader2 className="mr-2 size-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <span>Continue</span>
              <Icons.ArrowRight className="ml-2 size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
