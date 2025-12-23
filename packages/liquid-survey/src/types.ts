
// Survey node types
export type NodeType = 'start' | 'question' | 'message' | 'end';
export type QuestionType =
  | 'text'
  | 'textarea'      // Multi-line text input
  | 'rating'
  | 'choice'
  | 'multiChoice'
  | 'multiSelect'
  | 'nps'
  | 'date'
  | 'dateRange'
  | 'time'
  | 'combobox'
  | 'number'
  | 'color'
  | 'fileDropzone'
  | 'email'
  | 'phone'
  | 'url'
  | 'currency'
  | 'likert'
  | 'matrix'
  | 'location'
  | 'slider'
  | 'imageChoice'
  | 'signature'
  | 'range'
  | 'yesNo'
  | 'percentage'
  | 'dimensions'
  | 'imageLocation'
  | 'geolocation'
  | 'ranking'       // Drag-and-drop ordering
  | 'hidden'        // Hidden field for metadata
  | 'password'      // Secure password input
  | 'captcha'       // Bot prevention
  | 'audio'         // Voice/audio recording
  | 'video'         // Video recording
  | 'address';      // Structured address input

// Data classification for GDPR/CCPA compliance
export type DataClassification =
  | 'public'           // No restrictions
  | 'internal'         // Internal use only
  | 'confidential'     // Restricted access
  | 'pii'              // Personally Identifiable Information
  | 'sensitive_pii'    // Sensitive PII (health, financial, etc.)
  | 'phi';             // Protected Health Information

export type PIICategory =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'ssn'
  | 'dob'
  | 'financial'
  | 'health'
  | 'biometric'
  | 'location'
  | 'ip_address'
  | 'device_id'
  | 'other';

// Data handling configuration
export interface DataHandlingConfig {
  classification: DataClassification;
  piiCategories?: PIICategory[];
  // Retention period in days (null = indefinite)
  retentionDays?: number | null;
  // Whether to encrypt at rest
  encryptAtRest?: boolean;
  // Whether to mask in logs/exports
  maskInLogs?: boolean;
  // Whether to include in exports
  includeInExports?: boolean;
  // Consent requirement
  requiresExplicitConsent?: boolean;
  // Legal basis for processing (GDPR)
  legalBasis?: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
}

// Piping configuration
export interface PipingConfig {
  // Variable syntax: {{nodeId}} or {{nodeId.property}}
  variables: Map<string, unknown>;
  // Fallback value if variable not found
  defaultFallback?: string;
  // Custom formatters: {{nodeId|uppercase}}
  formatters?: Record<string, (value: unknown) => string>;
}

// Localization types
export interface LocalizationConfig {
  // Default language
  defaultLocale: string;  // e.g., 'en-US'
  // Supported languages
  supportedLocales: string[];
  // How to detect user's language
  detectionMethod: 'browser' | 'url' | 'cookie' | 'manual';
  // Fallback behavior
  fallbackLocale?: string;
  // Whether to show language selector
  showLanguageSelector?: boolean;
}

// Translatable string - can be a simple string or localized
export type TranslatableString = string | LocalizedString;

export interface LocalizedString {
  // Translation key for lookup
  key?: string;
  // Inline translations
  translations: Record<string, string>;  // locale -> translated text
  // Fallback if translation not found
  fallback?: string;
}

// Translation bundle for a survey
export interface TranslationBundle {
  locale: string;
  translations: Record<string, string>;  // key -> translated value
  // Plural forms
  plurals?: Record<string, PluralForms>;
}

