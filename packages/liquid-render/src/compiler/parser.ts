// LiquidSurvey Parser - Syntactic Analysis
// Parses tokens into an AST representing the survey structure

import type { Token, TokenType } from './scanner';
import { CODE_TO_QUESTION_TYPE, OPERATOR_TO_CONDITION } from './constants';

// AST Node Types
export interface SurveyAST {
  id?: string;
  title?: string;
  description?: string;
  nodes: NodeAST[];
  comments: string[];
}

export interface NodeAST {
  type: 'start' | 'question' | 'message' | 'end';
  id: string;
  title?: string;
  message?: string;
  question?: string;
  questionType?: string;
  required?: boolean;
  description?: string;
  options?: OptionAST[];
  config?: Record<string, unknown>;
  transitions: TransitionAST[];
  line: number;
}

export interface OptionAST {
  id?: string;
  label: string;
  value: string;
}

export interface TransitionAST {
  target: string;
  condition?: ConditionAST;
}

export interface ConditionAST {
  operator: string;
  value: unknown;
}

export class SurveyParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(t => t.type !== 'NEWLINE' || this.isSignificantNewline(t));
  }

  private isSignificantNewline(_token: Token): boolean {
    // Keep newlines that separate nodes
    return false; // Filter all newlines for now, we'll use other signals
  }

  parse(): SurveyAST {
    const ast: SurveyAST = {
      nodes: [],
      comments: [],
    };

    // Parse optional header
    this.parseHeader(ast);

    // Parse nodes
    while (!this.isAtEnd()) {
      const node = this.parseNode();
      if (node) {
        ast.nodes.push(node);
      }
    }

    return ast;
  }

  private parseHeader(ast: SurveyAST): void {
    // Optional: survey-id "title" "description"
    // Followed by ---

    // Skip leading comments
    while (this.check('COMMENT')) {
      ast.comments.push(this.advance().value);
    }

    // Check for identifier (survey id)
    if (this.check('IDENTIFIER') && !this.checkNext('NODE_START', 'NODE_QUESTION', 'NODE_MESSAGE', 'NODE_END')) {
      ast.id = this.advance().value;

      if (this.check('STRING')) {
        ast.title = this.advance().value;
      }
      if (this.check('STRING')) {
        ast.description = this.advance().value;
      }
    }

    // Skip header separator
    if (this.check('HEADER_SEP')) {
      this.advance();
    }
  }

  private parseNode(): NodeAST | null {
    // Skip comments
    while (this.check('COMMENT')) {
      this.advance();
    }

    if (this.isAtEnd()) return null;

    const token = this.peek();

    switch (token.type) {
      case 'NODE_START':
        return this.parseStartNode();
      case 'NODE_QUESTION':
        return this.parseQuestionNode();
      case 'NODE_MESSAGE':
        return this.parseMessageNode();
      case 'NODE_END':
        return this.parseEndNode();
      default:
        // Skip unknown tokens
        this.advance();
        return null;
    }
  }

  private parseStartNode(): NodeAST {
    const startToken = this.advance(); // consume >

    const node: NodeAST = {
      type: 'start',
      id: '',
      transitions: [],
      line: startToken.line,
    };

    // Parse id
    if (this.check('IDENTIFIER')) {
      node.id = this.advance().value;
    }

    // Parse title and message
    if (this.check('STRING')) {
      node.title = this.advance().value;
    }
    if (this.check('STRING')) {
      node.message = this.advance().value;
    }

    // Parse transitions
    node.transitions = this.parseTransitions();

    return node;
  }

  private parseQuestionNode(): NodeAST {
    const startToken = this.advance(); // consume ?

    const node: NodeAST = {
      type: 'question',
      id: '',
      transitions: [],
      line: startToken.line,
    };

    // Parse id
    if (this.check('IDENTIFIER')) {
      node.id = this.advance().value;
    }

    // Parse question type
    if (this.check('QUESTION_TYPE')) {
      const typeCode = this.advance().value;
      node.questionType = CODE_TO_QUESTION_TYPE[typeCode] || typeCode;
    }

    // Parse required marker
    if (this.check('REQUIRED')) {
      this.advance();
      node.required = true;
    } else {
      node.required = false;
    }

    // Parse question text
    if (this.check('STRING')) {
      node.question = this.advance().value;
    }

    // Parse optional description
    if (this.check('STRING')) {
      node.description = this.advance().value;
    }

    // Parse options [...]
    if (this.check('LBRACKET')) {
      node.options = this.parseOptions();
    }

    // Parse config {...}
    if (this.check('LBRACE')) {
      node.config = this.parseConfig();
    }

    // Parse transitions
    node.transitions = this.parseTransitions();

    return node;
  }

  private parseMessageNode(): NodeAST {
    const startToken = this.advance(); // consume !

    const node: NodeAST = {
      type: 'message',
      id: '',
      transitions: [],
      line: startToken.line,
    };

    // Parse id
    if (this.check('IDENTIFIER')) {
      node.id = this.advance().value;
    }

    // Parse title and message
    if (this.check('STRING')) {
      node.title = this.advance().value;
    }
    if (this.check('STRING')) {
      node.message = this.advance().value;
    }

    // Parse transitions
    node.transitions = this.parseTransitions();

    return node;
  }

  private parseEndNode(): NodeAST {
    const startToken = this.advance(); // consume <

    const node: NodeAST = {
      type: 'end',
      id: '',
      transitions: [],
      line: startToken.line,
    };

    // Parse id
    if (this.check('IDENTIFIER')) {
      node.id = this.advance().value;
    }

    // Parse title and message
    if (this.check('STRING')) {
      node.title = this.advance().value;
    }
    if (this.check('STRING')) {
      node.message = this.advance().value;
    }

    return node;
  }

  private parseTransitions(): TransitionAST[] {
    const transitions: TransitionAST[] = [];

    while (this.check('ARROW')) {
      this.advance(); // consume ->

      const transition: TransitionAST = {
        target: '',
      };

      // Parse target id
      if (this.check('IDENTIFIER')) {
        transition.target = this.advance().value;
      }

      // Parse optional condition
      if (this.check('CONDITION_OP')) {
        const opToken = this.advance();
        const operator = OPERATOR_TO_CONDITION[opToken.value as keyof typeof OPERATOR_TO_CONDITION] || opToken.value;

        let value: unknown;

        if (this.check('LBRACKET')) {
          // Array value for 'in' operator
          value = this.parseArrayValue();
        } else if (this.check('STRING')) {
          value = this.advance().value;
        } else if (this.check('NUMBER')) {
          value = parseFloat(this.advance().value);
        } else if (this.check('BOOLEAN')) {
          value = this.advance().value === 'true';
        } else if (this.check('IDENTIFIER')) {
          value = this.advance().value;
        }

        transition.condition = { operator, value };
      }

      transitions.push(transition);
    }

    return transitions;
  }

  private parseOptions(): OptionAST[] {
    const options: OptionAST[] = [];

    this.advance(); // consume [

    while (!this.check('RBRACKET') && !this.isAtEnd()) {
      const option: OptionAST = {
        label: '',
        value: '',
      };

      let parsed = false;

      // Format: id:"label"=value or just "label" or id="label" or value:"label"
      if (this.check('STRING')) {
        option.label = this.advance().value;
        option.value = option.label.toLowerCase().replace(/\s+/g, '-');
        parsed = true;
      } else if (this.check('IDENTIFIER')) {
        const first = this.advance().value;
        parsed = true;

        if (this.check('COLON')) {
          // id:"label"=value format or id:"label" format
          this.advance(); // consume :
          option.id = first;
          if (this.check('STRING')) {
            option.label = this.advance().value;
          }
          // Check for =value part
          if (this.check('EQUALS')) {
            this.advance(); // consume =
            if (this.check('STRING')) {
              option.value = this.advance().value;
            } else if (this.check('IDENTIFIER')) {
              option.value = this.advance().value;
            }
          }
        } else if (this.check('EQUALS')) {
          // value="label" format (where first is the value)
          this.advance(); // consume =
          option.value = first;
          if (this.check('STRING')) {
            option.label = this.advance().value;
          } else if (this.check('IDENTIFIER')) {
            option.label = this.advance().value;
          }
        } else {
          option.label = first;
          option.value = first;
        }
      }

      if (!option.value) {
        option.value = option.label?.toLowerCase().replace(/\s+/g, '-') || '';
      }

      if (parsed && (option.label || option.value)) {
        options.push(option);
      }

      if (this.check('COMMA')) {
        this.advance();
      } else if (!this.check('RBRACKET') && !parsed) {
        // Skip unknown token to avoid infinite loop
        this.advance();
      }
    }

    if (this.check('RBRACKET')) {
      this.advance();
    }

    return options;
  }

  private parseConfig(): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    this.advance(); // consume {

    while (!this.check('RBRACE') && !this.isAtEnd()) {
      // key: value
      if (this.check('IDENTIFIER')) {
        const key = this.advance().value;

        if (this.check('COLON')) {
          this.advance();

          if (this.check('STRING')) {
            config[key] = this.advance().value;
          } else if (this.check('NUMBER')) {
            config[key] = parseFloat(this.advance().value);
          } else if (this.check('BOOLEAN')) {
            config[key] = this.advance().value === 'true';
          } else if (this.check('LBRACKET')) {
            config[key] = this.parseArrayValue();
          } else if (this.check('LBRACE')) {
            config[key] = this.parseConfig();
          } else if (this.check('IDENTIFIER')) {
            config[key] = this.advance().value;
          }
        }
      }

      if (this.check('COMMA')) {
        this.advance();
      }
    }

    if (this.check('RBRACE')) {
      this.advance();
    }

    return config;
  }

  private parseArrayValue(): unknown[] {
    const arr: unknown[] = [];

    this.advance(); // consume [

    while (!this.check('RBRACKET') && !this.isAtEnd()) {
      let parsed = false;

      if (this.check('STRING')) {
        arr.push(this.advance().value);
        parsed = true;
      } else if (this.check('NUMBER')) {
        arr.push(parseFloat(this.advance().value));
        parsed = true;
      } else if (this.check('BOOLEAN')) {
        arr.push(this.advance().value === 'true');
        parsed = true;
      } else if (this.check('LBRACE')) {
        // Handle nested objects inside arrays
        arr.push(this.parseConfig());
        parsed = true;
      } else if (this.check('LBRACKET')) {
        // Handle nested arrays
        arr.push(this.parseArrayValue());
        parsed = true;
      } else if (this.check('IDENTIFIER')) {
        arr.push(this.advance().value);
        parsed = true;
      }

      if (this.check('COMMA')) {
        this.advance();
      } else if (!this.check('RBRACKET') && !parsed) {
        // Skip unknown token to avoid infinite loop
        this.advance();
      }
    }

    if (this.check('RBRACKET')) {
      this.advance();
    }

    return arr;
  }

  // Helper methods
  private check(...types: TokenType[]): boolean {
    if (this.isAtEnd()) return false;
    return types.includes(this.peek().type);
  }

  private checkNext(...types: TokenType[]): boolean {
    if (this.current + 1 >= this.tokens.length) return false;
    const nextToken = this.tokens[this.current + 1];
    return nextToken ? types.includes(nextToken.type) : false;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.current]!;
  }

  private previous(): Token {
    return this.tokens[this.current - 1]!;
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }
}
