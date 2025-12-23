import type { NodeMetrics, SurveyNode } from './types';

export interface NodeAnalytics {
  nodeId: string;
  nodeType: string;
  questionText?: string;
  
  // Aggregated metrics
  totalResponses: number;
  avgTimeSpent: number; // seconds
  medianTimeSpent: number;
  minTimeSpent: number;
  maxTimeSpent: number;
  
  // Interaction patterns
  avgVisitCount: number;
  avgAnswerChanges: number;
  backNavigationRate: number; // percentage of users who went back from this node
  dropOffRate: number; // percentage who didn't complete after reaching this node
  
  // Distribution data
  timeDistribution: number[]; // for histogram
  visitDistribution: Record<number, number>; // visit count -> frequency
  
  // Common answers (for choice questions)
  answerDistribution?: Record<string, number>;
}

export interface SurveyFlowAnalytics {
  totalResponses: number;
  completionRate: number;
  avgCompletionTime: number; // seconds
  medianCompletionTime: number;
  
  // Node-specific analytics
  nodeAnalytics: Record<string, NodeAnalytics>;
  
  // Flow patterns
  commonPaths: PathPattern[];
  dropOffPoints: DropOffPoint[];
  
  // Time-based insights
  timeOfDayDistribution: Record<number, number>; // hour -> count
  dayOfWeekDistribution: Record<string, number>;
}

export interface PathPattern {
  path: string[]; // sequence of node IDs
  count: number;
  percentage: number;
}

export interface DropOffPoint {
  nodeId: string;
  questionText: string;
  dropOffCount: number;
  dropOffRate: number;
}

// Aggregate node metrics from multiple responses
export function aggregateNodeMetrics(
  responses: Array<{
    metadata?: { nodeMetrics?: NodeMetrics };
    answers: Record<string, unknown>;
    completedAt: Date | null;
  }>,
  surveyNodes: Record<string, SurveyNode>
): Record<string, NodeAnalytics> {
  const nodeStats: Record<string, {
    timesSpent: number[];
    visitCounts: number[];
    answerChanges: number[];
    backNavigations: number;
    responses: number;
    answers: Record<string, number>;
  }> = {};

  // Initialize stats for all nodes
  Object.keys(surveyNodes).forEach(nodeId => {
    nodeStats[nodeId] = {
      timesSpent: [],
      visitCounts: [],
      answerChanges: [],
      backNavigations: 0,
      responses: 0,
      answers: {}
    };
  });

  // Collect data from all responses
  responses.forEach(response => {
    const nodeMetrics = response.metadata?.nodeMetrics;
    if (!nodeMetrics) return;

    Object.entries(nodeMetrics).forEach(([nodeId, metrics]) => {
      if (!nodeStats[nodeId]) return;

      nodeStats[nodeId].timesSpent.push(metrics.totalTimeSpent / 1000); // Convert to seconds
      nodeStats[nodeId].visitCounts.push(metrics.visitCount);
      nodeStats[nodeId].answerChanges.push(metrics.answerChanges);
      nodeStats[nodeId].responses++;

      // Count back navigations
      const backNavCount = metrics.interactions.filter(
        i => i.type === 'back_navigation'
      ).length;
      if (backNavCount > 0) {
        nodeStats[nodeId].backNavigations++;
      }

      // Track answer distribution
      const answer = response.answers[nodeId];
      if (answer !== undefined && answer !== null) {
        const answerKey = String(answer);
        nodeStats[nodeId].answers[answerKey] = 
          (nodeStats[nodeId].answers[answerKey] || 0) + 1;
      }
    });
  });

  // Calculate analytics for each node
  const analytics: Record<string, NodeAnalytics> = {};
  
  Object.entries(nodeStats).forEach(([nodeId, stats]) => {
    const node = surveyNodes[nodeId];
    if (!node || stats.responses === 0) return;

    const sortedTimes = [...stats.timesSpent].sort((a, b) => a - b);
    
    analytics[nodeId] = {
      nodeId,
      nodeType: node.type,
      questionText: node.type === 'question' && node.content && 'question' in node.content
        ? node.content.question
        : undefined,

      totalResponses: stats.responses,
      avgTimeSpent: average(stats.timesSpent),
      medianTimeSpent: median(sortedTimes),
      minTimeSpent: safeMin(stats.timesSpent),
      maxTimeSpent: safeMax(stats.timesSpent),
      
      avgVisitCount: average(stats.visitCounts),
      avgAnswerChanges: average(stats.answerChanges),
      backNavigationRate: (stats.backNavigations / stats.responses) * 100,
      dropOffRate: calculateDropOffRate(nodeId, responses),
      
      timeDistribution: createHistogram(stats.timesSpent, 10),
      visitDistribution: createFrequencyMap(stats.visitCounts),
      answerDistribution: stats.answers
    };
  });

  return analytics;
}

