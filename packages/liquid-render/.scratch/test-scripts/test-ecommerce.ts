/**
 * E-Commerce LiquidCode Snippets - Roundtrip Verification
 *
 * Tests 5 unique e-commerce UI patterns:
 * 1. Product Card - with image, title, price, rating
 * 2. Shopping Cart - with signal-driven item count
 * 3. Checkout Form - with validation feedback
 * 4. Product Detail Modal - nested layers
 * 5. Review Modal - form with star rating
 */

import { parseUI, roundtripUI } from './src/compiler/compiler';

const snippets = [
  // Snippet 1: Product Card with Image and Rating
  // Displays product info in a card layout with visual hierarchy
  `Cd [
  Im :productImage
  Tx :productName "Product"
  Kp :price "Price"
  Rt :rating
]`,

  // Snippet 2: Shopping Cart with Item Count Signal and Emit
  // Demonstrates signal flow: cart emits count changes to header badge
  `@itemCount
  Cn [
    Tx "Shopping Cart"
    Bt :checkout "Checkout" >itemCount
    Tb :cartItems [:product :quantity :subtotal]
  ]`,

  // Snippet 3: Checkout Form with Validation and Multi-step
  // Form with email, address, payment fields with required validation
  `Fm [
  In :email "Email" ?required
  In :address "Address" ?required
  In :cardNumber "Card Number" ?required
  In :expiryDate "Expiry"
  Bt :placeOrder "Place Order" !submit
]`,

  // Snippet 4: Product Detail Modal Dialog
  // Modal layer displaying detailed product information
  `/0 Md [
  Tx :productName "Product Details"
  Im :fullImage
  Tx :description "About This Product"
  Kp :price "Price"
  Rt :reviews "Customer Rating"
  Bt :addToCart "Add to Cart" !addToCart
]`,

  // Snippet 5: Review Submission Modal with Star Rating
  // Modal form for customer reviews with rating component
  `/1 Md [
  Tx "Leave a Review"
  In :reviewTitle "Review Title" ?required
  Tx :starRating "Rating" %large
  Tx :reviewText "Your Review"
  Bt :submitReview "Submit Review" !submit
  Bt :cancel "Cancel"
]`,
];

console.log('E-Commerce LiquidCode Roundtrip Verification');
console.log('='.repeat(60));
console.log();

let passCount = 0;
let failCount = 0;

for (let i = 0; i < snippets.length; i++) {
  const snippetNum = i + 1;
  const snippet = snippets[i];
  const label = snippet.split('\n')[0].substring(0, 50);

  try {
    // Parse the DSL
    const schema = parseUI(snippet);

    // Roundtrip: compile back and re-parse
    const { isEquivalent, differences } = roundtripUI(schema);

    if (isEquivalent) {
      console.log(`[${snippetNum}] PASS: ${label}`);
      passCount++;
    } else {
      console.log(`[${snippetNum}] FAIL: ${label}`);
      console.log(`    Differences:`);
      for (const diff of differences) {
        console.log(`      - ${diff}`);
      }
      failCount++;
    }
  } catch (e) {
    console.log(`[${snippetNum}] ERROR: ${label}`);
    console.log(`    ${(e as Error).message}`);
    failCount++;
  }
}

console.log();
console.log('='.repeat(60));
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log(`Success Rate: ${((passCount / snippets.length) * 100).toFixed(1)}%`);