export interface PluralForms {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

// Computed field types
export type ComputeFunction =
  | 'sum'       // sum(a, b, c)
  | 'average'   // average(a, b, c)
  | 'min'       // min(a, b, c)
  | 'max'       // max(a, b, c)
  | 'count'     // count(array)
  | 'concat'    // concat(a, b, c)
  | 'if'        // if(condition, trueVal, falseVal)
  | 'coalesce'  // coalesce(a, b, c) - first non-null
  | 'round'     // round(num, decimals)
  | 'abs'       // abs(num)
  | 'floor'     // floor(num)
  | 'ceil';     // ceil(num)

export interface ComputedField {
  id: string;
  name: string;
  // Expression to compute (e.g., "{{q1}} + {{q2}}" or "average({{q1}}, {{q2}}, {{q3}})")
  expression: string;
  // Type of the computed result
  resultType: 'number' | 'string' | 'boolean';
  // When to compute: 'onChange' (real-time) or 'onComplete' (at end)
  computeTiming: 'onChange' | 'onComplete';
  // Optional: store in response
  storeInResponse?: boolean;
  // Optional: display to user
  displayToUser?: boolean;
}

// Save & Resume configuration
export interface SaveResumeConfig {
  // Whether save & resume is enabled
  enabled: boolean;
  // Auto-save interval in seconds (0 = manual only)
  autoSaveInterval?: number;
  // How to identify returning users
  identificationMethod: 'token' | 'cookie' | 'email' | 'userId';
  // How long to keep partial responses (days)
  retentionDays: number;
  // Whether to show resume prompt on return
  showResumePrompt?: boolean;
  // Resume prompt message
  resumePromptMessage?: string;
  // Allow starting fresh even if partial exists
  allowStartFresh?: boolean;
}

// Partial response state
export interface PartialResponse {
  id: string;
  surveyInstanceId: string;
  // Identification token for resume
  resumeToken: string;
  // Current state
  currentNodeId: string;
  answers: Record<string, unknown>;
  visitedNodes: string[];
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  // Save metadata
  saveCount: number;
  lastSaveType: 'auto' | 'manual';
  // Device/browser info for security
  deviceFingerprint?: string;
}

// Progress indicator configuration
export interface ProgressConfig {
  // How to calculate progress
  mode: 'questions' | 'nodes' | 'pages' | 'weighted' | 'time';
  // Whether to show progress to user
  showProgress: boolean;
  // Progress display style
  displayStyle: 'percentage' | 'fraction' | 'bar' | 'steps' | 'dots';
  // Whether to show estimated time remaining
  showTimeRemaining?: boolean;
  // Custom weights for weighted mode (nodeId -> weight)
  weights?: Record<string, number>;
  // Whether to count skipped questions
  countSkipped?: boolean;
}

// Runtime progress state
export interface ProgressState {
  // Current progress (0-100)
  percentage: number;
  // Questions answered / total
  questionsAnswered: number;
  questionsTotal: number;
  // Estimated time remaining in seconds
  estimatedTimeRemaining?: number;
  // Current step / total steps (for step display)
  currentStep?: number;
  totalSteps?: number;
}

// Quota management
export interface QuotaConfig {
  id: string;
  name: string;
  description?: string;
  // Target number of responses
  target: number;
  // Current count (managed by runtime)
  current?: number;
  // What to do when quota is met
  onQuotaMet: 'terminate' | 'redirect' | 'continue';
  // Optional redirect URL when quota is met
  redirectUrl?: string;
  // Optional termination message
  terminationMessage?: string;
  // Condition that defines this quota segment
  condition: ConditionExpression;
  // Whether quota is active
  isActive: boolean;
  // Priority (lower = higher priority for quota checking)
  priority?: number;
}

// Quota tracking for a survey
export interface QuotaTracking {
  quotaId: string;
  surveyId: string;
  count: number;
  lastUpdated: Date;
  isQuotaMet: boolean;
}

// Theme configuration
export interface ThemeConfig {
  id: string;
  name: string;
  // Color scheme
  colors: ThemeColors;
  // Typography
  typography?: ThemeTypography;
  // Spacing/sizing
  spacing?: ThemeSpacing;
  // Border radius
  borderRadius?: ThemeBorderRadius;
  // Custom CSS
  customCss?: string;
  // Logo
  logo?: {
    url: string;
    alt?: string;
    position: 'top-left' | 'top-center' | 'top-right';
    maxHeight?: string;
  };
  // Background
  background?: {
    type: 'color' | 'gradient' | 'image';
    value: string;
    overlay?: string;
  };
}

export interface ThemeColors {
  primary: string;
  secondary?: string;
  accent?: string;
  background: string;
  surface?: string;
  text: string;
  textSecondary?: string;
  error: string;
  warning?: string;
  success?: string;
  border?: string;
  // Button colors
  buttonBackground?: string;
  buttonText?: string;
  buttonHover?: string;
  // Input colors
  inputBackground?: string;
  inputBorder?: string;
  inputFocus?: string;
}

export interface ThemeTypography {
  fontFamily?: string;
  headingFontFamily?: string;
  fontSize?: {
    xs?: string;
    sm?: string;
    base?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
  };
  fontWeight?: {
    normal?: number;
    medium?: number;
    bold?: number;
  };
  lineHeight?: {
    tight?: number;
    normal?: number;
    relaxed?: number;
  };
}

export interface ThemeSpacing {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

export interface ThemeBorderRadius {
  none?: string;
  sm?: string;
  md?: string;
  lg?: string;
  full?: string;
}

// Survey structure
export interface GraphSurvey {
  id: string;
  title: string;
  description?: string;
  nodes: Record<string, SurveyNode>;
  startNodeId: string;
  // Survey-level piping configuration
  pipingConfig?: {
    defaultFallback?: string;
    formatters?: string[]; // Available formatters: 'uppercase', 'lowercase', 'capitalize', 'currency', 'date'
  };
  // Default data handling for all questions
  defaultDataHandling?: DataHandlingConfig;
  // Privacy policy URL
  privacyPolicyUrl?: string;
  // Whether survey requires consent before starting
  requiresConsentScreen?: boolean;
  // Consent text to display
  consentText?: string;
  // Save & Resume configuration
  saveResumeConfig?: SaveResumeConfig;
  // Progress configuration
  progressConfig?: ProgressConfig;
  // Localization configuration
  localization?: LocalizationConfig;
  // Translation bundles
  translations?: TranslationBundle[];
  // Theme configuration
  theme?: ThemeConfig;
  // Theme preset (alternative to full theme)
  themePreset?: 'default' | 'minimal' | 'modern' | 'classic' | 'dark';
}

export interface SurveyNode {
  id: string;
  type: NodeType;
  content?: QuestionContent | MessageContent;
  next: NextStep[];
  // Additional fields for visualization
  isValid?: boolean;
  errors?: string[];
}

export interface NextStep {
  condition?: Condition;
  nodeId: string;
}

// Condition operators for comparisons
export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'greater'
  | 'less'
  | 'greaterOrEqual'
  | 'lessOrEqual'
  | 'contains'
  | 'notContains'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'matches';

export type ConditionValue = string | number | boolean | string[] | number[] | null;

// Complex condition expressions
export type ConditionExpression =
  | SimpleCondition      // Existing simple condition
  | AndCondition         // All conditions must be true
  | OrCondition          // Any condition must be true
  | NotCondition;        // Negate a condition

export interface SimpleCondition {
  type: 'simple';
  nodeId: string;        // Reference to the question node
  operator: ConditionOperator;
  value: ConditionValue;
}

export interface AndCondition {
  type: 'and';
  conditions: ConditionExpression[];
}

export interface OrCondition {
  type: 'or';
  conditions: ConditionExpression[];
}

export interface NotCondition {
  type: 'not';
  condition: ConditionExpression;
}

// Main Condition interface supporting both legacy and new expressions
export interface Condition {
  // Legacy simple condition (for backwards compatibility)
  operator?: ConditionOperator;
  value?: ConditionValue;
  // Reference node (for simple conditions without expression)
  nodeId?: string;
  // New expression-based condition
  expression?: ConditionExpression;
}

// Content types
export interface QuestionContent {
  question: string;
  description?: string;
  type: QuestionType;
  required?: boolean;
  validation?: ValidationRule;
  options?: QuestionOption[]; // For choice/multiChoice/multiSelect
  min?: number; // For rating/nps
  max?: number; // For rating/nps
  placeholder?: string; // For text/multiSelect/date
  searchable?: boolean; // For multiSelect - enables search in dropdown
  maxSelections?: number; // For multiSelect/multiChoice - max number of selections allowed
  minDate?: string; // For date/dateRange - minimum selectable date (ISO string)
  maxDate?: string; // For date/dateRange - maximum selectable date (ISO string)
  dateFormat?: string; // For date/dateRange - display format (e.g., "PPP", "MM/dd/yyyy")
  numberOfMonths?: number; // For dateRange - number of months to display (default 2)
  startDatePlaceholder?: string; // For dateRange - placeholder for start date
  endDatePlaceholder?: string; // For dateRange - placeholder for end date
  timeFormat?: '12' | '24'; // For time - 12-hour or 24-hour format (default '12')
  minTime?: string; // For time - minimum selectable time (format: "HH:mm")
  maxTime?: string; // For time - maximum selectable time (format: "HH:mm")
  step?: number; // For number - step increment value (default 1)
  unit?: string; // For number - unit label to display (e.g., "hours", "years")
  accept?: string; // For fileDropzone - accepted file types (e.g., "application/pdf,image/*")
  maxFileSize?: number; // For fileDropzone - maximum file size in bytes
  multiple?: boolean; // For fileDropzone - allow multiple file selection
  // Email specific
  emailValidation?: 'basic' | 'strict'; // For email - validation level (default 'basic')
  // Phone specific
  countryCode?: string; // For phone - default country code (e.g., "US", "GB")
  // Validation enforcement
  enforceValidation?: boolean; // When true and field is required, prevents proceeding with invalid input
  // URL specific
  urlProtocol?: 'http' | 'https' | 'both'; // For url - allowed protocols (default 'both')
  // Currency specific
  currency?: string; // For currency - currency code (e.g., "USD", "EUR")
  currencyPosition?: 'before' | 'after'; // For currency - symbol position (default 'before')
  // Likert specific
  likertScale?: number; // For likert - scale size (default 5, options: 3,5,7,9)
  likertLabels?: { start: string; end: string }; // For likert - custom labels
  // Matrix specific
  matrixRows?: string[]; // For matrix - row labels
  matrixColumns?: string[]; // For matrix - column labels
  matrixType?: 'radio' | 'checkbox' | 'rating'; // For matrix - cell type
  // Location specific
  locationTypes?: ('address' | 'city' | 'country' | 'coordinates')[]; // For location - what to capture
  // Slider specific
  sliderMin?: number; // For slider - minimum value (default 0)
  sliderMax?: number; // For slider - maximum value (default 100)
  sliderStep?: number; // For slider - step increment (default 1)
  sliderShowValue?: boolean; // For slider - show current value (default true)
  // Image Choice specific
  imageOptions?: Array<{ id: string; label: string; value: string; imageUrl: string }>; // For imageChoice - options with images
  // Range specific
  rangeType?: 'number' | 'date' | 'time'; // For range - type of range selection
  rangeLabels?: { start: string; end: string }; // For range - custom labels
  // Percentage specific
  percentageDecimals?: number; // For percentage - decimal places (default 0)
  // Dimensions specific
  dimensionType?: '2d' | '3d'; // For dimensions - 2D or 3D dimensions (default '2d')
  dimensionUnits?: string; // For dimensions - unit label (e.g., "px", "cm", "in")
  // Image Location specific
  imageLocationUrl?: string; // For imageLocation - URL of the image to mark
  imageLocationPoints?: Array<{ id: string; x: number; y: number; label: string }>; // For imageLocation - marked points
  maxPoints?: number; // For imageLocation - maximum number of points allowed
  // Geolocation specific
  geolocationDefaultLocation?: { lat: number; lng: number }; // For geolocation - default center point
  geolocationDefaultZoom?: number; // For geolocation - default zoom level (1-20)
  geolocationMapHeight?: string; // For geolocation - map container height (e.g., "400px")
  geolocationEnableUserLocation?: boolean; // For geolocation - whether to request user's location
  geolocationUseUserLocationByDefault?: boolean; // For geolocation - automatically use user location on load
  geolocationTileLayer?: string; // For geolocation - custom tile layer URL
  geolocationAttribution?: string; // For geolocation - map attribution text
  geolocationMaxLocations?: number; // For geolocation - maximum number of locations (1 for single, >1 for multi)
  geolocationMinLocations?: number; // For geolocation - minimum required locations
  geolocationAllowLabels?: boolean; // For geolocation - allow labeling each location (multi mode)
  geolocationShowList?: boolean; // For geolocation - show list view (multi mode)
  geolocationSearchEnabled?: boolean; // For geolocation - enable address search
  geolocationBoundaries?: { // For geolocation - optional boundary constraints
    north: number;
    south: number;
    east: number;
    west: number;
  };
  // Textarea specific
  textareaRows?: number; // For textarea - number of visible rows (default 4)
  textareaMaxRows?: number; // For textarea - max rows for auto-resize
  textareaResize?: 'none' | 'vertical' | 'horizontal' | 'both'; // For textarea - resize behavior
  // Ranking specific
  rankingItems?: Array<{ id: string; label: string; value: string }>; // For ranking - items to rank
  rankingMinSelections?: number; // For ranking - minimum items to rank
  rankingMaxSelections?: number; // For ranking - maximum items to rank (default all)
  // Hidden specific
  hiddenValue?: string | number | boolean; // For hidden - the stored value
  hiddenSource?: 'static' | 'context' | 'computed'; // For hidden - value source
  // Password specific
  passwordMinLength?: number; // For password - minimum length
  passwordRequireUppercase?: boolean; // For password - require uppercase
  passwordRequireLowercase?: boolean; // For password - require lowercase
  passwordRequireNumber?: boolean; // For password - require number
  passwordRequireSpecial?: boolean; // For password - require special char
  passwordShowStrength?: boolean; // For password - show strength indicator
  passwordConfirm?: boolean; // For password - require confirmation field
  // Captcha specific
  captchaType?: 'recaptcha' | 'hcaptcha' | 'turnstile' | 'simple'; // For captcha - provider type
  captchaSiteKey?: string; // For captcha - site key for provider
  captchaTheme?: 'light' | 'dark'; // For captcha - visual theme
  // Audio specific
  audioMaxDuration?: number; // For audio - max recording duration in seconds
  audioAllowPlayback?: boolean; // For audio - allow playback before submit
  audioAllowRetake?: boolean; // For audio - allow re-recording
  audioFormat?: 'mp3' | 'wav' | 'webm'; // For audio - output format
  // Video specific
  videoMaxDuration?: number; // For video - max recording duration in seconds
  videoAllowPlayback?: boolean; // For video - allow playback before submit
  videoAllowRetake?: boolean; // For video - allow re-recording
  videoMaxFileSize?: number; // For video - max file size in bytes
  videoResolution?: '480p' | '720p' | '1080p'; // For video - recording resolution
  videoFacingMode?: 'user' | 'environment'; // For video - camera facing mode
  // Address specific
  addressFields?: Array<'street' | 'street2' | 'city' | 'state' | 'zip' | 'country'>; // For address - which fields to show
  addressDefaultCountry?: string; // For address - default country code
  addressAutocomplete?: boolean; // For address - enable address autocomplete
  addressValidation?: 'none' | 'format' | 'verify'; // For address - validation level
  // Piping - allows inserting previous answers
  pipingEnabled?: boolean;
  pipingFallback?: string; // Fallback text if piped value not available
  // Data classification for this question
  dataHandling?: DataHandlingConfig;
  // Quick PII flag (shorthand for dataHandling.classification = 'pii')
  isPII?: boolean;
  // PII category if isPII is true
  piiCategory?: PIICategory;
  // Localization - alternative to simple strings
  questionLocalized?: LocalizedString;
  descriptionLocalized?: LocalizedString;
  placeholderLocalized?: LocalizedString;
  optionsLocalized?: Array<{
    id: string;
    label: LocalizedString;
    value: string;
  }>;
}

export interface MessageContent {
  message: string;
  title?: string;
  // Localization
  messageLocalized?: LocalizedString;
  titleLocalized?: LocalizedString;
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface ValidationRule {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  required?: boolean;
  errorMessage?: string;
  // Localized error message
  errorMessageLocalized?: LocalizedString;
}

// Survey template types
export interface SurveyTemplate {
  id: string;
  organizationId: string;
  templateKey: string;
  version: number;
  isLatest: boolean;
  name: string;
  description?: string;
  graph: GraphSurvey;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

// Survey instance types
export interface SurveyInstance {
  id: string;
  templateId: string;
  templateVersion: number;
  token: string;
  context?: Record<string, unknown>;
  compiledSurvey: GraphSurvey;
  status: 'pending' | 'started' | 'completed' | 'expired';
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Survey response types
export interface SurveyResponse {
  id: string;
  surveyInstanceId: string;
  answers: Record<string, unknown>; // { questionId: value }
  metadata?: ResponseMetadata;
  startedAt?: Date;
  completedAt: Date;

