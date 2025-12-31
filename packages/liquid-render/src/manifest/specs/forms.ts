// Form Component Specifications
// Complete specs for 16 form-related components

import type {
  ComponentSpec,
  ComponentCategory,
  FeatureFlags,
  PropSpec,
  BindingSpec,
  ComponentComposition,
  AccessibilitySpec,
  UsageGuidance,
  Example,
} from "../types";

// ============================================================================
// Shared Patterns
// ============================================================================

const formContainerParents = ["container", "card", "split", "stack", "grid", "modal", "drawer", "sheet"];
const formFieldChildren: string[] = []; // Most form fields are leaf components

const standardFormFieldFeatures: FeatureFlags = {
  loading: false,
  error: true,
  empty: false,
  responsive: true,
  darkMode: true,
  rtl: true,
};

const textInputA11y: AccessibilitySpec = {
  role: "textbox",
  requirements: [
    "Must have associated label (visible or aria-label)",
    "Must indicate required state with aria-required",
    "Must indicate disabled state with aria-disabled",
    "Error messages must be associated via aria-describedby",
  ],
};

const selectionA11y: AccessibilitySpec = {
  requirements: [
    "Must have associated label",
    "Must be keyboard navigable",
    "Must indicate checked/selected state",
  ],
};

// Common prop definitions
const labelProp: PropSpec = {
  name: "label",
  type: "string",
  required: false,
  description: "Label text displayed above or beside the input",
  examples: ['"Email Address"', '"Full Name"'],
};

const disabledProp: PropSpec = {
  name: "disabled",
  type: "boolean",
  required: false,
  description: "Whether the input is disabled",
  default: false,
};

const requiredProp: PropSpec = {
  name: "required",
  type: "boolean",
  required: false,
  description: "Whether the input is required for form submission",
  default: false,
};

const placeholderProp: PropSpec = {
  name: "placeholder",
  type: "string",
  required: false,
  description: "Placeholder text shown when empty",
  examples: ['"Enter your email..."'],
};

// ============================================================================
// Form Container
// ============================================================================

const formSpec: ComponentSpec = {
  type: "form",
  description: "Container for form fields with submit handling and validation coordination",
  category: "forms" as ComponentCategory,
  usage: {
    when: [
      "Collecting user input that requires submission",
      "Grouping related form fields",
      "Implementing multi-step forms",
    ],
    avoid: [
      "Display-only data (use card or container)",
      "Single toggle that auto-saves (use switch directly)",
    ],
    alternatives: [
      { type: "container", reason: "When no form submission is needed" },
    ],
  },
  props: [
    {
      name: "onSubmit",
      type: "function",
      required: false,
      description: "Handler called with form data on submit",
    },
    {
      name: "children",
      type: "ReactNode",
      required: true,
      description: "Form fields and submit button",
    },
  ],
  bindings: {
    expects: [
      {
        type: "object",
        description: "Initial form values keyed by field binding",
        shape: { "[fieldName]": { type: "string", description: "Field value" } },
      },
    ],
    resolves: [
      { expression: "formData", value: { email: "", password: "" } },
    ],
  },
  composition: {
    validParents: formContainerParents,
    validChildren: [
      "input", "textarea", "otp", "select", "checkbox", "radio",
      "switch", "date", "daterange", "time", "color", "rating",
      "range", "upload", "button", "stack", "grid",
    ],
    siblings: {
      recommended: ["heading", "text"],
      discouraged: ["form"],
    },
  },
  features: {
    ...standardFormFieldFeatures,
    loading: true,
    error: true,
  },
  a11y: {
    role: "form",
    requirements: [
      "Must have accessible name (aria-label or aria-labelledby)",
      "Submit button must be keyboard accessible",
      "Error summary should be announced to screen readers",
    ],
  },
  examples: [
    {
      name: "Login form",
      dsl: `Form
  Inp :email "Email"
  Inp :password "Password" type="password"
  Btn "Sign In" action="submit"`,
      data: { email: "", password: "" },
      renders: "A login form with email/password fields and submit button",
    },
  ],
};

