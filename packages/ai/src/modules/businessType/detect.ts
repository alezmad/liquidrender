/**
 * LLM-based Business Type Detection
 *
 * Uses Claude to detect business type from database schema.
 * Falls back to regex detection if LLM fails.
 */

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ExtractedSchema } from "@repo/liquid-connect/uvb";

// Business types (must normalize to lowercase for KPI lookup)
const BUSINESS_TYPES = [
  // Core business models
  "SaaS",
  "E-Commerce",
  "Marketplace",
  "ERP",
  "CRM",
  "FinTech",
  "Healthcare",
  "EdTech",
  "Media",
  "Logistics",
  // Extended business types
  "Marketing",
  "Support",
  "Manufacturing",
  "RealEstate",
  "Hospitality",
  "Insurance",
  "Telecom",
  "HR",
  "Travel",
  "Nonprofit",
  "Energy",
  "Construction",
  "Legal",
  "Gaming",
  "Agriculture",
  // Fallback
  "Custom",
] as const;

// Response schema
const businessTypeSchema = z.object({
  businessType: z.enum(BUSINESS_TYPES),
  confidence: z.number().min(0).max(1).describe("Confidence score between 0 and 1"),
  reasoning: z.string().describe("Brief explanation of why this business type was chosen"),
  signals: z.array(z.string()).describe("Specific table/column names that led to this conclusion"),
  alternatives: z.array(z.object({
    type: z.enum(BUSINESS_TYPES),
    confidence: z.number().min(0).max(1),
  })).max(2).describe("Top 2 alternative business types with confidence scores"),
});

export type BusinessTypeDetectionResult = z.infer<typeof businessTypeSchema>;

/**
 * Detect business type using Claude
 */
export async function detectBusinessTypeLLM(
  schema: ExtractedSchema,
  options: {
    model?: "haiku" | "sonnet";
    maxTokens?: number;
  } = {}
): Promise<BusinessTypeDetectionResult> {
  const { model = "haiku", maxTokens = 500 } = options;

  // Prepare schema summary
  const tableInfo = schema.tables.map(t => ({
    name: t.name,
    columns: t.columns.slice(0, 8).map(c => ({
      name: c.name,
      type: c.dataType,
      isPrimaryKey: c.isPrimaryKey,
      isForeignKey: !!c.references,
      referencesTable: c.references?.table,
    })),
    primaryKeys: t.primaryKeyColumns,
    foreignKeys: t.foreignKeys.map(fk => ({
      from: fk.column,
      to: `${fk.referencedTable}.${fk.referencedColumn}`,
    })),
  }));

  const prompt = `Analyze this database schema and determine the business type.

**Database:** ${schema.database}
**Schema:** ${schema.schema}
**Tables:** ${schema.tables.length}

**Table Details:**
${JSON.stringify(tableInfo, null, 2)}

**Instructions:**
1. Analyze the table names, column names, and relationships
2. Identify the primary business domain
3. Choose the most appropriate business type from the list
4. Consider multi-language table names (e.g., "pedidos" = orders in Spanish)
5. Support common prefixes/suffixes (e.g., "tbl_orders", "_orders", "orders_history")

**Business Types:**
- SaaS: subscriptions, tenants, plans, workspaces, billing
- E-Commerce: orders, products, cart, inventory, shipping, fulfillment
- Marketplace: buyers, sellers, vendors, listings, commissions
- ERP: inventory, warehouse, suppliers, purchase orders, bill of materials
- CRM: contacts, leads, opportunities, accounts, deals, pipelines
- FinTech: transactions, accounts, payments, wallets, transfers
- Healthcare: patients, appointments, medical records, prescriptions
- EdTech: students, courses, lessons, enrollments, grades
- Media: content, articles, videos, subscriptions, engagement
- Logistics: shipments, routes, drivers, warehouses, tracking
- Marketing: campaigns, audiences, ads, analytics, conversions
- Support: tickets, agents, SLA, knowledge base, customer service
- Manufacturing: work orders, BOM, quality control, production
- RealEstate: properties, listings, agents, leases, tenants
- Hospitality: reservations, rooms, guests, amenities, check-in
- Insurance: policies, claims, underwriting, premiums, coverage
- Telecom: subscribers, plans, usage, billing, network
- HR: employees, payroll, benefits, performance, recruiting
- Travel: bookings, flights, hotels, itineraries, travelers
- Nonprofit: donors, donations, programs, volunteers, grants
- Energy: meters, consumption, generation, billing, grid
- Construction: projects, contracts, materials, labor, phases
- Legal: cases, clients, documents, billing hours, matters
- Gaming: players, sessions, achievements, purchases, leaderboards
- Agriculture: farms, crops, yields, equipment, livestock
- Custom: if none of the above fit well

Provide:
- Business type (required)
- Confidence score 0-1 (required)
- Reasoning (brief, 1-2 sentences)
- Signals (2-5 specific table/column names that led to this conclusion)
- Top 2 alternatives with confidence scores`;

  try {
    const result = await generateObject({
      model: anthropic(model === "haiku" ? "claude-3-5-haiku-20241022" : "claude-3-5-sonnet-20241022"),
      schema: businessTypeSchema,
      prompt,
    });

    return result.object;
  } catch (error) {
    // If LLM fails, throw error to trigger fallback
    throw new Error(
      `LLM business type detection failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