// Calculate survey flow analytics
export function calculateSurveyFlowAnalytics(
  responses: Array<{
    metadata?: Record<string, unknown>;
    answers: Record<string, unknown>;
    startedAt: Date | null;
    completedAt: Date | null;
  }>,
  surveyNodes: Record<string, SurveyNode>,
  totalInstances: number
): SurveyFlowAnalytics {
  const completedResponses = responses.filter(r => r.completedAt);
  const completionTimes = completedResponses
    .filter(r => r.startedAt && r.completedAt)
    .map(r => (r.completedAt!.getTime() - r.startedAt!.getTime()) / 1000);

  const nodeAnalytics = aggregateNodeMetrics(responses, surveyNodes);
  
  return {
    totalResponses: responses.length,
    completionRate: (completedResponses.length / totalInstances) * 100,
    avgCompletionTime: average(completionTimes),
    medianCompletionTime: median([...completionTimes].sort((a, b) => a - b)),
    
    nodeAnalytics,
    
    commonPaths: extractCommonPaths(responses),
    dropOffPoints: identifyDropOffPoints(nodeAnalytics, surveyNodes),
    
    timeOfDayDistribution: getTimeOfDayDistribution(responses),
    dayOfWeekDistribution: getDayOfWeekDistribution(responses)
  };
}

// Helper functions
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function median(sortedNumbers: number[]): number {
  if (sortedNumbers.length === 0) return 0;
  const mid = Math.floor(sortedNumbers.length / 2);
  return sortedNumbers.length % 2 !== 0
    ? sortedNumbers[mid]!
    : (sortedNumbers[mid - 1]! + sortedNumbers[mid]!) / 2;
}

function safeMin(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

function safeMax(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

function createHistogram(values: number[], buckets: number): number[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);

  // Handle case where all values are the same (avoid division by zero)
  if (min === max) {
    const histogram = new Array(buckets).fill(0);
    histogram[0] = values.length;
    return histogram;
  }

  const bucketSize = (max - min) / buckets;
  const histogram = new Array(buckets).fill(0);

  values.forEach(value => {
    const bucket = Math.min(
      Math.floor((value - min) / bucketSize),
      buckets - 1
    );
    histogram[bucket]++;
  });

  return histogram;
}

function createFrequencyMap(values: number[]): Record<number, number> {
  const map: Record<number, number> = {};
  values.forEach(value => {
    map[value] = (map[value] || 0) + 1;
  });
  return map;
}

function calculateDropOffRate(
  nodeId: string,
  responses: Array<{ metadata?: Record<string, unknown>; completedAt: Date | null }>
): number {
  const reachedNode = responses.filter(r => {
    const nodeMetrics = r.metadata?.nodeMetrics as NodeMetrics | undefined;
    return nodeMetrics?.[nodeId] !== undefined;
  }).length;
  
  const completedAfterNode = responses.filter(r => {
    const nodeMetrics = r.metadata?.nodeMetrics as NodeMetrics | undefined;
    return nodeMetrics?.[nodeId] !== undefined && r.completedAt;
  }).length;
  
  if (reachedNode === 0) return 0;
  return ((reachedNode - completedAfterNode) / reachedNode) * 100;
}

function extractCommonPaths(responses: Array<{ metadata?: Record<string, unknown> }>): PathPattern[] {
  // Extract paths from nodeMetrics interaction events
  const pathCounts: Record<string, number> = {};
  let totalPaths = 0;

  responses.forEach(response => {
    const nodeMetrics = response.metadata?.nodeMetrics as NodeMetrics | undefined;
    if (!nodeMetrics) return;

    // Build path from visit timestamps
    const visits: Array<{ nodeId: string; timestamp: number }> = [];
    Object.entries(nodeMetrics).forEach(([nodeId, metrics]) => {
      visits.push({ nodeId, timestamp: metrics.firstVisitTime });
    });

    // Sort by first visit time to get the path order
    visits.sort((a, b) => a.timestamp - b.timestamp);
    const path = visits.map(v => v.nodeId).join(' -> ');

    if (path) {
      pathCounts[path] = (pathCounts[path] || 0) + 1;
      totalPaths++;
    }
  });

  if (totalPaths === 0) return [];

  // Convert to PathPattern array and sort by count
  return Object.entries(pathCounts)
    .map(([path, count]) => ({
      path: path.split(' -> '),
      count,
      percentage: (count / totalPaths) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 paths
}

function identifyDropOffPoints(
  nodeAnalytics: Record<string, NodeAnalytics>,
  _surveyNodes: Record<string, SurveyNode>
): DropOffPoint[] {
  return Object.values(nodeAnalytics)
    .filter(analytics => analytics.dropOffRate > 10) // More than 10% drop off
    .sort((a, b) => b.dropOffRate - a.dropOffRate)
    .slice(0, 5) // Top 5 drop-off points
    .map(analytics => ({
      nodeId: analytics.nodeId,
      questionText: analytics.questionText || analytics.nodeId,
      dropOffCount: Math.round(
        (analytics.totalResponses * analytics.dropOffRate) / 100
      ),
      dropOffRate: analytics.dropOffRate
    }));
}

function getTimeOfDayDistribution(responses: Record<string, unknown>[]): Record<number, number> {
  const distribution: Record<number, number> = {};
  
  responses.forEach(response => {
    if (response.startedAt) {
      const hour = new Date(response.startedAt as string | number).getHours();
      distribution[hour] = (distribution[hour] || 0) + 1;
    }
  });
  
  return distribution;
}

function getDayOfWeekDistribution(responses: Record<string, unknown>[]): Record<string, number> {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const distribution: Record<string, number> = {};

  responses.forEach(response => {
    if (response.startedAt) {
      const dayIndex = new Date(response.startedAt as string | number).getDay();
      const dayName = days[dayIndex];
      if (dayName) {
        distribution[dayName] = (distribution[dayName] || 0) + 1;
      }
    }
  });

  return distribution;
}