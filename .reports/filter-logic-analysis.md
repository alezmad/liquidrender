# Filter Logic Analysis - False Positives & Negatives

## Current Filter Logic

```typescript
function shouldEnrichField(field: any): boolean {
  const name = field.name?.toLowerCase() || '';

  // Rule 1: Skip IDs
  if (name.endsWith('_id') || name === 'id') return false;

  // Rule 2: Skip common timestamps
  if (['created_at', 'updated_at', 'deleted_at', 'modified_at'].includes(name)) return false;

  // Rule 3: Skip high-null (>50%)
  if (field.nullPercentage && field.nullPercentage > 50) return false;

  // Rule 4: Skip near-unique (>80%)
  if (field.cardinality && field.totalRows) {
    const uniqueness = (field.cardinality / field.totalRows) * 100;
    if (uniqueness > 80) return false;
  }

  return true;
}
```

## Potential FALSE NEGATIVES (Filtering Important Fields)

### 🚨 Critical Issues

1. **Sparse but Important Metrics** ❌
   - `refund_amount` (80% null - most orders have no refunds)
   - `discount_amount` (60% null - most orders full price)
   - `shipping_cost` (70% null - free shipping common)
   - **Problem:** These are KEY business metrics despite sparsity!

2. **Important Business Timestamps** ❌
   - `shipped_at` (logistics KPI)
   - `delivered_at` (fulfillment KPI)
   - `paid_at` (revenue recognition)
   - `cancelled_at` (churn analysis)
   - `first_purchase_date` (cohort analysis)
   - **Problem:** Blanket timestamp filter misses business-critical dates!

3. **High-Uniqueness Dimensions** ⚠️
   - `customer_email` (>80% unique but worth documenting)
   - `transaction_id` (not ending in _id, but >80% unique)
   - **Problem:** Might want to know these exist

### 📊 Metrics vs Dimensions Blind Spot

**Current issue:** We treat metrics and dimensions the same!

- **Sparse METRICS** = Often valuable (refunds, discounts, fees)
- **Sparse DIMENSIONS** = Usually not valuable (rarely-used categories)

## Potential FALSE POSITIVES (Enriching Low-Value Fields)

1. **Non-Standard IDs** ✅
   - `order_number`, `invoice_number`, `sku`, `code`
   - `uuid`, `guid`, `token`, `hash`, `key`
   - **Problem:** We only catch fields ending in `_id`

2. **Technical Timestamps** ✅
   - `synced_at`, `imported_at`, `processed_at`, `indexed_at`
   - **Problem:** Not in our hardcoded list

3. **Low-Cardinality IDs** ⚠️
   - `region_id` with only 5 values
   - **Problem:** Passes >80% uniqueness filter

## Recommended Improvements

### Option 1: Conservative (Safer)
```typescript
function shouldEnrichField(field: any, itemType: 'metric' | 'dimension'): boolean {
  const name = field.name?.toLowerCase() || '';

  // More comprehensive ID detection
  if (name.endsWith('_id') || name === 'id') return false;
  if (['uuid', 'guid', 'token', 'hash', 'key'].some(id => name.includes(id))) return false;
  if (name.match(/^(order|invoice|transaction)_?number$/)) return false;

  // Smarter timestamp filtering
  const technicalTimestamps = ['created_at', 'updated_at', 'deleted_at', 'modified_at',
                                'synced_at', 'imported_at', 'processed_at', 'indexed_at'];
  if (technicalTimestamps.includes(name)) return false;

  // Different null thresholds for metrics vs dimensions
  const nullThreshold = itemType === 'metric' ? 80 : 50; // Metrics can be sparse!
  if (field.nullPercentage && field.nullPercentage > nullThreshold) return false;

  // High-uniqueness check
  if (field.cardinality && field.totalRows) {
    const uniqueness = (field.cardinality / field.totalRows) * 100;
    if (uniqueness > 90) return false; // Raised to 90% to catch emails but not sparse categories
  }

  return true;
}
```

### Option 2: Smart Allowlist
```typescript
function shouldEnrichField(field: any, itemType: 'metric' | 'dimension'): boolean {
  const name = field.name?.toLowerCase() || '';

  // ALWAYS enrich these patterns (important business fields)
  const alwaysEnrich = [
    /amount$/, /cost$/, /price$/, /revenue$/, /fee$/,  // Financial metrics
    /shipped_at$/, /delivered_at$/, /paid_at$/, /cancelled_at$/,  // Important events
    /first_/, /last_/,  // Temporal markers
  ];
  if (alwaysEnrich.some(pattern => pattern.test(name))) return true;

  // NEVER enrich these patterns (technical junk)
  const neverEnrich = [
    /_id$/, /^id$/,
    /uuid/, /guid/, /token/, /hash/,
    /(created|updated|deleted|modified|synced|imported|processed)_at$/,
  ];
  if (neverEnrich.some(pattern => pattern.test(name))) return false;

  // Contextual filtering based on type
  // ... rest of logic
}
```

## Test Cases

### Should ENRICH ✅
- `refund_amount` (80% null but critical metric)
- `discount_percent` (70% null but important)
- `shipped_at` (important timestamp)
- `first_purchase_date` (cohort analysis)
- `product_category` (40% null, business dimension)

### Should SKIP ❌
- `customer_id` (ends in _id)
- `order_uuid` (contains uuid)
- `created_at` (technical timestamp)
- `synced_at` (technical timestamp)
- `internal_notes` (90% null, low value)
- `debug_flag` (technical field)

## Recommendation

Use **Option 1 (Conservative)** with:
1. ✅ Better ID detection (uuid, guid, token, hash, *_number)
2. ✅ Metric vs dimension awareness (80% null OK for metrics, 50% for dimensions)
3. ✅ Expanded technical timestamp list
4. ✅ Slightly raised uniqueness threshold (90% vs 80%)

This balances cost savings with capturing important sparse metrics.