  // Path tracking (optional, for detailed analysis)
  path?: ResponsePath;

  // Answers with denormalized context (optional, for standalone interpretation)
  answersWithContext?: AnswerWithContext[];

  // Survey version info (optional, for self-contained responses)
  surveyVersion?: SurveyVersionInfo;

  // Consent tracking
  consent?: {
    consentGiven: boolean;
    consentTimestamp: Date;
    consentVersion?: string;
    ipAddress?: string;
  };

  // Data subject rights
  dataSubjectId?: string;  // For GDPR data subject requests

  // Whether this was a resumed response
  wasResumed?: boolean;
  resumeCount?: number;

  // Language used for this response
  locale?: string;
}

// Denormalized version info for self-contained responses
export interface SurveyVersionInfo {
  templateId: string;
  templateKey: string;
  version: number;
  surveyTitle: string;
  surveyDescription?: string;
  // Snapshot of survey at response time (optional, for full portability)
  surveySnapshot?: GraphSurvey;
}

export interface ResponsePath {
  // Ordered sequence of node IDs visited
  nodeSequence: string[];

  // Branch decisions made during the survey
  branchPoints: BranchPoint[];

  // Nodes that existed in survey but weren't reached due to branching
  skippedNodes: string[];

  // How the survey ended
  completionType: 'full' | 'partial' | 'abandoned';
}

export interface BranchPoint {
  // The node where branching occurred
  nodeId: string;

