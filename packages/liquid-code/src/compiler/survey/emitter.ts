// LiquidSurvey Emitter - Code Generation
// Converts AST back to GraphSurvey schema or LiquidSurvey DSL

import type { SurveyAST, NodeAST, TransitionAST, OptionAST } from './parser';
import { QUESTION_TYPE_CODES, NODE_TYPE_SYMBOLS, CONDITION_OPERATORS } from './constants';

export interface EmitOptions {
  format: 'graphsurvey' | 'liquidsurvey';
  pretty?: boolean;
  includeComments?: boolean;
}

export interface GraphSurveyNode {
  id: string;
  type: string;
  content: Record<string, unknown>;
  next: Array<{ nodeId: string; condition?: Record<string, unknown> }>;
}

export interface GraphSurvey {
  id: string;
  title: string;
  description: string;
  startNodeId: string;
  nodes: Record<string, GraphSurveyNode>;
}

export class SurveyEmitter {
  private options: EmitOptions;

  constructor(options: EmitOptions = { format: 'graphsurvey' }) {
    this.options = options;
  }

  emit(ast: SurveyAST): string | GraphSurvey {
    if (this.options.format === 'graphsurvey') {
      return this.emitGraphSurvey(ast);
    } else {
      return this.emitLiquidSurvey(ast);
    }
  }

  // Emit to GraphSurvey TypeScript schema
  private emitGraphSurvey(ast: SurveyAST): GraphSurvey {
    const nodes: Record<string, GraphSurveyNode> = {};
    let startNodeId = '';

    for (const node of ast.nodes) {
      const gsNode = this.emitGraphSurveyNode(node);
      nodes[gsNode.id] = gsNode;

      if (node.type === 'start') {
        startNodeId = node.id;
      }
    }

    return {
      id: ast.id || 'survey',
      title: ast.title || '',
      description: ast.description || '',
      startNodeId,
      nodes,
    };
  }

  private emitGraphSurveyNode(node: NodeAST): GraphSurveyNode {
    const content: Record<string, unknown> = {};

    switch (node.type) {
      case 'start':
      case 'end':
      case 'message':
        if (node.title) content.title = node.title;
        if (node.message) content.message = node.message;
        break;

      case 'question':
        if (node.question) content.question = node.question;
        if (node.questionType) content.type = node.questionType;
        if (node.required !== undefined) content.required = node.required;
        if (node.description) content.description = node.description;

        if (node.options && node.options.length > 0) {
          content.options = node.options.map(opt => ({
            id: opt.id || opt.value,
            label: opt.label,
            value: opt.value,
          }));
        }

        // Merge config
        if (node.config) {
          Object.assign(content, node.config);
        }
        break;
    }

    const next = node.transitions.map(t => {
      const transition: { nodeId: string; condition?: Record<string, unknown> } = {
        nodeId: t.target,
      };

      if (t.condition) {
        transition.condition = {
          operator: t.condition.operator,
          value: t.condition.value,
        };
      }

      return transition;
    });

    return {
      id: node.id,
      type: node.type,
      content,
      next,
    };
  }

  // Emit to LiquidSurvey DSL string
  private emitLiquidSurvey(ast: SurveyAST): string {
    const lines: string[] = [];

    // Header
    if (ast.id) {
      let header = ast.id;
      if (ast.title) header += ` "${ast.title}"`;
      if (ast.description) header += ` "${ast.description}"`;
      lines.push(header);
      lines.push('---');
      lines.push('');
    }

    // Comments
    if (this.options.includeComments && ast.comments.length > 0) {
      for (const comment of ast.comments) {
        lines.push(`// ${comment}`);
      }
      lines.push('');
    }

    // Nodes
    for (const node of ast.nodes) {
      lines.push(this.emitLiquidSurveyNode(node));
      lines.push('');
    }

    return lines.join('\n').trim();
  }

  private emitLiquidSurveyNode(node: NodeAST): string {
    const symbol = NODE_TYPE_SYMBOLS[node.type];
    const parts: string[] = [symbol];

    parts.push(node.id);

    switch (node.type) {
      case 'start':
      case 'end':
      case 'message':
        if (node.title) parts.push(`"${this.escapeString(node.title)}"`);
        if (node.message) parts.push(`"${this.escapeString(node.message)}"`);
        break;

      case 'question':
        // Type code + required marker
        const typeCode = QUESTION_TYPE_CODES[node.questionType as keyof typeof QUESTION_TYPE_CODES] || node.questionType;
        parts.push(node.required ? `${typeCode}*` : typeCode || 'Tx');

        if (node.question) parts.push(`"${this.escapeString(node.question)}"`);
        if (node.description) parts.push(`"${this.escapeString(node.description)}"`);

        // Options
        if (node.options && node.options.length > 0) {
          const opts = node.options.map(opt => this.emitOption(opt)).join(', ');
          parts.push(`[${opts}]`);
        }

        // Config
        if (node.config && Object.keys(node.config).length > 0) {
          parts.push(this.emitConfig(node.config));
        }
        break;
    }

    // Transitions
    const transitions = node.transitions.map(t => this.emitTransition(t));

    if (transitions.length === 1) {
      return `${parts.join(' ')} ${transitions[0]}`;
    } else if (transitions.length > 1) {
      const indent = '  ';
      const base = parts.join(' ');
      return `${base}\n${transitions.map(t => `${indent}${t}`).join('\n')}`;
    }

    return parts.join(' ');
  }

  private emitOption(opt: OptionAST): string {
    if (opt.id && opt.id !== opt.value) {
      return `${opt.id}:"${this.escapeString(opt.label)}"=${opt.value}`;
    } else if (opt.label === opt.value) {
      return `"${this.escapeString(opt.label)}"`;
    } else {
      return `${opt.value}="${this.escapeString(opt.label)}"`;
    }
  }

  private emitConfig(config: Record<string, unknown>): string {
    const pairs = Object.entries(config).map(([k, v]) => {
      if (typeof v === 'string') {
        return `${k}: "${this.escapeString(v)}"`;
      } else if (Array.isArray(v)) {
        return `${k}: [${v.map(i => typeof i === 'string' ? `"${i}"` : i).join(', ')}]`;
      } else if (typeof v === 'object' && v !== null) {
        return `${k}: ${this.emitConfig(v as Record<string, unknown>)}`;
      } else {
        return `${k}: ${v}`;
      }
    });
    return `{${pairs.join(', ')}}`;
  }

  private emitTransition(t: TransitionAST): string {
    let result = `-> ${t.target}`;

    if (t.condition) {
      const op = CONDITION_OPERATORS[t.condition.operator as keyof typeof CONDITION_OPERATORS] || `?${t.condition.operator}`;
      const val = typeof t.condition.value === 'string' ? t.condition.value :
                  Array.isArray(t.condition.value) ? `[${t.condition.value.join(', ')}]` :
                  String(t.condition.value);
      result += ` ${op} ${val}`;
    }

    return result;
  }

  private escapeString(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}
