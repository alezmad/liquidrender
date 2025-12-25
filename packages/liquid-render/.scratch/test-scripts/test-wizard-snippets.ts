/**
 * Multi-Step Wizard Snippets Test
 *
 * Tests 5 unique LiquidCode UI snippets for multi-step wizards with:
 * - Step indicators
 * - Conditional step visibility (?@step=0, ?@step=1)
 * - Form validation states
 * - Progress indicators
 */

import { parseUI, roundtripUI } from './src/compiler/compiler';

const snippets = [
  // ============================================================================
  // Wizard 1: User Registration with 3-Step Stepper
  // Features: St (stepper), step signal, conditional visibility, validation
  // ============================================================================
  `@step @formValid
St [
  Cn ?@step=0 [
    Hd "Step 1: Personal Info" %lg
    Pg :progress
    Fm [
      In :firstName :email @email
      Bt "Continue" >step=1 ?@formValid=1
    ]
  ]
  Cn ?@step=1 [
    Hd "Step 2: Address" %lg
    Pg :progress
    Fm [
      In :street :city :zipcode
      Bt "Back" >step=0, Bt "Next" >step=2 ?@formValid=1
    ]
  ]
  Cn ?@step=2 [
    Hd "Step 3: Review" %lg
    Pg :progress
    Fm [
      Tx :firstName, Tx :email, Tx :city
      Bt "Back" >step=1, Bt "Submit" !submit
    ]
  ]
]`,

  // ============================================================================
  // Wizard 2: Product Checkout with Progress Bar and Validation
  // Features: Progress bar, form validation, conditional content, step signal
  // ============================================================================
  `@step @itemValid @addressValid
0 [
  Hd "Checkout" %lg
  Pg :stepProgress
  0 ?@step=0 [
    Hd "Items" %sm #gray
    Tb :cartItems [:product :quantity :price]
    Bt "Review" >step=1 ?@itemValid=1 #green
  ]
  0 ?@step=1 [
    Hd "Shipping" %sm #gray
    Fm [
      Se :shippingMethod [standard="Standard", express="Express", overnight="Overnight"]
      Sw :insurance "Add Insurance" <>insurance
    ]
    Bt "Back" >step=0, Bt "Next" >step=2 ?@addressValid=1 #green
  ]
  0 ?@step=2 [
    Hd "Payment" %sm #gray
    Fm [
      In :cardNumber :cvv :zipCode
      Ck :terms "I agree to terms"
    ]
    Bt "Back" >step=1, Bt "Complete" !submit ?@terms=1 #green
  ]
]`,

  // ============================================================================
  // Wizard 3: Survey Flow with Conditional Branching & Step Validation
  // Features: Multi-step survey, validation states, error feedback, progress tracking
  // ============================================================================
  `@currentStep @hasErrors @surveyProgress
Cn [
  Hd "Customer Onboarding" %lg
  Pg :surveyProgress "Step" %md
  Fm [
    0 ?@currentStep=0 [
      Hd "Company Details" !p
      In :company :industry @text
      In :employees "Number of Employees" @number
      Tx :errorMsg #red ?@hasErrors=1
      Bt "Next" >currentStep=1 ?@hasErrors=0 #green
    ]
    0 ?@currentStep=1 [
      Hd "Business Goals" !p
      Se :goals [
        growth="Growth",
        retention="Retention",
        efficiency="Efficiency"
      ]
      Rg :budget "Budget (0-100k)" {min: 0, max: 100000}
      Tx :errorMsg #red ?@hasErrors=1
      Bt "Back" >currentStep=0, Bt "Next" >currentStep=2 ?@hasErrors=0 #green
    ]
    0 ?@currentStep=2 [
      Hd "Confirmation" !p
      Cd [
        Tx :company, Tx :industry, Tx :goals, Tx :budget
      ]
      Ck :confirm "I confirm the information is correct"
      Tx :errorMsg #red ?@hasErrors=1
      Bt "Back" >currentStep=1, Bt "Complete" !submit ?@confirm=1 #green
    ]
  ]
]`,

  // ============================================================================
  // Wizard 4: Appointment Booking with Multiple Conditional Steps
  // Features: Step indicator with validation, conditional rendering, multi-field validation
  // ============================================================================
  `@wizardStep @dateValid @timeValid @detailsValid
0 [
  Hd "Book Appointment" %lg
  0 ^row [
    Tg "1. Date" ?@wizardStep=0 #primary
    Tg "2. Time" ?@wizardStep=1 #gray
    Tg "3. Details" ?@wizardStep=2 #gray
    Tg "4. Confirm" ?@wizardStep=3 #gray
  ]
  Pg :completionPercent
  0 ?@wizardStep=0 [
    Fm [
      Hd "Select Date" %md
      Dt :appointmentDate
      Tx "Please select a date in the future" %sm #gray
      Tx :dateError #red ?@dateValid=0
      Bt "Next" >wizardStep=1 ?@dateValid=1 #green
    ]
  ]
  0 ?@wizardStep=1 [
    Fm [
      Hd "Select Time" %md
      Se :timeSlot [
        "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"
      ]
      Tx :timeError #red ?@timeValid=0
      Bt "Back" >wizardStep=0, Bt "Next" >wizardStep=2 ?@timeValid=1 #green
    ]
  ]
  0 ?@wizardStep=2 [
    Fm [
      Hd "Your Details" %md
      In :name :email :phone
      Ta :notes "Additional notes"
      Tx :detailsError #red ?@detailsValid=0
      Bt "Back" >wizardStep=1, Bt "Next" >wizardStep=3 ?@detailsValid=1 #green
    ]
  ]
  0 ?@wizardStep=3 [
    Cd [
      Hd "Review" %md
      0 [
        Tx "Date:" %sm, Tx :appointmentDate %sm #blue
        Tx "Time:" %sm, Tx :timeSlot %sm #blue
        Tx "Name:" %sm, Tx :name %sm #blue
      ]
    ]
    Ck :agreeTerms "I agree to terms"
    Bt "Back" >wizardStep=2, Bt "Confirm" !submit ?@agreeTerms=1 #green
  ]
]`,

  // ============================================================================
  // Wizard 5: Account Setup with Dynamic Validation & Error States
  // Features: Form validation states, conditional error messages, progress indicator
  // ============================================================================
  `@setupStage @passwordValid @emailConfirmed @allFieldsValid
Cn *f [
  Hd "Account Setup Wizard" %lg !h
  Pg :overallProgress "Setup Complete"
  Fm [
    0 ?@setupStage=0 [
      Hd "Email & Password" !p
      In :email "Email Address" @email
      Tx :emailError #red ?@passwordValid=0
      In :password "Password" @password
      In :confirmPassword "Confirm Password" @password
      Tx :passwordError #red ?@passwordValid=0
      Sw :twoFactor "Enable Two-Factor Authentication" <>twoFactor
      Bt "Continue" >setupStage=1 ?@passwordValid=1 ?@emailConfirmed=1 #green
    ]
    0 ?@setupStage=1 [
      Hd "Profile Information" !p
      In :firstName :lastName :phone
      Se :country [
        "United States", "Canada", "United Kingdom", "Other"
      ]
      Tx :profileError #red ?@allFieldsValid=0
      Bt "Back" >setupStage=0, Bt "Continue" >setupStage=2 ?@allFieldsValid=1 #green
    ]
    0 ?@setupStage=2 [
      Hd "Preferences" !p
      Ck :newsletter "Subscribe to newsletter"
      Ck :notifications "Enable notifications"
      Se :theme [light="Light", dark="Dark", auto="Auto"]
      Pg :privacyScore "Privacy Settings"
      Tx :prefsError #red ?@allFieldsValid=0
      Bt "Back" >setupStage=1, Bt "Finish Setup" !submit #green
    ]
  ]
]`
];

