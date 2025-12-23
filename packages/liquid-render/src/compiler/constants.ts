// Liquid Render DSL Constants
// Shared constants for LiquidCode (UI) and LiquidSurvey (flows)

// ============================================================================
// PART I: LiquidCode (UI) Constants
// ============================================================================

// Core UI types (indexed 0-9) - most common types
export const UI_TYPE_INDICES: Record<number, { code: string; type: string }> = {
  0: { code: 'Cn', type: 'container' },
  1: { code: 'Kp', type: 'kpi' },
  2: { code: 'Br', type: 'bar' },
  3: { code: 'Ln', type: 'line' },
  4: { code: 'Pi', type: 'pie' },
  5: { code: 'Tb', type: 'table' },
  6: { code: 'Fm', type: 'form' },
  7: { code: 'Ls', type: 'list' },
  8: { code: 'Cd', type: 'card' },
  9: { code: 'Md', type: 'modal' },
};

// Extended UI types (2-char codes)
export const UI_TYPE_CODES: Record<string, string> = {
  // Core (also indexed)
  Cn: 'container',
  Kp: 'kpi',
  Br: 'bar',
  Ln: 'line',
  Pi: 'pie',
  Tb: 'table',
  Fm: 'form',
  Ls: 'list',
  Cd: 'card',
  Md: 'modal',
  // Layout & Structure
  Gd: 'grid',
  Sk: 'stack',
  Sp: 'split',
  Dw: 'drawer',
  Sh: 'sheet',
  Pp: 'popover',
  Tl: 'tooltip',
  Ac: 'accordion',
  // Data Display
  Tx: 'text',
  Hd: 'heading',
  Ic: 'icon',
  Im: 'image',
  Av: 'avatar',
  Tg: 'tag',
  Pg: 'progress',
  Gn: 'gauge',
  Rt: 'rating',
  Sl: 'sparkline',
  // Form Controls
  Bt: 'button',
  In: 'input',
  Se: 'select',
  Sw: 'switch',
  Ck: 'checkbox',
  Rd: 'radio',
  Rg: 'range',
  Cl: 'color',
  Dt: 'date',
  Tm: 'time',
  Up: 'upload',
  Ot: 'otp',
  // Charts
  Hm: 'heatmap',
  Sn: 'sankey',
  Tr: 'tree',
  Or: 'org',
  Mp: 'map',
  Fl: 'flow',
  // Media
  Vd: 'video',
  Au: 'audio',
  Cr: 'carousel',
  Lb: 'lightbox',
  // Interactive
  St: 'stepper',
  Kb: 'kanban',
  Ca: 'calendar',
  Ti: 'timeline',
};

// Reverse lookup: type name -> code
export const UI_TYPE_TO_CODE = Object.fromEntries(
  Object.entries(UI_TYPE_CODES).map(([code, type]) => [type, code])
) as Record<string, string>;

// Index -> type name
export const UI_INDEX_TO_TYPE = Object.fromEntries(
  Object.entries(UI_TYPE_INDICES).map(([idx, { type }]) => [Number(idx), type])
) as Record<number, string>;

// Type name -> index (for types that have indices)
export const UI_TYPE_TO_INDEX = Object.fromEntries(
  Object.entries(UI_TYPE_INDICES).map(([idx, { type }]) => [type, Number(idx)])
) as Record<string, number>;

// UI Modifier symbols
export const UI_MODIFIER_SYMBOLS = {
  // Layout
  priority: '!',    // !h, !p, !s, !0-9
  flex: '^',        // ^f, ^s, ^g, ^c
  span: '*',        // *1-9, *f, *h, *t, *q
  // Signal
  declare: '@',     // @signal
  emit: '>',        // >signal or >/1 (layer)
  receive: '<',     // <signal or /<  (close layer)
  bidirectional: '<>',  // <>signal
  // Style
  color: '#',       // #red, #?>=80:green
  size: '%',        // %lg, %sm
} as const;

// Priority values
export const UI_PRIORITY_VALUES: Record<string, number> = {
  h: 100,  // hero
  p: 75,   // primary
  s: 50,   // secondary
};

// Flex values
export const UI_FLEX_VALUES: Record<string, string> = {
  f: 'fixed',
  s: 'shrink',
  g: 'grow',
  c: 'collapse',
};

// Span values
export const UI_SPAN_VALUES: Record<string, number | string> = {
  f: 'full',
  h: 'half',
  t: 'third',
  q: 'quarter',
};

// ============================================================================
// PART II: LiquidSurvey Constants
// ============================================================================

// Node type symbols
export const NODE_TYPE_SYMBOLS = {
  start: '>',
  question: '?',
  message: '!',
  end: '<',
} as const;

export const SYMBOL_TO_NODE_TYPE = {
  '>': 'start',
  '?': 'question',
  '!': 'message',
  '<': 'end',
} as const;

// Question type codes (2-char)
export const QUESTION_TYPE_CODES = {
  text: 'Tx',
  textarea: 'Ta',
  rating: 'Rt',
  choice: 'Ch',
  multiChoice: 'Mc',
  multiSelect: 'Ms',
  nps: 'Np',
  date: 'Dt',
  dateRange: 'Dr',
  time: 'Tm',
  combobox: 'Cb',
  number: 'Nu',
  color: 'Cl',
  fileDropzone: 'Fd',
  email: 'Em',
  phone: 'Ph',
  url: 'Ur',
  currency: 'Cu',
  likert: 'Lk',
  matrix: 'Mx',
  location: 'Lo',
  slider: 'Sl',
  imageChoice: 'Ic',
  signature: 'Sg',
  range: 'Rg',
  yesNo: 'Yn',
  percentage: 'Pc',
  dimensions: 'Dm',
  imageLocation: 'Il',
  geolocation: 'Gl',
  ranking: 'Rk',
  hidden: 'Hd',
  password: 'Pw',
  captcha: 'Cp',
  audio: 'Au',
  video: 'Vd',
  address: 'Ad',
} as const;

export const CODE_TO_QUESTION_TYPE = Object.fromEntries(
  Object.entries(QUESTION_TYPE_CODES).map(([k, v]) => [v, k])
) as Record<string, keyof typeof QUESTION_TYPE_CODES>;

// Condition operators - keys match ConditionOperator type
export const CONDITION_OPERATORS = {
  equals: '?=',
  notEquals: '?!=',
  greaterOrEqual: '?>=',
  lessOrEqual: '?<=',
  greater: '?>',
  less: '?<',
  in: '?in',
  notIn: '?!in',
  contains: '?contains',
  notContains: '?!contains',
  isEmpty: '?empty',
  isNotEmpty: '?!empty',
  matches: '?~',
} as const;

export const OPERATOR_TO_CONDITION = {
  '?=': 'equals',
  '?!=': 'notEquals',
  '?>=': 'greaterOrEqual',
  '?<=': 'lessOrEqual',
  '?>': 'greater',
  '?<': 'less',
  '?in': 'in',
  '?!in': 'notIn',
  '?contains': 'contains',
  '?!contains': 'notContains',
  '?empty': 'isEmpty',
  '?!empty': 'isNotEmpty',
  '?~': 'matches',
} as const;
