/**
 * Test script for KPI Recipe Generator
 *
 * Run with: npx tsx packages/ai/src/modules/kpi/test-recipe-generator.ts
 */

import { generateKPIRecipes, validateRecipe } from "./recipe-generator";
import type { GenerateRecipeRequest } from "./types";

/**
 * Sample SaaS database schema
 */
const saasSampleSchema: GenerateRecipeRequest["vocabularyContext"] = {
  tables: [
    {
      name: "subscriptions",
      columns: [
        { name: "id", type: "text", semanticType: "id" },
        { name: "customer_id", type: "text", semanticType: "foreign_key" },
        { name: "plan_name", type: "text", semanticType: "dimension" },
        { name: "amount", type: "numeric", semanticType: "measure", businessType: "currency" },
        { name: "status", type: "text", semanticType: "dimension" },
        { name: "subscription_type", type: "text", semanticType: "dimension" },
        { name: "created_at", type: "timestamp", semanticType: "timestamp" },
        { name: "cancelled_at", type: "timestamp", semanticType: "timestamp" },
      ],
    },
    {
      name: "customers",
      columns: [
        { name: "id", type: "text", semanticType: "id" },
        { name: "email", type: "text", semanticType: "dimension" },
        { name: "status", type: "text", semanticType: "dimension" },
        { name: "created_at", type: "timestamp", semanticType: "timestamp" },
        { name: "last_seen_at", type: "timestamp", semanticType: "timestamp" },
      ],
    },
    {
      name: "payments",
      columns: [
        { name: "id", type: "text", semanticType: "id" },
        { name: "subscription_id", type: "text", semanticType: "foreign_key" },
        { name: "amount", type: "numeric", semanticType: "measure", businessType: "currency" },
        { name: "status", type: "text", semanticType: "dimension" },
        { name: "created_at", type: "timestamp", semanticType: "timestamp" },
      ],
    },
  ],
  detectedMetrics: ["amount", "subscription_count", "customer_count"],
  detectedDimensions: ["status", "plan_name", "subscription_type"],
};

/**
 * Sample E-commerce database schema
 */
const ecommerceSampleSchema: GenerateRecipeRequest["vocabularyContext"] = {
  tables: [
    {
      name: "orders",
      columns: [
        { name: "id", type: "text", semanticType: "id" },
        { name: "customer_id", type: "text", semanticType: "foreign_key" },
        { name: "total_amount", type: "numeric", semanticType: "measure", businessType: "currency" },
        { name: "status", type: "text", semanticType: "dimension" },
        { name: "created_at", type: "timestamp", semanticType: "timestamp" },
      ],
    },
    {
      name: "order_items",
      columns: [
        { name: "id", type: "text", semanticType: "id" },
        { name: "order_id", type: "text", semanticType: "foreign_key" },
        { name: "product_id", type: "text", semanticType: "foreign_key" },
        { name: "quantity", type: "integer", semanticType: "measure" },
        { name: "price", type: "numeric", semanticType: "measure", businessType: "currency" },
      ],
    },
    {
      name: "carts",
      columns: [
        { name: "id", type: "text", semanticType: "id" },
        { name: "customer_id", type: "text", semanticType: "foreign_key" },
        { name: "status", type: "text", semanticType: "dimension" },
        { name: "created_at", type: "timestamp", semanticType: "timestamp" },
        { name: "abandoned_at", type: "timestamp", semanticType: "timestamp" },
      ],
    },
  ],
  detectedMetrics: ["total_amount", "quantity", "price"],
  detectedDimensions: ["status"],
};

/**
 * Test 1: Generate SaaS KPIs
 */