console.log('\n==============================================================================');
console.log('MULTI-STEP WIZARD SNIPPETS - ROUNDTRIP TEST RESULTS');
console.log('==============================================================================\n');

let passCount = 0;
let failCount = 0;

snippets.forEach((snippet, index) => {
  const wizardNum = index + 1;
  console.log(`[Wizard ${wizardNum}] Testing roundtrip...`);

  try {
    // Step 1: Parse
    const schema = parseUI(snippet);
    console.log(`  ✓ Parsed successfully`);
    console.log(`    - Signals: ${schema.signals.length}, Layers: ${schema.layers.length}`);

    // Step 2: Roundtrip
    const { isEquivalent, differences, dsl } = roundtripUI(schema);

    if (isEquivalent) {
      console.log(`  ✓ Roundtrip PASSED (Schema -> DSL -> Schema match)`);
      passCount++;
    } else {
      console.log(`  ✗ Roundtrip FAILED`);
      console.log(`    Differences:`);
      differences.forEach(diff => console.log(`      - ${diff}`));
      failCount++;
    }

    // Show generated DSL (first 200 chars)
    const dslPreview = dsl.substring(0, 120).replace(/\n/g, ' ');
    console.log(`    DSL: ${dslPreview}...`);

  } catch (e) {
    console.log(`  ✗ ERROR:`, (e as Error).message);
    failCount++;
  }

  console.log('');
});

console.log('==============================================================================');
console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED (${passCount}/${snippets.length})`);
console.log('==============================================================================\n');
