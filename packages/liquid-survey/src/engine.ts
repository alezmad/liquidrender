import type {
  GraphSurvey,
  SurveyNode,
  Condition,
  SurveyProgress,
  SurveyContext,
  SurveyResponse,
  BranchPoint,
  ResponsePath,
  AnswerWithContext,
  SurveyVersionInfo,
  NodeMetrics
} from './types';
import { isQuestionContent } from './types';

export class SurveyEngine {
  private survey: GraphSurvey;
  private context: SurveyContext;
  private progress: SurveyProgress;
  private branchPoints: BranchPoint[] = [];

  constructor(survey: GraphSurvey, context: SurveyContext = {}) {
    this.survey = survey;
    this.context = context;
    this.progress = {
      currentNodeId: survey.startNodeId,
      answers: {},
      visitedNodes: [survey.startNodeId],
      startedAt: new Date()
    };
  }

  /**
   * Get the current node in the survey
   */
  getCurrentNode(): SurveyNode | null {
    return this.survey.nodes[this.progress.currentNodeId] || null;
  }

  /**
   * Get the current progress
   */
  getProgress(): SurveyProgress {
    return { ...this.progress };
  }

  /**
   * Set progress (for resuming surveys)
   */
  setProgress(progress: SurveyProgress): void {
    this.progress = { ...progress };
  }

  /**
   * Answer current question and move to next node
   */
  answerAndProgress(answer: unknown): SurveyNode | null {
    const currentNode = this.getCurrentNode();
    if (!currentNode || currentNode.type !== 'question') {
      return null;
    }

    // Store the answer
    this.progress.answers[currentNode.id] = answer;

    // Find the next node based on conditions
    const nextNodeId = this.findNextNode(currentNode, answer);
    if (!nextNodeId) {
      return null;
    }

    // Update progress
    this.progress.currentNodeId = nextNodeId;
    if (!this.progress.visitedNodes.includes(nextNodeId)) {
      this.progress.visitedNodes.push(nextNodeId);
    }

    return this.survey.nodes[nextNodeId] || null;
  }

  /**
   * Skip current question (if allowed) and move to next
   */
  skipAndProgress(): SurveyNode | null {
    const currentNode = this.getCurrentNode();
    if (!currentNode || !isQuestionContent(currentNode.content)) {
      return null;
    }

    if (currentNode.content.required) {
      throw new Error('Cannot skip required question');
    }

    return this.answerAndProgress(null);
  }

  /**
   * Navigate to a specific node (for back navigation)
   */
  navigateToNode(nodeId: string): SurveyNode | null {
    if (!this.survey.nodes[nodeId]) {
      return null;
    }

    this.progress.currentNodeId = nodeId;
    if (!this.progress.visitedNodes.includes(nodeId)) {
      this.progress.visitedNodes.push(nodeId);
    }

    return this.survey.nodes[nodeId];
  }

  /**
   * Get all answers
   */
  getAnswers(): Record<string, unknown> {
    return { ...this.progress.answers };
  }

  /**
   * Get answer for a specific node
   */
  getAnswer(nodeId: string): unknown {
    return this.progress.answers[nodeId];
  }

  /**
   * Set answer for a specific node (for restoring progress)
   */
  setAnswer(nodeId: string, answer: unknown): void {
    this.progress.answers[nodeId] = answer;
  }

  /**
   * Restore answers from a saved state
   */
  restoreAnswers(answers: Record<string, unknown>): void {
    this.progress.answers = { ...answers };
  }

  /**
   * Check if survey is completed
   */
  isCompleted(): boolean {
    const currentNode = this.getCurrentNode();
    return currentNode?.type === 'end';
  }

  /**
   * Get survey completion percentage based on reachable questions from current path
   */
  getCompletionPercentage(): number {
    // Count only reachable questions from start node
    const reachableQuestions = this.getReachableQuestionCount();
    if (reachableQuestions === 0) return 100;

    const answeredQuestions = Object.keys(this.progress.answers).length;
    return Math.min(100, Math.round((answeredQuestions / reachableQuestions) * 100));
  }

