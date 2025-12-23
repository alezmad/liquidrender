// LiquidSurvey DSL Constants

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

// Condition operators
export const CONDITION_OPERATORS = {
  equals: '?=',
  greaterOrEqual: '?>=',
  lessOrEqual: '?<=',
  greaterThan: '?>',
  lessThan: '?<',
  in: '?in',
  contains: '?contains',
} as const;

export const OPERATOR_TO_CONDITION = {
  '?=': 'equals',
  '?>=': 'greaterOrEqual',
  '?<=': 'lessOrEqual',
  '?>': 'greaterThan',
  '?<': 'lessThan',
  '?in': 'in',
  '?contains': 'contains',
} as const;