async function testSaaSKPIs() {
  console.log("\n===== Test 1: Generate SaaS KPIs =====\n");

  const request: GenerateRecipeRequest = {
    businessType: "saas",
    vocabularyContext: saasSampleSchema,
    requestedKPIs: [
      "Monthly Recurring Revenue (MRR)",
      "Customer Churn Rate",
      "Annual Recurring Revenue (ARR)",
    ],
    generateCommonKPIs: false,
  };

  try {
    const response = await generateKPIRecipes(request, { model: "haiku" });

    console.log(`✅ Generated ${response.totalGenerated} recipes`);
    console.log(`   Feasible: ${response.feasibleCount}`);
    console.log(`   Infeasible: ${response.infeasibleCount}`);
    console.log(`   Avg Confidence: ${response.averageConfidence.toFixed(2)}`);

    if (response.warnings?.length) {
      console.log("\n⚠️  Warnings:");
      response.warnings.forEach((w) => console.log(`   - ${w}`));
    }

    console.log("\nGenerated Recipes:\n");
    response.recipes.forEach((recipe, idx) => {
      console.log(`${idx + 1}. ${recipe.name}`);
      console.log(`   Category: ${recipe.category}`);
      console.log(`   Feasible: ${recipe.feasible ? "✅" : "❌"}`);
      console.log(`   Confidence: ${recipe.confidence.toFixed(2)}`);

      const format = recipe.semanticDefinition.format;
      console.log(`   Display: ${format?.type || 'number'}${format?.currency ? ` (${format.currency})` : ''}`);

      if (recipe.requiredColumns) {
        console.log(`   Required Columns:`);
        recipe.requiredColumns.forEach((col) => {
          console.log(`     - ${col.tableName}.${col.columnName}: ${col.purpose}`);
        });
      }

      if (!recipe.feasible && recipe.infeasibilityReason) {
        console.log(`   ❌ Infeasibility Reason: ${recipe.infeasibilityReason}`);
      }

      console.log(`\n   Semantic Definition:`);
      console.log(`     Type: ${recipe.semanticDefinition.type}`);
      console.log(`     Expression: ${recipe.semanticDefinition.expression}`);
      console.log(`     Aggregation: ${recipe.semanticDefinition.aggregation || 'N/A'}`);
      console.log(`     Entity: ${recipe.semanticDefinition.entity}`);
      if (recipe.semanticDefinition.timeField) {
        console.log(`     Time: ${recipe.semanticDefinition.timeField} (${recipe.semanticDefinition.timeGranularity})`);
      }
      if (recipe.semanticDefinition.filters?.length) {
        console.log(`     Filters: ${recipe.semanticDefinition.filters.length} conditions`);
      }
      console.log("");

      // Validate recipe
      const validation = validateRecipe(recipe, saasSampleSchema);
      if (!validation.valid) {
        console.log(`   ⚠️  Validation Failed! Missing columns:`);
        validation.missingColumns.forEach((col) => {
          console.log(`      - ${col.table}.${col.column}`);
        });
      }

      console.log("");
    });

    return response;
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

/**
 * Test 2: Generate E-commerce KPIs
 */
async function testEcommerceKPIs() {
  console.log("\n===== Test 2: Generate E-commerce KPIs =====\n");

  const request: GenerateRecipeRequest = {
    businessType: "ecommerce",
    vocabularyContext: ecommerceSampleSchema,
    requestedKPIs: [
      "Average Order Value (AOV)",
      "Cart Abandonment Rate",
    ],
    generateCommonKPIs: false,
  };

  try {
    const response = await generateKPIRecipes(request, { model: "haiku" });

    console.log(`✅ Generated ${response.totalGenerated} recipes`);
    console.log(`   Feasible: ${response.feasibleCount}`);
    console.log(`   Infeasible: ${response.infeasibleCount}`);
    console.log(`   Avg Confidence: ${response.averageConfidence.toFixed(2)}`);

    console.log("\nGenerated Recipes:\n");
    response.recipes.forEach((recipe, idx) => {
      console.log(`${idx + 1}. ${recipe.name}`);
      console.log(`   Feasible: ${recipe.feasible ? "✅" : "❌"}`);
      console.log(`   Confidence: ${recipe.confidence.toFixed(2)}`);

      if (recipe.feasible) {
        console.log(`\n   Semantic Definition:`);
        console.log(`     ${recipe.semanticDefinition.type}: ${recipe.semanticDefinition.expression}`);
        console.log(`     Entity: ${recipe.semanticDefinition.entity}`);
      }

      console.log("");
    });

    return response;
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

/**
 * Test 3: Auto-generate common KPIs
 */
async function testAutoGenerateKPIs() {
  console.log("\n===== Test 3: Auto-generate Common SaaS KPIs =====\n");

  const request: GenerateRecipeRequest = {
    businessType: "saas",
    vocabularyContext: saasSampleSchema,
    generateCommonKPIs: true,
  };

  try {
    const response = await generateKPIRecipes(request, {
      model: "haiku",
      maxRecipes: 5, // Limit to 5 for faster testing
    });

    console.log(`✅ Generated ${response.totalGenerated} recipes`);
    console.log(`   Feasible: ${response.feasibleCount}`);
    console.log(`   Infeasible: ${response.infeasibleCount}`);

    console.log("\nGenerated KPI Names:");
    response.recipes.forEach((recipe, idx) => {
      const icon = recipe.feasible ? "✅" : "❌";
      console.log(`   ${idx + 1}. ${icon} ${recipe.name} (${recipe.confidence.toFixed(2)})`);
    });

    return response;
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log("🧪 KPI Recipe Generator Test Suite");
  console.log("===================================");

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("\n❌ Error: ANTHROPIC_API_KEY environment variable not set");
    console.error("   Please set it before running tests:\n");
    console.error("   export ANTHROPIC_API_KEY=your-key-here");
    process.exit(1);
  }

  try {
    // Test 1: SaaS KPIs
    await testSaaSKPIs();

    // Test 2: E-commerce KPIs
    await testEcommerceKPIs();

    // Test 3: Auto-generate
    await testAutoGenerateKPIs();

    console.log("\n✅ All tests completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Run tests if executed directly
runTests();
