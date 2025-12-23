# Patch 005: Enterprise Boundaries - Multi-Tenancy & Data Governance

**Target Document:** `LIQUIDCODE-SPEC-v2.1.md`
**Section:** New Section 21
**Purpose:** Address enterprise boundary conditions gap with multi-tenancy and data governance requirements

---

## §21 Multi-Tenancy & Data Governance

### §21.1 Tenant Isolation

**Cache boundaries MUST be per-tenant (hard isolation)**

- Cache boundaries are strictly enforced per-tenant with no cross-tenant data sharing
- Tenant ID is part of cache key: `tenant_id + intent_hash + data_fingerprint`
- No cross-tenant cache hits, ever
- Fragment reuse only within same tenant
- Each tenant operates in a completely isolated cache namespace

**Rationale:** Enterprise customers require absolute guarantees that their data and query patterns cannot leak to other tenants, even through timing attacks or cache behavior observation.

---

### §21.2 Data Fingerprint Contents

**What IS stored:**

- Field names (for matching compatible schemas)
- Data types (for compatibility validation)
- Row count ranges (for sizing and performance estimation)
- Schema hash (for cache key generation)

**What is FORBIDDEN:**

- Actual data values (never cached or logged)
- PII fields (must be hashed/omitted from fingerprints)
- Raw query text (only normalized/sanitized forms)
- User identifiers in plain text (hash only)

**Rationale:** Data fingerprints enable intelligent caching while maintaining privacy. They must contain enough information to match compatible queries but never expose actual data values or PII.

---

### §21.3 Telemetry & Logging

**MUST NOT log:**

- PII (personally identifiable information)
- Data values (actual row contents)
- Query content (raw SQL or natural language queries)
- User identifiers in plain text

**MAY log:**

- Operation counts (aggregated statistics)
- Latency metrics (timing data)
- Cache hit rates (performance metrics)
- Error codes (without sensitive context)
- Tenant-scoped logging only (no cross-tenant aggregation)

**Rationale:** Telemetry is essential for performance optimization and debugging, but must be designed with privacy-first principles. All logging must be tenant-scoped and never expose sensitive data.

---

### §21.4 Retention Policies

**Cache entries:**
- Configurable TTL (default 24h, max 30d)
- Per-tenant TTL overrides supported

**Operation history:**
- Sliding window (default 100 operations)
- Tenant-specific window size configuration

**Session state:**
- Auto-evict after inactivity (default 1h)
- Configurable timeout per tenant tier

**Forced eviction:**
- MUST support forced eviction on tenant deletion
- Immediate purge of all tenant data
- No recovery after tenant deletion

**Rationale:** Different enterprise customers have different compliance requirements. Configurable retention policies enable GDPR, CCPA, and industry-specific compliance (HIPAA, SOC2, etc.).

---

### §21.5 PII Handling

**Binding to PII fields:**
- Allowed but not cached
- PII fields are detected and marked in schema

**PII field detection:**
- Heuristic (name patterns: email, ssn, phone, address, etc.)
- Explicit annotation via schema metadata
- User-configurable PII field lists

**PII in fingerprints:**
- Hash only, never raw values
- Use strong cryptographic hash (SHA-256 minimum)
- Salt with tenant-specific key

**Redaction on export:**
- Automatic for marked fields
- Configurable redaction patterns (mask, hash, omit)

**Rationale:** PII requires special handling throughout the system. Detection must be both automatic (to prevent accidents) and configurable (to support domain-specific requirements).

---

### §21.6 Compliance Hooks

The system MUST provide extension points for compliance monitoring and enforcement:

```typescript
interface ComplianceHooks {
  /**
   * Called when data fields are accessed
   * @param tenant - Tenant identifier
   * @param fields - Field names being accessed
   */
  onDataAccess(tenant: string, fields: string[]): void;

  /**
   * Called before storing cache entry
   * @param tenant - Tenant identifier
   * @param key - Cache key being stored
   * @returns false to reject the cache operation
   */
  onCacheStore(tenant: string, key: string): boolean;

  /**
   * Called when schema is exported/serialized
   * @param schema - Schema being exported
   * @returns Schema with appropriate redactions applied
   */
  onExport(schema: LiquidSchema): LiquidSchema;

  /**
   * Called when retention policy expires entries
   * @param tenant - Tenant identifier
   * @param entries - Cache keys being evicted
   */
  onRetentionExpiry(tenant: string, entries: string[]): void;
}
```

**Hook Implementation Requirements:**

- Hooks MUST be called synchronously for blocking operations (onCacheStore, onExport)
- Hooks MAY be called asynchronously for audit operations (onDataAccess, onRetentionExpiry)
- Hook failures MUST be logged but SHOULD NOT crash the system
- Default implementations MUST be provided (no-op or basic logging)

**Example Use Cases:**

- **Audit logging:** Track all PII access for compliance reports
- **Dynamic policy enforcement:** Block cache operations based on time-of-day policies
- **Automatic redaction:** Remove sensitive fields before export
- **Retention compliance:** Log all data deletions for regulatory requirements

**Rationale:** Enterprise customers need to integrate with existing compliance frameworks. Hooks provide extension points without requiring core system modifications.

---

## Implementation Priority

**CRITICAL (must implement before production):**
- §21.1 Tenant Isolation
- §21.2 Data Fingerprint Contents (forbidden items)
- §21.5 PII Handling (basic detection and exclusion)

**HIGH (required for enterprise customers):**
- §21.4 Retention Policies
- §21.6 Compliance Hooks

**MEDIUM (required for full compliance):**
- §21.3 Telemetry & Logging
- §21.2 Data Fingerprint Contents (full schema support)

---

## Cross-References

**Related Sections in LIQUIDCODE-SPEC-v2.1.md:**
- §15 Caching Layer (cache key structure)
- §16 Session Memory (retention and eviction)
- §17 Cost Management (tenant-scoped budgets)

**Related Documents:**
- `.context/security-model.md` (if exists)
- `_bmad-output/architecture.md` (tenant isolation architecture)

---

## Testing Requirements

**Unit Tests:**
- Cache isolation between tenants
- PII detection and hashing
- Retention policy enforcement

**Integration Tests:**
- Compliance hook invocation
- Cross-tenant cache miss guarantee
- Forced eviction on tenant deletion

**Security Tests:**
- Attempt cross-tenant cache access
- Verify PII never appears in logs
- Verify data values never appear in fingerprints

---

## Migration Path

For existing deployments:

1. **Add tenant_id to cache keys** (breaking change - flush cache)
2. **Implement PII detection** (backward compatible)
3. **Add retention policies** (backward compatible - defaults to existing behavior)
4. **Implement compliance hooks** (backward compatible - no-op defaults)
5. **Enable per-tenant configuration** (opt-in feature)

---

**End of Patch 005**