// ============================================================================
// Input
// ============================================================================

const inputSpec: ComponentSpec = {
  type: "input",
  description: "Single-line text input for short text, email, password, or number values",
  category: "forms.input" as ComponentCategory,
  usage: {
    when: [
      "Collecting short text (names, emails, usernames)",
      "Password entry with masking",
      "Numeric input with validation",
    ],
    avoid: [
      "Multi-line text (use textarea)",
      "Fixed-format codes (use otp)",
      "Selecting from options (use select)",
    ],
    alternatives: [
      { type: "textarea", reason: "For multi-line text input" },
      { type: "otp", reason: "For verification codes" },
      { type: "select", reason: "When options are known" },
    ],
  },
  props: [
    labelProp,
    placeholderProp,
    {
      name: "type",
      type: '"text" | "email" | "password" | "number"',
      required: false,
      description: "Input type determining keyboard and validation",
      default: "text",
      examples: ['"email"', '"password"', '"number"'],
    },
    disabledProp,
    requiredProp,
  ],
  bindings: {
    expects: [
      { type: "string", description: "Text value" },
      { type: "number", description: "Numeric value (when type=number)" },
    ],
    resolves: [
      { expression: "user.email", value: "user@example.com" },
      { expression: "price", value: 99.99 },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: textInputA11y,
  examples: [
    {
      name: "Email input",
      dsl: 'Inp :email "Email Address" type="email" placeholder="you@example.com"',
      data: { email: "" },
      renders: "An email input with label and placeholder",
    },
    {
      name: "Password input",
      dsl: 'Inp :password "Password" type="password"',
      data: { password: "" },
      renders: "A masked password input",
    },
    {
      name: "Bound value",
      dsl: 'Inp :user.name "Name"',
      data: { user: { name: "John Doe" } },
      renders: "Input pre-filled with bound value",
    },
  ],
};

// ============================================================================
// Textarea
// ============================================================================

const textareaSpec: ComponentSpec = {
  type: "textarea",
  description: "Multi-line text input for long-form content like descriptions or comments",
  category: "forms.input" as ComponentCategory,
  usage: {
    when: [
      "Long-form text (descriptions, comments, notes)",
      "Content that may span multiple lines",
      "User-generated text content",
    ],
    avoid: [
      "Short single-line input (use input)",
      "Structured data entry",
    ],
    alternatives: [
      { type: "input", reason: "For single-line short text" },
    ],
  },
  props: [
    labelProp,
    placeholderProp,
    {
      name: "rows",
      type: "number",
      required: false,
      description: "Number of visible text rows",
      default: 4,
      examples: ["3", "6", "10"],
    },
    disabledProp,
  ],
  bindings: {
    expects: [
      { type: "string", description: "Text content" },
    ],
    resolves: [
      { expression: "description", value: "A detailed description..." },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: {
    role: "textbox",
    requirements: [
      "Must have associated label",
      "aria-multiline must be true",
      "Must indicate required state",
    ],
  },
  examples: [
    {
      name: "Description field",
      dsl: 'Txt :description "Description" rows=6 placeholder="Enter details..."',
      data: { description: "" },
      renders: "A 6-row textarea for descriptions",
    },
  ],
};

// ============================================================================
// OTP
// ============================================================================

const otpSpec: ComponentSpec = {
  type: "otp",
  description: "One-time password input with individual character boxes for verification codes",
  category: "forms.specialized" as ComponentCategory,
  usage: {
    when: [
      "2FA verification codes",
      "Email/phone verification",
      "PIN entry",
    ],
    avoid: [
      "General text input",
      "Variable-length codes (use input)",
    ],
    alternatives: [
      { type: "input", reason: "For variable-length codes or general text" },
    ],
  },
  props: [
    labelProp,
    {
      name: "length",
      type: "number",
      required: false,
      description: "Number of characters in the OTP",
      default: 6,
      examples: ["4", "6", "8"],
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "OTP code as string" },
    ],
    resolves: [
      { expression: "verificationCode", value: "123456" },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: {
    role: "textbox",
    requirements: [
      "Must have accessible label describing purpose",
      "Auto-focus next box on input",
      "Support paste of full code",
      "Announce character count to screen readers",
    ],
  },
  examples: [
    {
      name: "6-digit verification",
      dsl: 'Otp :code "Verification Code" length=6',
      data: { code: "" },
      renders: "6 individual input boxes for verification code",
    },
    {
      name: "4-digit PIN",
      dsl: 'Otp :pin "PIN" length=4',
      data: { pin: "" },
      renders: "4 input boxes for PIN entry",
    },
  ],
};

// ============================================================================
// Select
// ============================================================================

const selectSpec: ComponentSpec = {
  type: "select",
  description: "Dropdown menu for selecting a single option from a predefined list",
  category: "forms.selection" as ComponentCategory,
  usage: {
    when: [
      "Choosing from 5+ predefined options",
      "Space is limited for all options",
      "Options are mutually exclusive",
    ],
    avoid: [
      "2-3 options (use radio)",
      "Multiple selections (use checkbox group)",
      "Free text entry needed (use input with autocomplete)",
    ],
    alternatives: [
      { type: "radio", reason: "For 2-5 visible options" },
      { type: "checkbox", reason: "For multiple selections" },
    ],
  },
  props: [
    labelProp,
    placeholderProp,
    {
      name: "options",
      type: "array",
      required: false,
      description: "Array of options or option objects { value, label }",
      examples: ['[{ value: "us", label: "United States" }]'],
    },
    {
      name: "children",
      type: "ReactNode",
      required: false,
      description: "Option components as children (alternative to options prop)",
    },
    disabledProp,
  ],
  bindings: {
    expects: [
      { type: "string", description: "Selected option value" },
      {
        type: "array",
        description: "Options array",
        shape: { items: { type: "object", description: "{ value, label }" } },
      },
    ],
    resolves: [
      { expression: "country", value: "us" },
      { expression: "countries", value: [{ value: "us", label: "United States" }] },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: ["option"],
  },
  features: standardFormFieldFeatures,
  a11y: {
    role: "combobox",
    requirements: [
      "Must have associated label",
      "Keyboard navigable (arrow keys, enter, escape)",
      "Announce selected option",
      "Support typeahead filtering",
    ],
  },
  examples: [
    {
      name: "Country selector",
      dsl: 'Sel :country "Country" placeholder="Select a country"',
      data: {
        country: "",
        countries: [
          { value: "us", label: "United States" },
          { value: "ca", label: "Canada" },
        ],
      },
      renders: "A dropdown with country options",
    },
  ],
};

// ============================================================================
// Checkbox
// ============================================================================

const checkboxSpec: ComponentSpec = {
  type: "checkbox",
  description: "Boolean toggle checkbox for yes/no choices or agreement acceptance",
  category: "forms.selection" as ComponentCategory,
  usage: {
    when: [
      "Boolean yes/no choice",
      "Terms acceptance",
      "Multiple selections from a list (as group)",
    ],
    avoid: [
      "Mutually exclusive options (use radio)",
      "On/off toggle with immediate effect (use switch)",
    ],
    alternatives: [
      { type: "radio", reason: "For mutually exclusive choices" },
      { type: "switch", reason: "For toggles with immediate effect" },
    ],
  },
  props: [
    labelProp,
    disabledProp,
  ],
  bindings: {
    expects: [
      { type: "boolean", description: "Checked state" },
    ],
    resolves: [
      { expression: "acceptTerms", value: false },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: {
    role: "checkbox",
    requirements: [
      "Must have associated label (clickable)",
      "Indicate checked state with aria-checked",
      "Keyboard accessible (space to toggle)",
    ],
  },
  examples: [
    {
      name: "Terms acceptance",
      dsl: 'Chk :acceptTerms "I agree to the Terms of Service"',
      data: { acceptTerms: false },
      renders: "A checkbox with terms label",
    },
    {
      name: "Remember me",
      dsl: 'Chk :rememberMe "Remember me on this device"',
      data: { rememberMe: true },
      renders: "A checked remember me checkbox",
    },
  ],
};

// ============================================================================
// Radio
// ============================================================================

const radioSpec: ComponentSpec = {
  type: "radio",
  description: "Radio button group for selecting one option from mutually exclusive choices",
  category: "forms.selection" as ComponentCategory,
  usage: {
    when: [
      "2-5 mutually exclusive options",
      "All options should be visible",
      "User needs to compare options",
    ],
    avoid: [
      "More than 5 options (use select)",
      "Multiple selections allowed (use checkbox)",
    ],
    alternatives: [
      { type: "select", reason: "For many options (5+)" },
      { type: "checkbox", reason: "For multiple selections" },
    ],
  },
  props: [
    labelProp,
    {
      name: "options",
      type: "array",
      required: true,
      description: "Array of options with value and label",
      examples: ['[{ value: "monthly", label: "Monthly" }]'],
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Selected option value" },
    ],
    resolves: [
      { expression: "billingCycle", value: "monthly" },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: {
    role: "radiogroup",
    requirements: [
      "Group must have accessible name",
      "Each option must have role=radio",
      "Arrow keys navigate between options",
      "Only selected option is tab-focusable",
    ],
  },
  examples: [
    {
      name: "Billing cycle",
      dsl: 'Rad :cycle "Billing Cycle" options=[{value:"monthly",label:"Monthly"},{value:"yearly",label:"Yearly"}]',
      data: { cycle: "monthly" },
      renders: "Radio group with monthly/yearly options",
    },
  ],
};

// ============================================================================
// Switch
// ============================================================================

const switchSpec: ComponentSpec = {
  type: "switch",
  description: "Toggle switch for boolean settings with immediate visual feedback",
  category: "forms.selection" as ComponentCategory,
  usage: {
    when: [
      "On/off setting with immediate effect",
      "Feature toggles",
      "Settings that don't require form submission",
    ],
    avoid: [
      "Choices requiring form submission (use checkbox)",
      "Multiple related options",
    ],
    alternatives: [
      { type: "checkbox", reason: "For form submission scenarios" },
    ],
  },
  props: [
    labelProp,
    disabledProp,
  ],
  bindings: {
    expects: [
      { type: "boolean", description: "Toggle state" },
    ],
    resolves: [
      { expression: "darkMode", value: true },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: {
    role: "switch",
    requirements: [
      "Must have associated label",
      "Announce state change",
      "Keyboard accessible (space/enter to toggle)",
    ],
  },
  examples: [
    {
      name: "Dark mode toggle",
      dsl: 'Swt :darkMode "Dark Mode"',
      data: { darkMode: false },
      renders: "A toggle switch for dark mode",
    },
    {
      name: "Notifications",
      dsl: 'Swt :notifications "Enable Notifications"',
      data: { notifications: true },
      renders: "An enabled notifications toggle",
    },
  ],
};

// ============================================================================
// Date
// ============================================================================

const dateSpec: ComponentSpec = {
  type: "date",
  description: "Date picker for selecting a single date with calendar popup",
  category: "forms.specialized" as ComponentCategory,
  usage: {
    when: [
      "Single date selection (birthdays, deadlines)",
      "Date with optional time not needed",
    ],
    avoid: [
      "Date ranges (use daterange)",
      "Date + time (use datetime or separate inputs)",
    ],
    alternatives: [
      { type: "daterange", reason: "For start/end date pairs" },
      { type: "input", reason: "For simple text date entry" },
    ],
  },
  props: [
    labelProp,
    {
      name: "min",
      type: "string",
      required: false,
      description: "Minimum selectable date (ISO format)",
      examples: ['"2024-01-01"'],
    },
    {
      name: "max",
      type: "string",
      required: false,
      description: "Maximum selectable date (ISO format)",
      examples: ['"2025-12-31"'],
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "ISO date string (YYYY-MM-DD)" },
    ],
    resolves: [
      { expression: "birthDate", value: "1990-05-15" },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: {
    role: "combobox",
    requirements: [
      "Calendar popup must be keyboard navigable",
      "Arrow keys navigate days/weeks",
      "Announce selected date",
      "Escape closes popup",
    ],
  },
  examples: [
    {
      name: "Birth date",
      dsl: 'Dat :birthDate "Date of Birth"',
      data: { birthDate: "" },
      renders: "A date picker for birth date",
    },
    {
      name: "With constraints",
      dsl: 'Dat :deadline "Deadline" min="2024-01-01" max="2024-12-31"',
      data: { deadline: "" },
      renders: "Date picker with min/max constraints",
    },
  ],
};

// ============================================================================
// Date Range
// ============================================================================

const daterangeSpec: ComponentSpec = {
  type: "daterange",
  description: "Date range picker for selecting start and end dates with presets",
  category: "forms.specialized" as ComponentCategory,
  usage: {
    when: [
      "Date range filtering (reports, analytics)",
      "Booking periods (check-in/check-out)",
      "Time period selection",
    ],
    avoid: [
      "Single date (use date)",
      "Specific time ranges (combine with time)",
    ],
    alternatives: [
      { type: "date", reason: "For single date selection" },
    ],
  },
  props: [
    labelProp,
    {
      name: "presets",
      type: '"today" | "yesterday" | "last7d" | "last30d" | "thisMonth" | "lastMonth" | "thisYear" | "lastYear"[]',
      required: false,
      description: "Quick-select preset options",
      examples: ['["last7d", "last30d", "thisMonth"]'],
    },
  ],
  bindings: {
    expects: [
      {
        type: "object",
        description: "Start and end dates",
        shape: {
          start: { type: "string", description: "ISO date string" },
          end: { type: "string", description: "ISO date string" },
        },
      },
    ],
    resolves: [
      { expression: "dateRange", value: { start: "2024-01-01", end: "2024-01-31" } },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: {
    requirements: [
      "Both start and end pickers must be accessible",
      "Presets must be keyboard navigable",
      "Announce selected range",
      "Validate end date >= start date",
    ],
  },
  examples: [
    {
      name: "Report filter",
      dsl: 'Drg :period "Report Period" presets=["last7d","last30d","thisMonth"]',
      data: { period: { start: "", end: "" } },
      renders: "Date range picker with preset buttons",
    },
    {
      name: "Booking dates",
      dsl: 'Drg :booking "Stay Dates"',
      data: { booking: { start: "2024-03-15", end: "2024-03-20" } },
      renders: "Date range picker for booking",
    },
  ],
};

// ============================================================================
// Time
// ============================================================================

const timeSpec: ComponentSpec = {
  type: "time",
  description: "Time picker for selecting hours, minutes, and optionally seconds",
  category: "forms.specialized" as ComponentCategory,
  usage: {
    when: [
      "Time selection (appointments, schedules)",
      "Duration input",
    ],
    avoid: [
      "Full datetime (combine with date)",
      "Relative time (use input or select)",
    ],
    alternatives: [
      { type: "input", reason: "For simple text time entry" },
    ],
  },
  props: [
    labelProp,
    {
      name: "format",
      type: '"12h" | "24h"',
      required: false,
      description: "Time format (12-hour with AM/PM or 24-hour)",
      default: "12h",
    },
    {
      name: "showSeconds",
      type: "boolean",
      required: false,
      description: "Whether to show seconds selector",
      default: false,
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Time string (HH:MM or HH:MM:SS)" },
      {
        type: "object",
        description: "Time object",
        shape: {
          hours: { type: "number", description: "Hours (0-23)" },
          minutes: { type: "number", description: "Minutes (0-59)" },
          seconds: { type: "number", description: "Seconds (0-59)" },
        },
      },
    ],
    resolves: [
      { expression: "appointmentTime", value: "14:30" },
      { expression: "time", value: { hours: 14, minutes: 30, seconds: 0 } },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: {
    requirements: [
      "Each segment (hour, minute, second) must be labeled",
      "Arrow keys adjust values",
      "Tab navigates between segments",
      "Support manual entry",
    ],
  },
  examples: [
    {
      name: "Appointment time",
      dsl: 'Tim :time "Appointment Time"',
      data: { time: "" },
      renders: "A 12-hour time picker",
    },
    {
      name: "24-hour with seconds",
      dsl: 'Tim :duration "Duration" format="24h" showSeconds=true',
      data: { duration: "01:30:00" },
      renders: "24-hour time picker with seconds",
    },
  ],
};

// ============================================================================
// Color
// ============================================================================

const colorSpec: ComponentSpec = {
  type: "color",
  description: "Color picker with swatch, presets, hex input, and optional opacity slider",
  category: "forms.specialized" as ComponentCategory,
  usage: {
    when: [
      "Theme customization",
      "Design tools",
      "Branding settings",
    ],
    avoid: [
      "Predefined color options only (use select)",
    ],
    alternatives: [
      { type: "select", reason: "For limited predefined colors" },
    ],
  },
  props: [
    labelProp,
    {
      name: "showOpacity",
      type: "boolean",
      required: false,
      description: "Whether to show opacity/alpha slider",
      default: false,
    },
    {
      name: "presets",
      type: "string[]",
      required: false,
      description: "Preset color values to show as quick options",
      examples: ['["#3b82f6", "#22c55e", "#ef4444"]'],
    },
  ],
  bindings: {
    expects: [
      { type: "string", description: "Hex color value (#RRGGBB or #RRGGBBAA)" },
    ],
    resolves: [
      { expression: "brandColor", value: "#3b82f6" },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: {
    requirements: [
      "Color swatch must have text alternative",
      "Hex input must be labeled",
      "Presets must be keyboard navigable",
      "Announce color value changes",
    ],
  },
  examples: [
    {
      name: "Brand color",
      dsl: 'Clr :brandColor "Brand Color"',
      data: { brandColor: "#3b82f6" },
      renders: "Color picker with current brand color",
    },
    {
      name: "With presets and opacity",
      dsl: 'Clr :bgColor "Background" showOpacity=true presets=["#ffffff","#f3f4f6","#1f2937"]',
      data: { bgColor: "#ffffff" },
      renders: "Color picker with opacity and preset swatches",
    },
  ],
};

// ============================================================================
// Rating
// ============================================================================

const ratingSpec: ComponentSpec = {
  type: "rating",
  description: "Star rating input for collecting user ratings with configurable icons",
  category: "forms.specialized" as ComponentCategory,
  usage: {
    when: [
      "Collecting user ratings (products, experiences)",
      "Feedback scores",
      "Satisfaction surveys",
    ],
    avoid: [
      "Numeric scale input (use range)",
      "Yes/no approval (use checkbox or switch)",
    ],
    alternatives: [
      { type: "range", reason: "For continuous numeric scales" },
    ],
  },
  props: [
    labelProp,
    {
      name: "max",
      type: "number",
      required: false,
      description: "Maximum rating value",
      default: 5,
      examples: ["5", "10"],
    },
    {
      name: "allowHalf",
      type: "boolean",
      required: false,
      description: "Allow half-star increments",
      default: false,
    },
    {
      name: "icon",
      type: '"star" | "heart" | "circle" | "thumb"',
      required: false,
      description: "Icon style for rating",
      default: "star",
    },
    {
      name: "size",
      type: '"sm" | "md" | "lg"',
      required: false,
      description: "Icon size",
      default: "md",
    },
    {
      name: "readOnly",
      type: "boolean",
      required: false,
      description: "Display-only mode",
      default: false,
    },
    {
      name: "showValue",
      type: "boolean",
      required: false,
      description: "Show numeric value beside icons",
      default: false,
    },
  ],
  bindings: {
    expects: [
      { type: "number", description: "Current rating value" },
    ],
    resolves: [
      { expression: "rating", value: 4 },
      { expression: "rating", value: 3.5 },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: {
    role: "slider",
    requirements: [
      "Announce current value",
      "Arrow keys adjust rating",
      "Announce max value context",
    ],
  },
  examples: [
    {
      name: "Product rating",
      dsl: 'Rtg :rating "Your Rating"',
      data: { rating: 0 },
      renders: "5-star rating input",
    },
    {
      name: "Half-star hearts",
      dsl: 'Rtg :satisfaction "Satisfaction" icon="heart" allowHalf=true showValue=true',
      data: { satisfaction: 4.5 },
      renders: "Heart rating with half increments and value display",
    },
  ],
};

// ============================================================================
// Range
// ============================================================================

const rangeSpec: ComponentSpec = {
  type: "range",
  description: "Slider input for selecting a numeric value within a range",
  category: "forms.input" as ComponentCategory,
  usage: {
    when: [
      "Numeric value within known min/max",
      "Approximate value selection (volume, brightness)",
      "Quick adjustment of settings",
    ],
    avoid: [
      "Precise numeric entry (use input type=number)",
      "Discrete categories (use radio or select)",
    ],
    alternatives: [
      { type: "input", reason: "For precise numeric entry" },
      { type: "rating", reason: "For star-based ratings" },
    ],
  },
  props: [
    labelProp,
    {
      name: "min",
      type: "number",
      required: false,
      description: "Minimum value",
      default: 0,
    },
    {
      name: "max",
      type: "number",
      required: false,
      description: "Maximum value",
      default: 100,
    },
    {
      name: "step",
      type: "number",
      required: false,
      description: "Step increment",
      default: 1,
    },
  ],
  bindings: {
    expects: [
      { type: "number", description: "Current slider value" },
    ],
    resolves: [
      { expression: "volume", value: 75 },
      { expression: "price", value: 50 },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: standardFormFieldFeatures,
  a11y: {
    role: "slider",
    requirements: [
      "Must have accessible label",
      "Announce current value",
      "Arrow keys adjust value by step",
      "Home/End keys go to min/max",
    ],
  },
  examples: [
    {
      name: "Volume slider",
      dsl: 'Rng :volume "Volume" min=0 max=100',
      data: { volume: 50 },
      renders: "A horizontal slider for volume control",
    },
    {
      name: "Price range",
      dsl: 'Rng :maxPrice "Max Price" min=0 max=1000 step=50',
      data: { maxPrice: 250 },
      renders: "Price slider with $50 increments",
    },
  ],
};

// ============================================================================
// Upload
// ============================================================================

const uploadSpec: ComponentSpec = {
  type: "upload",
  description: "Drag-and-drop file upload with preview and multiple file support",
  category: "forms.specialized" as ComponentCategory,
  usage: {
    when: [
      "File uploads (images, documents)",
      "Bulk file import",
      "Avatar/profile image selection",
    ],
    avoid: [
      "Selecting from existing files (use select or gallery)",
    ],
    alternatives: [],
  },
  props: [
    labelProp,
    {
      name: "accept",
      type: "string",
      required: false,
      description: "Accepted file types (MIME types or extensions)",
      examples: ['"image/*"', '".pdf,.doc,.docx"'],
    },
    {
      name: "multiple",
      type: "boolean",
      required: false,
      description: "Allow multiple file selection",
      default: false,
    },
    {
      name: "maxFiles",
      type: "number",
      required: false,
      description: "Maximum number of files (when multiple=true)",
      examples: ["5", "10"],
    },
    {
      name: "maxSize",
      type: "number",
      required: false,
      description: "Maximum file size in bytes",
      examples: ["5242880", "10485760"],
    },
    {
      name: "variant",
      type: '"default" | "compact"',
      required: false,
      description: "Upload area style",
      default: "default",
    },
    disabledProp,
  ],
  bindings: {
    expects: [
      { type: "array", description: "Array of uploaded files" },
      {
        type: "object",
        description: "Upload configuration",
        shape: {
          files: { type: "array", description: "Current files" },
          maxFiles: { type: "number", description: "Max allowed" },
        },
      },
    ],
    resolves: [
      { expression: "files", value: [] },
      { expression: "avatar", value: { url: "https://...", name: "avatar.png" } },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form"],
    validChildren: formFieldChildren,
  },
  features: {
    ...standardFormFieldFeatures,
    dragDrop: true,
  },
  a11y: {
    requirements: [
      "Drop zone must be keyboard accessible",
      "Announce file selection and upload status",
      "Announce drag over state",
      "File list must be navigable",
      "Remove buttons must be accessible",
    ],
  },
  examples: [
    {
      name: "Image upload",
      dsl: 'Upl :images "Upload Images" accept="image/*" multiple=true maxFiles=5',
      data: { images: [] },
      renders: "Drag-and-drop zone for up to 5 images",
    },
    {
      name: "Document upload",
      dsl: 'Upl :document "Upload Document" accept=".pdf,.doc,.docx" maxSize=10485760',
      data: { document: null },
      renders: "Single document upload with 10MB limit",
    },
    {
      name: "Compact avatar",
      dsl: 'Upl :avatar "Profile Photo" accept="image/*" variant="compact"',
      data: { avatar: null },
      renders: "Compact upload for single profile image",
    },
  ],
};

// ============================================================================
// Button
// ============================================================================

const buttonSpec: ComponentSpec = {
  type: "button",
  description: "Interactive button that emits signals for actions and form submission",
  category: "actions" as ComponentCategory,
  usage: {
    when: [
      "Triggering actions (submit, save, delete)",
      "Navigation with side effects",
      "Form submission",
    ],
    avoid: [
      "Pure navigation (use link)",
      "Toggle states (use switch or checkbox)",
    ],
    alternatives: [
      { type: "link", reason: "For pure navigation without side effects" },
    ],
  },
  props: [
    {
      name: "label",
      type: "string",
      required: true,
      description: "Button text",
      examples: ['"Submit"', '"Save Changes"', '"Delete"'],
    },
    {
      name: "action",
      type: "string",
      required: false,
      description: "Signal action to emit on click",
      examples: ['"submit"', '"save"', '"delete"'],
    },
    {
      name: "variant",
      type: '"default" | "secondary" | "outline" | "ghost" | "destructive"',
      required: false,
      description: "Visual style variant",
      default: "default",
    },
    {
      name: "size",
      type: '"sm" | "md" | "lg"',
      required: false,
      description: "Button size",
      default: "md",
    },
    disabledProp,
    {
      name: "loading",
      type: "boolean",
      required: false,
      description: "Show loading spinner and disable",
      default: false,
    },
  ],
  bindings: {
    expects: [
      {
        type: "object",
        description: "Button state",
        shape: {
          loading: { type: "boolean", description: "Loading state" },
          disabled: { type: "boolean", description: "Disabled state" },
        },
      },
    ],
    resolves: [
      { expression: "submitState", value: { loading: false, disabled: false } },
    ],
  },
  composition: {
    validParents: [...formContainerParents, "form", "modal", "alertdialog"],
    validChildren: ["icon"],
    siblings: {
      recommended: ["button"],
      discouraged: [],
    },
  },
  features: {
    loading: true,
    error: false,
    responsive: true,
    darkMode: true,
    rtl: true,
  },
  a11y: {
    role: "button",
    requirements: [
      "Must have accessible name (label)",
      "Indicate disabled state with aria-disabled",
      "Indicate loading state (aria-busy)",
      "Focus visible indicator",
      "Keyboard accessible (enter/space)",
    ],
  },
  examples: [
    {
      name: "Submit button",
      dsl: 'Btn "Submit" action="submit"',
      renders: "Primary submit button",
    },
    {
      name: "Secondary action",
      dsl: 'Btn "Cancel" variant="secondary" action="cancel"',
      renders: "Secondary cancel button",
    },
    {
      name: "Destructive action",
      dsl: 'Btn "Delete Account" variant="destructive" action="delete"',
      renders: "Red destructive delete button",
    },
    {
      name: "Loading state",
      dsl: 'Btn "Saving..." loading=true',
      renders: "Button with loading spinner",
    },
  ],
};

// ============================================================================
// Export
// ============================================================================

export const formSpecs: ComponentSpec[] = [
  formSpec,
  inputSpec,
  textareaSpec,
  otpSpec,
  selectSpec,
  checkboxSpec,
  radioSpec,
  switchSpec,
  dateSpec,
  daterangeSpec,
  timeSpec,
  colorSpec,
  ratingSpec,
  rangeSpec,
  uploadSpec,
  buttonSpec,
];
