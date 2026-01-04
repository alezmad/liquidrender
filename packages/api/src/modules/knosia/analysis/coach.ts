/**
 * Onboarding Coach API
 *
 * Provides interactive Q&A during analysis to help users understand their data.
 */

import { db } from "@turbostarter/db/server";
import { eq } from "@turbostarter/db";
import { knosiaAnalysis } from "@turbostarter/db/schema";

import type { OnboardingContext, Message } from "@turbostarter/ai/coach/onboarding";

/**
 * Answer user question during onboarding
 */
export async function answerOnboardingQuestion(
  analysisId: string,
  question: string,
  conversationHistory: Message[] = []
): Promise<{
  answer: string;
  followUpQuestions: string[];
}> {
  // Get analysis to build context
  const analysis = await db
    .select()
    .from(knosiaAnalysis)
    .where(eq(knosiaAnalysis.id, analysisId))
    .limit(1)
    .then(rows => rows[0]);

  if (!analysis) {
    throw new Error("Analysis not found");
  }

  // Build context from analysis
  const context: OnboardingContext = {
    schema: {
      database: analysis.summary?.tables ? `database_${analysis.summary.tables}_tables` : "database",
      schema: "public",
      tables: [], // We don't have full schema in analysis, but coach can work without it
    } as any,
    businessType: analysis.businessType?.detected || "Unknown",
    detectedVocabulary: {
      metrics: (analysis.detectedVocab as any)?.metrics || [],
      dimensions: (analysis.detectedVocab as any)?.dimensions || [],
      entities: (analysis.detectedVocab as any)?.entities || [],
    },
    analysisProgress: {
      currentStep: analysis.currentStep || 0,
      totalSteps: analysis.totalSteps || 5,
      completedSteps: [],
    },
  };

  // Import coach dynamically
  const { answerOnboardingQuestion: answerQuestion, suggestFollowUpQuestions } = await import(
    "@turbostarter/ai/coach/onboarding"
  );

  // Get answer
  const answer = await answerQuestion(question, context, conversationHistory, {
    model: "sonnet", // Use Sonnet for better reasoning on Q&A
  });

  // Generate follow-up questions
  const updatedHistory = [
    ...conversationHistory,
    { role: "user" as const, content: question },
    { role: "assistant" as const, content: answer },
  ];

  const followUpQuestions = await suggestFollowUpQuestions(updatedHistory, context, {
    model: "haiku",
  });

  return {
    answer,
    followUpQuestions,
  };
}

/**
 * Generate proactive insight for the analysis
 */
export async function generateProactiveInsight(analysisId: string): Promise<string> {
  // Get analysis
  const analysis = await db
    .select()
    .from(knosiaAnalysis)
    .where(eq(knosiaAnalysis.id, analysisId))
    .limit(1)
    .then(rows => rows[0]);

  if (!analysis) {
    throw new Error("Analysis not found");
  }

  // Build context
  const context: OnboardingContext = {
    schema: {
      database: analysis.summary?.tables ? `database_${analysis.summary.tables}_tables` : "database",
      schema: "public",
      tables: [],
    } as any,
    businessType: analysis.businessType?.detected || "Unknown",
    detectedVocabulary: {
      metrics: (analysis.detectedVocab as any)?.metrics || [],
      dimensions: (analysis.detectedVocab as any)?.dimensions || [],
      entities: (analysis.detectedVocab as any)?.entities || [],
    },
  };

  // Import coach
  const { generateProactiveInsight: generateInsight } = await import(
    "@turbostarter/ai/coach/onboarding"
  );

  return generateInsight(context, {
    model: "haiku",
  });
}