  // The condition that was evaluated
  condition: Condition;

  // The answer value that triggered this branch
  evaluatedValue: unknown;

  // The node ID that was chosen based on the condition
  chosenPath: string;

  // Other possible paths that weren't taken
  alternativePaths: string[];
}

export interface AnswerWithContext {
  nodeId: string;

  // Denormalized from survey (for standalone interpretation)
  questionText: string;
  questionType: QuestionType;

  // For choice questions - what options were available
  options?: QuestionOption[];

  // The actual answer
  answer: unknown;

  // Human-readable answer (e.g., "Very Satisfied" instead of "5")
  answerLabel?: string;

  // Position in respondent's journey (1-based)
  orderInPath: number;

  // Time spent on this question (milliseconds)
  timeSpent?: number;

  // How many times the answer was changed
  revisionCount?: number;
}

export interface ResponseMetadata {
  browser?: string;
  device?: string;
  duration?: number; // in seconds
  ip?: string;
  location?: {
    country?: string;
    city?: string;
  };
  nodeMetrics?: NodeMetrics;
}

// Node interaction tracking types
export interface NodeMetrics {
  [nodeId: string]: NodeInteraction;
}

export interface NodeInteraction {
  nodeId: string;
  nodeType: NodeType;
  firstVisitTime: number; // timestamp
  lastVisitTime: number; // timestamp
  totalTimeSpent: number; // milliseconds
  visitCount: number;
  answerChanges: number; // how many times answer was modified
  completedAt?: number; // timestamp when user moved to next node
  interactions: InteractionEvent[];
}

export interface InteractionEvent {
  type: 'visit' | 'answer_change' | 'focus' | 'blur' | 'back_navigation' | 'forward_navigation';
  timestamp: number;
  value?: unknown; // for answer_change events
}

// Survey runtime types
export interface SurveyProgress {
  currentNodeId: string;
  answers: Record<string, unknown>;
  visitedNodes: string[];
  startedAt: Date;
  // Resume information
  resumeToken?: string;
  lastSavedAt?: Date;
  saveCount?: number;
  // Progress state
  progress?: ProgressState;
}

// Analytics types
export interface SurveyAnalytics {
  templateId: string;
  totalResponses: number;
  completionRate: number;
  avgDuration: number;
  questionStats: Record<string, QuestionStats>;
}

export interface QuestionStats {
  questionId: string;
  type: QuestionType;
  responses: number;
  skipped: number;
  avgValue?: number; // For rating/nps
  distribution?: Record<string, number>; // For choice/multiChoice
}

// Context integration types
export interface SurveyContext {
  [key: string]: unknown;
  // Common fields
  userId?: string;
  userName?: string;
  userEmail?: string;
  organizationName?: string;
  customData?: Record<string, unknown>;
}

// Builder types
export interface SurveyBuilderState {
  survey: GraphSurvey;
  selectedNodeId?: string;
  validationErrors: Record<string, string>;
  isDirty: boolean;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface GraphNode extends SurveyNode {
  position: NodePosition;
}

// Validation error types
export type ValidationErrorCode =
  | 'MISSING_START_NODE'
  | 'MISSING_END_NODE'
  | 'ORPHAN_NODE'
  | 'UNREACHABLE_NODE'
  | 'CIRCULAR_REFERENCE'
  | 'INVALID_NEXT_REFERENCE'
  | 'EMPTY_QUESTION'
  | 'MISSING_OPTIONS'
  | 'DUPLICATE_NODE_ID';

export interface SurveyValidationError {
  code: ValidationErrorCode;
  nodeId?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface SurveyValidationResult {
  isValid: boolean;
  errors: SurveyValidationError[];
  warnings: SurveyValidationError[];
}

// Type guards
export function isQuestionContent(content: QuestionContent | MessageContent | undefined): content is QuestionContent {
  return content !== undefined && 'type' in content && 'question' in content;
}

export function isMessageContent(content: QuestionContent | MessageContent | undefined): content is MessageContent {
  return content !== undefined && 'message' in content && !('type' in content);
}

export function isQuestionNode(node: SurveyNode): node is SurveyNode & { content: QuestionContent } {
  return node.type === 'question' && isQuestionContent(node.content);
}

export function isMessageNode(node: SurveyNode): node is SurveyNode & { content: MessageContent } {
  return (node.type === 'start' || node.type === 'end' || node.type === 'message') && isMessageContent(node.content);
}