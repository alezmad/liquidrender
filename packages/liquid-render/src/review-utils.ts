import type { GraphSurvey, SurveyNode } from './types';

/**
 * Find all rating and NPS nodes in the survey graph
 */
export function findRatingAndNPSNodes(graph: GraphSurvey): Array<{ id: string; node: SurveyNode; displayName: string }> {
  const eligibleNodes: Array<{ id: string; node: SurveyNode; displayName: string }> = [];

  Object.entries(graph.nodes).forEach(([nodeId, node]) => {
    if (node.type === 'question' && node.content && 'type' in node.content) {
      const questionType = node.content.type;
      if (questionType === 'rating' || questionType === 'nps') {
        const displayName = getNodeDisplayName(node);
        eligibleNodes.push({ id: nodeId, node, displayName });
      }
    }
  });

  return eligibleNodes;
}

/**
 * Check if a node is reachable from another node
 */
export function isNodeReachable(graph: GraphSurvey, fromNodeId: string, toNodeId: string): boolean {
  const visited = new Set<string>();
  
  function traverse(currentNodeId: string): boolean {
    if (currentNodeId === toNodeId) return true;
    if (visited.has(currentNodeId)) return false;
    
    visited.add(currentNodeId);
    
    const currentNode = graph.nodes[currentNodeId];
    if (!currentNode) return false;
    
    // Check all next steps
    for (const nextStep of currentNode.next || []) {
      if (traverse(nextStep.nodeId)) {
        return true;
      }
    }
    
    return false;
  }
  
  return traverse(fromNodeId);
}

/**
 * Check if a node is in the main flow path (reachable from start and can reach end)
 */
export function isNodeInMainPath(graph: GraphSurvey, nodeId: string): boolean {
  // Find start node
  const startNodeId = graph.startNodeId || Object.keys(graph.nodes).find(id => graph.nodes[id]?.type === 'start');
  if (!startNodeId) return false;

  // Find end nodes
  const endNodeIds = Object.keys(graph.nodes).filter(id => graph.nodes[id]?.type === 'end');
  if (endNodeIds.length === 0) return false;
  
  // Check if node is reachable from start
  const reachableFromStart = isNodeReachable(graph, startNodeId, nodeId);
  if (!reachableFromStart) return false;
  
  // Check if at least one end node is reachable from this node
  const canReachEnd = endNodeIds.some(endId => isNodeReachable(graph, nodeId, endId));
  
  return canReachEnd;
}

/**
 * Validate review trigger configuration
 */
export function validateReviewTrigger(
  graph: GraphSurvey,
  triggerNodeId: string | null
): { valid: boolean; error?: string } {
  if (!triggerNodeId) {
    return { valid: false, error: 'No trigger node selected' };
  }
  
  // Check if trigger node exists
  const triggerNode = graph.nodes[triggerNodeId];
  if (!triggerNode) {
    return { valid: false, error: 'Selected trigger node not found in survey' };
  }
  
  // Check if it's rating or NPS
  if (triggerNode.type !== 'question' || !triggerNode.content) {
    return { valid: false, error: 'Selected node is not a question' };
  }
  
  if (!('type' in triggerNode.content)) {
    return { valid: false, error: 'Invalid question content' };
  }
  const questionType = triggerNode.content.type;
  if (questionType !== 'rating' && questionType !== 'nps') {
    return { valid: false, error: 'Selected question must be a rating or NPS type' };
  }
  
  // Check if node is in main path
  if (!isNodeInMainPath(graph, triggerNodeId)) {
    return { valid: false, error: 'Selected question is not in the main survey flow' };
  }
  
  return { valid: true };
}

/**
 * Get display name for a node
 */
export function getNodeDisplayName(node: SurveyNode): string {
  if (node.type === 'question' && node.content && 'question' in node.content && 'type' in node.content) {
    const question = node.content.question || 'Untitled Question';
    const type = node.content.type === 'nps' ? 'NPS' : 'Rating';
    
    // Truncate long questions
    const truncatedQuestion = question.length > 50 
      ? question.substring(0, 47) + '...' 
      : question;
    
    return `${truncatedQuestion} (${type})`;
  }
  
  return 'Untitled Node';
}

/**
 * Find the best default trigger node
 */
export function findDefaultTriggerNode(graph: GraphSurvey): string | null {
  const eligibleNodes = findRatingAndNPSNodes(graph);
  
  // Filter to only nodes in main path
  const mainPathNodes = eligibleNodes.filter(({ id }) => isNodeInMainPath(graph, id));

  if (mainPathNodes.length === 0) return null;
  if (mainPathNodes.length === 1) return mainPathNodes[0]?.id ?? null;
  
  // Prefer NPS over rating
  const npsNode = mainPathNodes.find(({ node }) => 
    node.type === 'question' && node.content && 'type' in node.content && node.content.type === 'nps'
  );
  if (npsNode) return npsNode.id;
  
  // Look for "overall" or "satisfaction" in question text
  const overallNode = mainPathNodes.find(({ node }) => {
    const question = (node.content && 'question' in node.content ? node.content.question?.toLowerCase() : '') || '';
    return question.includes('overall') || question.includes('satisfaction');
  });
  if (overallNode) return overallNode.id;

  // Return the last rating/NPS in the flow
  return mainPathNodes[mainPathNodes.length - 1]?.id ?? null;
}

/**
 * Get the appropriate minimum score default based on question type
 */
export function getDefaultMinimumScore(node: SurveyNode): number {
  if (node.type === 'question' && node.content && 'type' in node.content) {
    if (node.content.type === 'nps') {
      return 8; // NPS promoters are 9-10, but 8 is a good threshold
    }
    if (node.content.type === 'rating' && 'scale' in node.content) {
      const scale = node.content.scale || 5;
      // For 5-star rating, use 4 as threshold
      // For 10-point scale, use 8 as threshold
      return (typeof scale === 'number' && scale <= 5) ? 4 : 8;
    }
  }
  return 4; // Default fallback
}