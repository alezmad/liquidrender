/**
 * Complex Form Snippets for LiquidCode Testing
 * Tests parsing, compilation, and roundtrip verification
 *
 * Focus areas:
 * - Input validation states
 * - Textarea with labels
 * - Date/time pickers
 * - File uploads
 */

import { parseUI, roundtripUI, compileUI } from './src/compiler/compiler';

// ============================================================================
// 5 Unique Complex Form Snippets
// ============================================================================

const snippets = [
  // ========================================
  // 1. Registration Form with Validation
  // ========================================
  `Fm [
  In :firstName "First Name"
  In :lastName "Last Name"
  In :email :email?required
  In :password :password?required
  Ck :agreeTerms "I agree to terms"
  Bt "Register" !submit
]`,

  // ========================================
  // 2. Dynamic Profile Form with Textarea
  // ========================================
  `Fm [
  In :username "Username" :focus#blue
  In :email "Email" :email?required
  Ot :bio "Bio" %lg
  Se :country "Country" <region
  Sw :newsletter "Subscribe to newsletter"
  Bt "Save Profile" !submit, Bt "Cancel" !reset
]`,

  // ========================================
  // 3. Appointment Booking with Date/Time
  // ========================================
  `Fm [
  Se :service "Select Service" :focus#blue
  Dt :appointmentDate "Date" :valid?>=today
  Tm :appointmentTime "Time" :valid?>=09:00
  In :patientName "Full Name"
  In :phoneNumber "Phone Number" :focus#blue
  Rg :duration "Duration (minutes)" *f
  Ck :reminders "Send reminders"
  Bt "Book Appointment" !submit
]`,

  // ========================================
  // 4. Document Upload with File Validation
  // ========================================
  `Fm [
  Hd "Upload Documents"
  Up :resume "Resume (PDF/DOC)" :required?true
  Up :cover_letter "Cover Letter (PDF)" :optional?false
  Up :certificates "Certifications" :multiple?true
  In :notes "Additional Notes" %sm
  Ck :confirmAccuracy "I confirm all documents are accurate"
  Bt "Submit Application" !submit, Bt "Clear" !reset
]`,

  // ========================================
  // 5. Multi-step Settings Form with States
  // ========================================
  `Fm [
  Se :theme "Theme" <>theme
  Sw :darkMode "Dark Mode" :active#purple
  Sw :notifications "Enable Notifications" :hover#blue
  Dt :lastLogin "Last Login" :disabled?true
  Rg :refreshRate "Auto-refresh (seconds)" *h
  Se :timezone "Timezone"
  Ck :twoFactor "Enable 2-Factor Authentication"
  In :backupEmail "Backup Email"
  Bt "Save Settings" !submit #green, Bt "Reset to Default" !reset #red
]`
];

// ============================================================================
// Test Runner
// ============================================================================

console.log('='.repeat(80));
console.log('LiquidCode Complex Form Verification');
console.log('='.repeat(80));
console.log('');

let passCount = 0;
let failCount = 0;

for (let i = 0; i < snippets.length; i++) {
  const snippet = snippets[i];
  const snippetNum = i + 1;

  console.log(`[Test ${snippetNum}]`);
  console.log('-'.repeat(80));

  try {
    // STEP 1: Parse the DSL to schema
    console.log('  1. Parsing DSL...');
    const schema = parseUI(snippet);
    console.log(`     ✓ Schema generated: ${schema.layers.length} layer(s), ${schema.signals.length} signal(s)`);

    // STEP 2: Verify roundtrip
    console.log('  2. Verifying roundtrip...');
    const { dsl, isEquivalent, differences } = roundtripUI(schema);

    if (isEquivalent) {
      console.log('     ✓ PASS - Schema roundtrips successfully');
      passCount++;

      // Show the generated DSL for reference
      console.log('     Generated DSL:');
      dsl.split('\n').forEach(line => {
        if (line.trim()) {
          console.log(`       ${line}`);
        }
      });
    } else {
      console.log('     ✗ FAIL - Roundtrip differences detected:');
      differences.forEach(diff => {
        console.log(`       - ${diff}`);
      });
      failCount++;
    }

    // STEP 3: Verify compilation produces valid DSL
    console.log('  3. Verifying compilation...');
    const compiledDSL = compileUI(schema);
    if (compiledDSL && compiledDSL.trim().length > 0) {
      console.log('     ✓ Compilation successful');
    } else {
      console.log('     ✗ Compilation failed - empty output');
      failCount++;
    }

  } catch (error) {
    console.log(`  ✗ FAIL - Error: ${(error as Error).message}`);
    failCount++;
  }

  console.log('');
}

// ============================================================================
// Summary
// ============================================================================

console.log('='.repeat(80));
console.log('Summary');
console.log('='.repeat(80));
console.log(`Total Tests:  ${snippets.length}`);
console.log(`Passed:       ${passCount} ✓`);
console.log(`Failed:       ${failCount} ✗`);
console.log(`Pass Rate:    ${((passCount / snippets.length) * 100).toFixed(1)}%`);
console.log('='.repeat(80));

// ============================================================================
// Test Details
// ============================================================================

console.log('');
console.log('Test Details');
console.log('-'.repeat(80));
console.log('1. Registration Form with Validation');
console.log('   - Input fields with validation states');
console.log('   - Checkbox for terms agreement');
console.log('   - Submit button action');
console.log('');
console.log('2. Dynamic Profile Form with Textarea');
console.log('   - Username with focus state styling');
console.log('   - Email field with validation');
console.log('   - OTP/textarea (Ot) with size modifier');
console.log('   - Select with signal receiver');
console.log('   - Switch toggle');
console.log('   - Multiple buttons with different actions');
console.log('');
console.log('3. Appointment Booking with Date/Time');
console.log('   - Service selection dropdown');
console.log('   - Date picker with validation (>=today)');
console.log('   - Time picker with time validation');
console.log('   - Range slider for duration');
console.log('   - Checkbox for reminders');
console.log('');
console.log('4. Document Upload with File Validation');
console.log('   - Multiple file upload fields');
console.log('   - Required/optional file validation');
console.log('   - Multiple file support');
console.log('   - Notes textarea');
console.log('   - Confirmation checkbox');
console.log('');
console.log('5. Multi-step Settings Form with States');
console.log('   - Select with bidirectional binding');
console.log('   - Toggle switches with state styling');
console.log('   - Disabled date field');
console.log('   - Range slider for settings');
console.log('   - Multiple buttons with color modifiers');
console.log('');
console.log('='.repeat(80));
