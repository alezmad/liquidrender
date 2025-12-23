// LiquidSurvey Compiler - Main Entry Point
// Provides compile, parse, and roundtrip functions

import { SurveyScanner } from './scanner';
import { SurveyParser, type SurveyAST } from './parser';
import { SurveyEmitter, type GraphSurvey, type GraphSurveyNode, type EmitOptions } from './emitter';

/**
 * Compile GraphSurvey schema to LiquidSurvey DSL
 */
export function compile(survey: GraphSurvey, options?: Partial<EmitOptions>): string {
  // Convert GraphSurvey to AST
  const ast = graphSurveyToAST(survey);

  // Emit as LiquidSurvey DSL
  const emitter = new SurveyEmitter({ format: 'liquidsurvey', ...options });
  return emitter.emit(ast) as string;
}

/**
 * Parse LiquidSurvey DSL to GraphSurvey schema
 */
export function parse(source: string): GraphSurvey {
  // Tokenize
  const scanner = new SurveyScanner(source);
  const tokens = scanner.scan();

  // Parse to AST
  const parser = new SurveyParser(tokens);
  const ast = parser.parse();

  // Emit as GraphSurvey
  const emitter = new SurveyEmitter({ format: 'graphsurvey' });
  return emitter.emit(ast) as GraphSurvey;
}

/**
 * Roundtrip: GraphSurvey -> DSL -> GraphSurvey
 * Returns both the DSL string and reconstructed schema
 */
export function roundtrip(survey: GraphSurvey): {
  dsl: string;
  reconstructed: GraphSurvey;
  isEquivalent: boolean;
  differences: string[];
} {
  const dsl = compile(survey);
  const reconstructed = parse(dsl);

  const { isEquivalent, differences } = compareSchemas(survey, reconstructed);

  return {
    dsl,
    reconstructed,
    isEquivalent,
    differences,
  };
}

/**
 * Convert GraphSurvey to internal AST
 */
function graphSurveyToAST(survey: GraphSurvey): SurveyAST {
  const ast: SurveyAST = {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    nodes: [],
    comments: [],
  };

  // Determine node order (start first, then BFS from start)
  const nodeOrder = getNodeOrder(survey);

  for (const nodeId of nodeOrder) {
    const node = survey.nodes[nodeId];
    if (!node) continue;

    const astNode = graphSurveyNodeToAST(node);
    ast.nodes.push(astNode);
  }

  return ast;
}

function graphSurveyNodeToAST(node: GraphSurveyNode): import('./parser').NodeAST {
  const content = node.content || {};

  const astNode: import('./parser').NodeAST = {
    type: node.type as 'start' | 'question' | 'message' | 'end',
    id: node.id,
    transitions: [],
    line: 0,
  };

  switch (node.type) {
    case 'start':
    case 'end':
    case 'message':
      astNode.title = content.title as string;
      astNode.message = content.message as string;
      break;

    case 'question':
      astNode.question = content.question as string;
      astNode.questionType = content.type as string;
      astNode.required = content.required as boolean;
      astNode.description = content.description as string;

      if (content.options) {
        astNode.options = (content.options as any[]).map(opt => ({
          id: opt.id,
          label: opt.label,
          value: opt.value,
        }));
      }

      // Extract remaining content as config
      const config: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(content)) {
        if (!['question', 'type', 'required', 'description', 'options'].includes(key)) {
          config[key] = value;
        }
      }
      if (Object.keys(config).length > 0) {
        astNode.config = config;
      }
      break;
  }

  // Transitions
  astNode.transitions = (node.next || []).map(n => ({
    target: n.nodeId,
    condition: n.condition ? {
      operator: n.condition.operator as string,
      value: n.condition.value,
    } : undefined,
  }));

  return astNode;
}

function getNodeOrder(survey: GraphSurvey): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  // Start with startNodeId
  if (survey.startNodeId) {
    queue.push(survey.startNodeId);
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;

    visited.add(nodeId);
    order.push(nodeId);

    const node = survey.nodes[nodeId];
    if (node?.next) {
      for (const n of node.next) {
        if (!visited.has(n.nodeId)) {
          queue.push(n.nodeId);
        }
      }
    }
  }

  // Add any remaining nodes not reached from start
  for (const nodeId of Object.keys(survey.nodes)) {
    if (!visited.has(nodeId)) {
      order.push(nodeId);
    }
  }

  return order;
}

/**
 * Compare two GraphSurvey schemas for semantic equivalence
 */
function compareSchemas(
  original: GraphSurvey,
  reconstructed: GraphSurvey
): { isEquivalent: boolean; differences: string[] } {
  const differences: string[] = [];

  // Compare basic properties
  if (original.id !== reconstructed.id) {
    differences.push(`ID mismatch: ${original.id} vs ${reconstructed.id}`);
  }
  if (original.title !== reconstructed.title) {
    differences.push(`Title mismatch: ${original.title} vs ${reconstructed.title}`);
  }
  if (original.startNodeId !== reconstructed.startNodeId) {
    differences.push(`StartNodeId mismatch: ${original.startNodeId} vs ${reconstructed.startNodeId}`);
  }

  // Compare node counts
  const origNodeIds = Object.keys(original.nodes);
  const reconNodeIds = Object.keys(reconstructed.nodes);

  if (origNodeIds.length !== reconNodeIds.length) {
    differences.push(`Node count mismatch: ${origNodeIds.length} vs ${reconNodeIds.length}`);
  }

  // Compare individual nodes
  for (const nodeId of origNodeIds) {
    const origNode = original.nodes[nodeId];
    const reconNode = reconstructed.nodes[nodeId];

    if (!origNode || !reconNode) {
      differences.push(`Missing node: ${nodeId}`);
      continue;
    }

    if (origNode.type !== reconNode.type) {
      differences.push(`Node ${nodeId} type mismatch: ${origNode.type} vs ${reconNode.type}`);
    }

    // Compare transitions
    if (origNode.next?.length !== reconNode.next?.length) {
      differences.push(`Node ${nodeId} transition count mismatch`);
    }
  }

  return {
    isEquivalent: differences.length === 0,
    differences,
  };
}