  /**
   * Count reachable question nodes from start (BFS traversal)
   */
  private getReachableQuestionCount(): number {
    const visited = new Set<string>();
    const queue: string[] = [this.survey.startNodeId];
    let questionCount = 0;

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = this.survey.nodes[nodeId];
      if (!node) continue;

      if (node.type === 'question') {
        questionCount++;
      }

      // Add all next nodes to queue
      for (const next of node.next) {
        if (!visited.has(next.nodeId)) {
          queue.push(next.nodeId);
        }
      }
    }

    return questionCount;
  }

  /**
   * Validate answer for current question
   */
  validateAnswer(answer: unknown): { valid: boolean; error?: string } {
    const currentNode = this.getCurrentNode();
    if (!currentNode || !isQuestionContent(currentNode.content)) {
      return { valid: false, error: 'Not a question node' };
    }

    const content = currentNode.content;

    // Required check
    if (content.required && (answer === null || answer === undefined || answer === '')) {
      return { valid: false, error: 'This field is required' };
    }

    // Skip validation for null/undefined answers on optional fields
    if (answer === null || answer === undefined) {
      return { valid: true };
    }

    // Type-specific validation
    switch (content.type) {
      // String types
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
      case 'color':
        if (typeof answer !== 'string') {
          return { valid: false, error: 'Must be a string' };
        }
        if (content.type === 'text' && content.validation) {
          const answerStr = answer;
          if (content.validation.minLength && answerStr.length < content.validation.minLength) {
            return {
              valid: false,
              error: content.validation.errorMessage || `Minimum length is ${content.validation.minLength}`
            };
          }
          if (content.validation.maxLength && answerStr.length > content.validation.maxLength) {
            return {
              valid: false,
              error: content.validation.errorMessage || `Maximum length is ${content.validation.maxLength}`
            };
          }
          if (content.validation.pattern) {
            const regex = new RegExp(content.validation.pattern);
            if (!regex.test(answerStr)) {
              return {
                valid: false,
                error: content.validation.errorMessage || 'Invalid format'
              };
            }
          }
        }
        break;

      // Numeric types
      case 'number':
      case 'rating':
      case 'nps':
      case 'slider':
      case 'percentage':
      case 'currency':
      case 'likert': {
        const numAnswer = Number(answer);
        if (isNaN(numAnswer)) {
          return { valid: false, error: 'Must be a number' };
        }
        if (content.min !== undefined && numAnswer < content.min) {
          return { valid: false, error: `Minimum value is ${content.min}` };
        }
        if (content.max !== undefined && numAnswer > content.max) {
          return { valid: false, error: `Maximum value is ${content.max}` };
        }
        // Slider-specific validation
        if (content.type === 'slider') {
          if (content.sliderMin !== undefined && numAnswer < content.sliderMin) {
            return { valid: false, error: `Minimum value is ${content.sliderMin}` };
          }
          if (content.sliderMax !== undefined && numAnswer > content.sliderMax) {
            return { valid: false, error: `Maximum value is ${content.sliderMax}` };
          }
        }
        break;
      }

      // Boolean type
      case 'yesNo':
        if (typeof answer !== 'boolean') {
          return { valid: false, error: 'Must be true or false' };
        }
        break;

      // Single choice types
      case 'choice':
      case 'combobox':
        if (typeof answer !== 'string') {
          return { valid: false, error: 'Must be a string' };
        }
        if (content.options && !content.options.find(opt => opt.value === answer)) {
          return { valid: false, error: 'Invalid choice' };
        }
        break;

      case 'imageChoice':
        if (typeof answer !== 'string') {
          return { valid: false, error: 'Must be a string' };
        }
        if (content.imageOptions && !content.imageOptions.find(opt => opt.value === answer)) {
          return { valid: false, error: 'Invalid choice' };
        }
        break;

      // Multi-choice types
      case 'multiChoice':
      case 'multiSelect':
        if (!Array.isArray(answer)) {
          return { valid: false, error: 'Must be an array' };
        }
        if (content.options) {
          const validValues = content.options.map(opt => opt.value);
          const invalidValues = (answer as string[]).filter(val => !validValues.includes(val));
          if (invalidValues.length > 0) {
            return { valid: false, error: 'Invalid choices' };
          }
        }
        if (content.maxSelections && (answer as string[]).length > content.maxSelections) {
          return { valid: false, error: `Maximum ${content.maxSelections} selections allowed` };
        }
        break;

      // Date/time types
      case 'date':
      case 'time':
        if (typeof answer !== 'string') {
          return { valid: false, error: 'Must be a string' };
        }
        break;

      case 'dateRange':
        if (!answer || typeof answer !== 'object') {
          return { valid: false, error: 'Must be an object with start/end' };
        }
        if (typeof (answer as Record<string, unknown>).start !== 'string') {
          return { valid: false, error: 'Start date must be a string' };
        }
        if (typeof (answer as Record<string, unknown>).end !== 'string') {
          return { valid: false, error: 'End date must be a string' };
        }
        break;

      // Range type
      case 'range':
        if (!answer || typeof answer !== 'object') {
          return { valid: false, error: 'Must be an object with min/max' };
        }
        if (typeof (answer as Record<string, unknown>).min !== 'number') {
          return { valid: false, error: 'Min must be a number' };
        }
        if (typeof (answer as Record<string, unknown>).max !== 'number') {
          return { valid: false, error: 'Max must be a number' };
        }
        break;

      // Dimensions type
      case 'dimensions':
        if (!answer || typeof answer !== 'object') {
          return { valid: false, error: 'Must be an object with width/height' };
        }
        if (typeof (answer as Record<string, unknown>).width !== 'number') {
          return { valid: false, error: 'Width must be a number' };
        }
        if (typeof (answer as Record<string, unknown>).height !== 'number') {
          return { valid: false, error: 'Height must be a number' };
        }
        break;

      // Geolocation type
      case 'geolocation':
        if (Array.isArray(answer)) {
          for (const loc of answer) {
            if (!loc || typeof loc !== 'object') {
              return { valid: false, error: 'Each location must be an object' };
            }
            if (typeof (loc as Record<string, unknown>).lat !== 'number' ||
                typeof (loc as Record<string, unknown>).lng !== 'number') {
              return { valid: false, error: 'Location must have lat/lng numbers' };
            }
          }
        } else if (answer && typeof answer === 'object') {
          if (typeof (answer as Record<string, unknown>).lat !== 'number' ||
              typeof (answer as Record<string, unknown>).lng !== 'number') {
            return { valid: false, error: 'Location must have lat/lng numbers' };
          }
        } else {
          return { valid: false, error: 'Must be a location object or array' };
        }
        break;

      // Matrix type
      case 'matrix':
        if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
          return { valid: false, error: 'Must be an object mapping rows to values' };
        }
        break;

      // Types that accept any value (file, signature, location, imageLocation)
      case 'fileDropzone':
      case 'signature':
      case 'location':
      case 'imageLocation':
        // These types have complex values that are validated at the component level
        break;
    }

    return { valid: true };
  }

  /**
   * Find next node based on conditions
   */
  private findNextNode(currentNode: SurveyNode, answer: unknown): string | null {
    // Process answer with context
    const processedAnswer = this.processAnswerWithContext(answer);

    // Collect all conditional routes for branch tracking
    const conditionalRoutes = currentNode.next.filter(n => n.condition);

    // 1) Try to find a matching conditional route first
    for (const next of currentNode.next) {
      if (next.condition && this.evaluateCondition(next.condition, processedAnswer)) {
        // Track this branch point
        if (conditionalRoutes.length > 1 || currentNode.next.length > 1) {
          this.branchPoints.push({
            nodeId: currentNode.id,
            condition: next.condition,
            evaluatedValue: processedAnswer,
            chosenPath: next.nodeId,
            alternativePaths: currentNode.next
              .filter(n => n.nodeId !== next.nodeId)
              .map(n => n.nodeId)
          });
        }
        return next.nodeId;
      }
    }

    // 2) Fallback to the first non-conditional route ("otherwise")
    const fallback = currentNode.next.find(n => !n.condition);
    if (fallback) return fallback.nodeId;

    // 3) If nothing available, return null
    return null;
  }

  /**
   * Process answer with context interpolation
   */
  private processAnswerWithContext(answer: unknown): unknown {
    if (typeof answer === 'string') {
      // Replace context variables in answer
      return answer.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = this.context[key];
        return value !== undefined ? String(value) : match;
      });
    }
    return answer;
  }

  /**
   * Evaluate a condition against an answer
   */
  private evaluateCondition(condition: Condition, answer: unknown): boolean {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return answer === value;
      
      case 'notEquals':
        return answer !== value;
      
      case 'greater':
        return Number(answer) > Number(value);
      
      case 'greaterOrEqual':
        return Number(answer) >= Number(value);
      
      case 'less':
        return Number(answer) < Number(value);
      
      case 'lessOrEqual':
        return Number(answer) <= Number(value);
      
      case 'contains': {
        // If answer is an array (e.g., multi-select), check membership
        if (Array.isArray(answer)) {
          return (answer as unknown[]).includes(value as never);
        }
        return String(answer).toLowerCase().includes(String(value).toLowerCase());
      }
      
      case 'in':
        return Array.isArray(value) ? (value as unknown[]).includes(answer) : false;
      
      case 'notIn':
        return Array.isArray(value) ? !(value as unknown[]).includes(answer) : true;
      
      default:
        return false;
    }
  }

  /**
   * Get previous question node
   */
  getPreviousQuestionNode(): SurveyNode | null {
    const visitedQuestions = this.progress.visitedNodes
      .map(nodeId => this.survey.nodes[nodeId])
      .filter(node => node?.type === 'question');

    if (visitedQuestions.length <= 1) return null;

    return visitedQuestions[visitedQuestions.length - 2] || null;
  }

  /**
   * Can go back to previous question
   */
  canGoBack(): boolean {
    return this.getPreviousQuestionNode() !== null;
  }

  /**
   * Go back to previous question
   */
  goBack(): SurveyNode | null {
    const prevNode = this.getPreviousQuestionNode();
    if (!prevNode) return null;

    this.progress.currentNodeId = prevNode.id;
    return prevNode;
  }

  /**
   * Navigate to next node
   */
  next(answer?: unknown): SurveyNode | null {
    const currentNode = this.getCurrentNode();
    if (!currentNode) return null;

    // If it's a question node and no answer provided, use current answer
    if (currentNode.type === 'question' && answer !== undefined) {
      this.setAnswer(currentNode.id, answer);
    }

    // Find next node
    const nextNodeId = this.findNextNode(currentNode, answer || this.getAnswer(currentNode.id));
    if (!nextNodeId) return null;

    // Update progress
    this.progress.currentNodeId = nextNodeId;
    if (!this.progress.visitedNodes.includes(nextNodeId)) {
      this.progress.visitedNodes.push(nextNodeId);
    }

    return this.survey.nodes[nextNodeId] || null;
  }

  /**
   * Navigate back to previous node (alias for goBack)
   */
  back(): SurveyNode | null {
    return this.goBack();
  }

  /**
   * Get progress as a percentage
   */
  getProgressPercentage(): number {
    return this.getCompletionPercentage();
  }

  /**
   * Serialize progress for persistence (localStorage, database, etc.)
   */
  serialize(): string {
    return JSON.stringify({
      currentNodeId: this.progress.currentNodeId,
      answers: this.progress.answers,
      visitedNodes: this.progress.visitedNodes,
      startedAt: this.progress.startedAt.toISOString()
    });
  }

  /**
   * Restore progress from serialized data
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.progress = {
        currentNodeId: parsed.currentNodeId,
        answers: parsed.answers || {},
        visitedNodes: parsed.visitedNodes || [this.survey.startNodeId],
        startedAt: new Date(parsed.startedAt)
      };
    } catch {
      // If parsing fails, reset to initial state
      this.progress = {
        currentNodeId: this.survey.startNodeId,
        answers: {},
        visitedNodes: [this.survey.startNodeId],
        startedAt: new Date()
      };
    }
  }

  /**
   * Get the navigation history (ordered list of visited question nodes)
   */
  getNavigationHistory(): SurveyNode[] {
    return this.progress.visitedNodes
      .map(nodeId => this.survey.nodes[nodeId])
      .filter((node): node is SurveyNode => node !== undefined && node.type === 'question');
  }

  /**
   * Check if a specific node has been visited
   */
  hasVisited(nodeId: string): boolean {
    return this.progress.visitedNodes.includes(nodeId);
  }

  /**
   * Get the survey context
   */
  getContext(): SurveyContext {
    return { ...this.context };
  }

  /**
   * Update the survey context
   */
  updateContext(updates: Partial<SurveyContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Get recorded branch points
   */
  getBranchPoints(): BranchPoint[] {
    return [...this.branchPoints];
  }

  /**
   * Build the response path from current state
   */
  buildResponsePath(): ResponsePath {
    // Get all question node IDs in the survey
    const allQuestionNodes = Object.values(this.survey.nodes)
      .filter(node => node.type === 'question')
      .map(node => node.id);

    // Determine skipped nodes (questions not visited)
    const skippedNodes = allQuestionNodes.filter(
      nodeId => !this.progress.visitedNodes.includes(nodeId)
    );

    // Determine completion type
    const currentNode = this.getCurrentNode();
    let completionType: 'full' | 'partial' | 'abandoned' = 'partial';
    if (currentNode?.type === 'end') {
      completionType = 'full';
    }

    return {
      nodeSequence: [...this.progress.visitedNodes],
      branchPoints: [...this.branchPoints],
      skippedNodes,
      completionType
    };
  }

  /**
   * Build answers with context for standalone interpretation
   */
  buildAnswersWithContext(nodeMetrics?: NodeMetrics): AnswerWithContext[] {
    const answersWithContext: AnswerWithContext[] = [];
    let order = 0;

    for (const nodeId of this.progress.visitedNodes) {
      const node = this.survey.nodes[nodeId];
      if (!node || !isQuestionContent(node.content)) continue;

      const answer = this.progress.answers[nodeId];
      if (answer === undefined) continue;

      order++;
      const content = node.content;

      // Get human-readable label for the answer
      let answerLabel: string | undefined;
      if (content.options && typeof answer === 'string') {
        const option = content.options.find(opt => opt.value === answer);
        answerLabel = option?.label;
      } else if (content.imageOptions && typeof answer === 'string') {
        const option = content.imageOptions.find(opt => opt.value === answer);
        answerLabel = option?.label;
      } else if (Array.isArray(answer) && content.options) {
        const labels = (answer as string[])
          .map(val => content.options?.find(opt => opt.value === val)?.label)
          .filter(Boolean);
        answerLabel = labels.join(', ');
      }

      const metrics = nodeMetrics?.[nodeId];

      answersWithContext.push({
        nodeId,
        questionText: content.question,
        questionType: content.type,
        options: content.options,
        answer,
        answerLabel,
        orderInPath: order,
        timeSpent: metrics?.totalTimeSpent,
        revisionCount: metrics?.answerChanges
      });
    }

    return answersWithContext;
  }

  /**
   * Build a complete enhanced response
   * @param responseId - Unique ID for this response
   * @param surveyInstanceId - ID of the survey instance
   * @param options - Optional configuration
   * @param options.nodeMetrics - Node interaction metrics
   * @param options.versionInfo - Survey version info for standalone responses
   * @param options.includeSnapshot - Whether to include full survey in response
   */
  buildEnhancedResponse(
    responseId: string,
    surveyInstanceId: string,
    options?: {
      nodeMetrics?: NodeMetrics;
      versionInfo?: Omit<SurveyVersionInfo, 'surveySnapshot'>;
      includeSnapshot?: boolean;
    }
  ): SurveyResponse {
    const now = new Date();
    const path = this.buildResponsePath();

    // Mark as abandoned if not at end node
    if (path.completionType === 'partial') {
      path.completionType = 'abandoned';
    }

    // Build version info if provided
    let surveyVersion: SurveyVersionInfo | undefined;
    if (options?.versionInfo) {
      surveyVersion = {
        ...options.versionInfo,
        surveySnapshot: options.includeSnapshot ? this.survey : undefined
      };
    }

    return {
      id: responseId,
      surveyInstanceId,
      answers: { ...this.progress.answers },
      path,
      answersWithContext: this.buildAnswersWithContext(options?.nodeMetrics),
      surveyVersion,
      metadata: options?.nodeMetrics ? { nodeMetrics: options.nodeMetrics } : undefined,
      startedAt: this.progress.startedAt,
      completedAt: now
    };
  }

  /**
   * Get the survey being executed
   */
  getSurvey(): GraphSurvey {
    return this.survey;
  }
}