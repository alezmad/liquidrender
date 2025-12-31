# Credits Management System - Implementation Plan

> **Status:** Ready for Implementation
> **Effort:** ~4 hours total
> **Priority:** High (blocks AI feature usage)

---

## Executive Summary

Every user should have a customer record with credits from the moment they sign up. This plan implements:

1. **Auto-create customer on signup** - No more manual patches
2. **Seed data with customers** - Dev environment works out of box
3. **Admin credit management** - Set/add/deduct credits from admin panel
4. **Credit transaction audit log** - Full history for debugging and analytics

---

## Table of Contents

1. [Database Schema Changes](#1-database-schema-changes)
2. [Auto-Create Customer on Signup](#2-auto-create-customer-on-signup)
3. [Seed Data Fix](#3-seed-data-fix)
4. [Admin Credit Management API](#4-admin-credit-management-api)
5. [Admin Credit Management UI](#5-admin-credit-management-ui)
6. [Credit Transaction Audit Log](#6-credit-transaction-audit-log)
7. [Environment-Aware Defaults](#7-environment-aware-defaults)
8. [Migration Steps](#8-migration-steps)
9. [Testing Checklist](#9-testing-checklist)

---

## 1. Database Schema Changes

### 1.1 New Table: `credit_transaction`

**File:** `packages/db/src/schema/credit-transaction.ts`

```typescript
import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { customer } from "./customer";

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "signup",      // Initial free credits
  "purchase",    // Bought via billing
  "usage",       // Consumed by AI features
  "admin_grant", // Manually added by admin
  "admin_deduct",// Manually removed by admin
  "refund",      // Refunded credits
  "promo",       // Promotional credits
  "referral",    // Referral bonus
  "expiry",      // Credits expired
]);

export const creditTransaction = pgTable("credit_transaction", {
  id: text("id").primaryKey().notNull(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customer.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // Positive = add, Negative = deduct
  type: creditTransactionTypeEnum("type").notNull(),
  reason: text("reason"), // Human-readable description
  metadata: text("metadata"), // JSON for additional context (e.g., AI feature used)
  balanceAfter: integer("balance_after").notNull(), // Snapshot for reconciliation
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"), // User ID who initiated (for admin actions)
});

export const creditTransactionRelations = relations(
  creditTransaction,
  ({ one }) => ({
    customer: one(customer, {
      fields: [creditTransaction.customerId],
      references: [customer.id],
    }),
  })
);

export type CreditTransaction = typeof creditTransaction.$inferSelect;
export type InsertCreditTransaction = typeof creditTransaction.$inferInsert;
```

### 1.2 Update Schema Index

**File:** `packages/db/src/schema/index.ts`

```typescript
// Add export
export * from "./credit-transaction";
```

### 1.3 Migration

```bash
pnpm with-env -F @turbostarter/db db:generate
pnpm with-env -F @turbostarter/db db:migrate
```

---

## 2. Auto-Create Customer on Signup

### 2.1 Credits Configuration

**File:** `packages/ai/src/modules/credits/config.ts`

```typescript
import { env } from "../../env";

export const CreditsConfig = {
  /** Default credits for new free-tier users */
  FREE_TIER_CREDITS: env.NODE_ENV === "development" ? 10000 : 100,

  /** Default credits for seed/test users */
  DEV_CREDITS: 10000,

  /** Credit costs by feature */
  COST: {
    LOW: 1,      // Simple operations
    MEDIUM: 5,   // Standard AI calls
    HIGH: 10,    // Premium features (TTS, image gen)
    PREMIUM: 25, // Expensive operations
  },
} as const;
```

### 2.2 Customer Creation Service

**File:** `packages/billing/src/lib/customer.ts` (extend existing)

```typescript
import { generateId } from "@turbostarter/shared/utils";
import { CreditsConfig } from "@turbostarter/ai/credits/config";
import { creditTransaction } from "@turbostarter/db/schema";

// Add to existing file:

export const createFreeCustomer = async (userId: string) => {
  const id = generateId();
  const credits = CreditsConfig.FREE_TIER_CREDITS;

  await db.transaction(async (tx) => {
    // Create customer record
    await tx.insert(customer).values({
      id,
      userId,
      customerId: `free_${userId}`, // Placeholder until billing linked
      status: "active",
      plan: "free",
      credits,
    });

    // Log the transaction
    await tx.insert(creditTransaction).values({
      id: generateId(),
      customerId: id,
      amount: credits,
      type: "signup",
      reason: "Welcome credits for new user",
      balanceAfter: credits,
    });
  });

  return { id, credits };
};

export const ensureCustomerExists = async (userId: string) => {
  const existing = await getCustomerByUserId(userId);
  if (existing) return existing;

  return createFreeCustomer(userId);
};
```

### 2.3 Auth Hook Integration

**File:** `packages/auth/src/server.ts` (or wherever auth is configured)

```typescript
import { createFreeCustomer } from "@turbostarter/billing/lib/customer";

// In better-auth configuration:
export const auth = betterAuth({
  // ... existing config

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create customer record with free credits
          await createFreeCustomer(user.id);
        },
      },
    },
  },
});
```

**Alternative:** If `databaseHooks` isn't available, add to the registration flow:

**File:** `packages/api/src/modules/auth/mutations.ts`

```typescript
// After successful user creation in register mutation:
await createFreeCustomer(newUser.id);
```

---

## 3. Seed Data Fix

### 3.1 Update Seed Script

**File:** `packages/db/src/seed.ts` (or wherever seed is defined)

```typescript
import { generateId } from "@turbostarter/shared/utils";
import { customer, creditTransaction } from "./schema";

const seedCustomers = async (users: User[]) => {
  const DEV_CREDITS = 10000;

  for (const user of users) {
    const customerId = generateId();

    await db.insert(customer).values({
      id: customerId,
      userId: user.id,
      customerId: `dev_${user.id}`,
      status: "active",
      plan: "premium", // Give dev users premium for testing
      credits: DEV_CREDITS,
    });

    await db.insert(creditTransaction).values({
      id: generateId(),
      customerId,
      amount: DEV_CREDITS,
      type: "signup",
      reason: "Development seed credits",
      balanceAfter: DEV_CREDITS,
    });
  }

  console.log(`✓ Created ${users.length} customer records with ${DEV_CREDITS} credits each`);
};

// Call after seeding users:
// await seedCustomers(seedUsers);
```

### 3.2 One-Time Migration for Existing Users

**File:** `packages/db/src/scripts/backfill-customers.ts`

```typescript
#!/usr/bin/env tsx
/**
 * Backfill customer records for existing users without them.
 * Run once after deploying the new schema.
 *
 * Usage: pnpm with-env tsx packages/db/src/scripts/backfill-customers.ts
 */

import { db } from "../server";
import { user, customer, creditTransaction } from "../schema";
import { eq, isNull } from "drizzle-orm";
import { generateId } from "@turbostarter/shared/utils";

const DEFAULT_CREDITS = 100;

async function backfillCustomers() {
  // Find users without customer records
  const usersWithoutCustomers = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .leftJoin(customer, eq(user.id, customer.userId))
    .where(isNull(customer.id));

  console.log(`Found ${usersWithoutCustomers.length} users without customer records`);

  for (const u of usersWithoutCustomers) {
    const customerId = generateId();

    await db.transaction(async (tx) => {
      await tx.insert(customer).values({
        id: customerId,
        userId: u.id,
        customerId: `backfill_${u.id}`,
        status: "active",
        plan: "free",
        credits: DEFAULT_CREDITS,
      });

      await tx.insert(creditTransaction).values({
        id: generateId(),
        customerId,
        amount: DEFAULT_CREDITS,
        type: "signup",
        reason: "Backfill: Welcome credits",
        balanceAfter: DEFAULT_CREDITS,
      });
    });

    console.log(`✓ Created customer for ${u.email}`);
  }

  console.log("Backfill complete!");
}

backfillCustomers().catch(console.error);
```

---

## 4. Admin Credit Management API

### 4.1 Schemas

**File:** `packages/api/src/schema/admin.ts` (extend existing)

```typescript
import { z } from "zod";

export const updateCreditsSchema = z.object({
  action: z.enum(["set", "add", "deduct"]),
  amount: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

export type UpdateCreditsInput = z.infer<typeof updateCreditsSchema>;

export const getTransactionsSchema = z.object({
  customerId: z.string(),
  page: z.number().int().positive().default(1),
  perPage: z.number().int().positive().max(100).default(20),
  type: z.enum([
    "signup", "purchase", "usage", "admin_grant",
    "admin_deduct", "refund", "promo", "referral", "expiry"
  ]).optional(),
});

export type GetTransactionsInput = z.infer<typeof getTransactionsSchema>;
```

### 4.2 Mutations

**File:** `packages/api/src/modules/admin/customers/mutations.ts`

```typescript
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@turbostarter/db/server";
import { customer, creditTransaction } from "@turbostarter/db/schema";
import { generateId } from "@turbostarter/shared/utils";
import { HttpException } from "@turbostarter/shared/utils";
import { HttpStatusCode } from "@turbostarter/shared/constants";

import type { UpdateCreditsInput } from "../../../schema/admin";

export const updateCustomerCredits = async (
  customerId: string,
  input: UpdateCreditsInput,
  adminUserId: string
) => {
  return db.transaction(async (tx) => {
    // Get current customer
    const [current] = await tx
      .select()
      .from(customer)
      .where(eq(customer.id, customerId));

    if (!current) {
      throw new HttpException(HttpStatusCode.NOT_FOUND, {
        code: "error.customerNotFound",
      });
    }

    // Calculate new balance
    let newBalance: number;
    let transactionType: "admin_grant" | "admin_deduct";
    let transactionAmount: number;

    switch (input.action) {
      case "set":
        transactionAmount = input.amount - current.credits;
        transactionType = transactionAmount >= 0 ? "admin_grant" : "admin_deduct";
        newBalance = input.amount;
        break;
      case "add":
        transactionAmount = input.amount;
        transactionType = "admin_grant";
        newBalance = current.credits + input.amount;
        break;
      case "deduct":
        if (current.credits < input.amount) {
          throw new HttpException(HttpStatusCode.BAD_REQUEST, {
            code: "error.insufficientCredits",
            message: `Cannot deduct ${input.amount} credits. Current balance: ${current.credits}`,
          });
        }
        transactionAmount = -input.amount;
        transactionType = "admin_deduct";
        newBalance = current.credits - input.amount;
        break;
    }

    // Update customer credits
    await tx
      .update(customer)
      .set({
        credits: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(customer.id, customerId));

    // Log transaction
    await tx.insert(creditTransaction).values({
      id: generateId(),
      customerId,
      amount: transactionAmount,
      type: transactionType,
      reason: input.reason ?? `Admin ${input.action}: ${input.amount} credits`,
      balanceAfter: newBalance,
      createdBy: adminUserId,
    });

    return {
      previousBalance: current.credits,
      newBalance,
      action: input.action,
      amount: input.amount,
    };
  });
};
```

### 4.3 Queries

**File:** `packages/api/src/modules/admin/customers/queries.ts` (extend existing)

```typescript
import { eq, desc, and, count } from "drizzle-orm";
import { creditTransaction } from "@turbostarter/db/schema";

import type { GetTransactionsInput } from "../../../schema/admin";

export const getCustomerTransactions = async (input: GetTransactionsInput) => {
  const offset = (input.page - 1) * input.perPage;

  const where = and(
    eq(creditTransaction.customerId, input.customerId),
    input.type ? eq(creditTransaction.type, input.type) : undefined
  );

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(creditTransaction)
      .where(where)
      .orderBy(desc(creditTransaction.createdAt))
      .limit(input.perPage)
      .offset(offset),
    db
      .select({ count: count() })
      .from(creditTransaction)
      .where(where),
  ]);

  return {
    data,
    total: totalResult[0]?.count ?? 0,
  };
};
```

### 4.4 Router

**File:** `packages/api/src/modules/admin/customers/router.ts`

```typescript
import { Hono } from "hono";
import { enforceAuth, enforceAdmin, validate } from "../../../middleware";
import { updateCreditsSchema, getTransactionsSchema } from "../../../schema/admin";
import { getCustomers, getCustomerTransactions } from "./queries";
import { updateCustomerCredits } from "./mutations";

export const customersRouter = new Hono<{ Variables: Variables }>()
  // Existing routes...
  .get("/", enforceAuth, enforceAdmin, /* ... */)

  // New: Update credits
  .patch(
    "/:id/credits",
    enforceAuth,
    enforceAdmin,
    validate("json", updateCreditsSchema),
    async (c) => {
      const customerId = c.req.param("id");
      const input = c.req.valid("json");
      const admin = c.var.user;

      const result = await updateCustomerCredits(customerId, input, admin.id);

      return c.json(result);
    }
  )

  // New: Get transaction history
  .get(
    "/:id/transactions",
    enforceAuth,
    enforceAdmin,
    validate("query", getTransactionsSchema.omit({ customerId: true })),
    async (c) => {
      const customerId = c.req.param("id");
      const query = c.req.valid("query");

      const result = await getCustomerTransactions({
        ...query,
        customerId,
      });

      return c.json(result);
    }
  );
```

---

## 5. Admin Credit Management UI

### 5.1 Credits Dialog Component

**File:** `apps/web/src/modules/admin/customers/components/credits-dialog.tsx`

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@turbostarter/ui-web/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@turbostarter/ui-web/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@turbostarter/ui-web/form";
import { Input } from "@turbostarter/ui-web/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@turbostarter/ui-web/select";
import { Textarea } from "@turbostarter/ui-web/textarea";
import { toast } from "@turbostarter/ui-web/sonner";

import { api } from "~/lib/api/client";

const formSchema = z.object({
  action: z.enum(["set", "add", "deduct"]),
  amount: z.coerce.number().int().positive("Amount must be positive"),
  reason: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    credits: number;
    user?: { name: string | null } | null;
  };
}

export function CreditsDialog({
  open,
  onOpenChange,
  customer,
}: CreditsDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      action: "add",
      amount: 100,
      reason: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.admin.customers[":id"].credits.$patch({
        param: { id: customer.id },
        json: data,
      });
      if (!res.ok) throw new Error("Failed to update credits");
      return res.json();
    },
    onSuccess: (result) => {
      toast.success(
        `Credits updated: ${result.previousBalance} → ${result.newBalance}`
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast.error("Failed to update credits");
    },
  });

  const watchAction = form.watch("action");
  const watchAmount = form.watch("amount");

  const previewBalance = () => {
    const amount = watchAmount || 0;
    switch (watchAction) {
      case "set":
        return amount;
      case "add":
        return customer.credits + amount;
      case "deduct":
        return Math.max(0, customer.credits - amount);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Credits</DialogTitle>
          <DialogDescription>
            {customer.user?.name ?? "Customer"} • Current balance:{" "}
            <strong>{customer.credits}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))}>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="add">Add credits</SelectItem>
                        <SelectItem value="deduct">Deduct credits</SelectItem>
                        <SelectItem value="set">Set to exact amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="100"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Support credit, promo, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-md bg-muted p-3 text-sm">
                <span className="text-muted-foreground">New balance: </span>
                <strong>{previewBalance()}</strong>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating..." : "Update Credits"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### 5.2 Add Action to Customers Table

**File:** `apps/web/src/modules/admin/customers/data-table/columns.tsx`

```tsx
// Add to imports:
import { CreditsDialog } from "../components/credits-dialog";

// Add to row actions dropdown:
{
  label: "Manage Credits",
  icon: Icons.Coins,
  onClick: () => setCreditsDialogOpen(true),
}

// Or add inline button in credits column:
{
  accessorKey: "credits",
  header: "Credits",
  cell: ({ row }) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          className="font-mono"
          onClick={() => setOpen(true)}
        >
          {row.original.credits}
          <Icons.Pencil className="ml-1 h-3 w-3" />
        </Button>
        <CreditsDialog
          open={open}
          onOpenChange={setOpen}
          customer={row.original}
        />
      </>
    );
  },
}
```

---

## 6. Credit Transaction Audit Log

### 6.1 Update Middleware to Log Usage

**File:** `packages/api/src/middleware.ts`

```typescript
import { creditTransaction } from "@turbostarter/db/schema";

export const deductCredits = (amount: number, feature?: string) =>
  createMiddleware<{
    Variables: {
      user: User;
    };
  }>(async (c, next) => {
    const user = c.var.user;

    const [customerRecord] = await db
      .select()
      .from(customer)
      .where(eq(customer.userId, user.id));

    if (!customerRecord) {
      throw new HttpException(HttpStatusCode.FORBIDDEN, {
        code: "error.noCredits",
        message: "No subscription found. Please subscribe to use AI features.",
      });
    }

    if (customerRecord.credits < amount) {
      throw new HttpException(HttpStatusCode.PAYMENT_REQUIRED, {
        code: "error.insufficientCredits",
        message: "Insufficient credits. Please add more credits to continue.",
      });
    }

    const newBalance = customerRecord.credits - amount;

    // Deduct credits and log transaction
    await db.transaction(async (tx) => {
      await tx
        .update(customer)
        .set({ credits: sql`${customer.credits} - ${amount}` })
        .where(eq(customer.id, customerRecord.id));

      await tx.insert(creditTransaction).values({
        id: generateId(),
        customerId: customerRecord.id,
        amount: -amount,
        type: "usage",
        reason: feature ?? "AI feature usage",
        balanceAfter: newBalance,
        metadata: JSON.stringify({
          endpoint: c.req.path,
          feature,
        }),
      });
    });

    await next();
  });
```

### 6.2 Update AI Routers with Feature Names

**File:** `packages/api/src/modules/ai/tts.ts`

```typescript
// Change from:
await deductCredits(Credits.COST.HIGH)(c, async () => {});

// To:
await deductCredits(Credits.COST.HIGH, "text-to-speech")(c, async () => {});
```

Apply same pattern to:
- `chat.ts` → `"chat"`
- `image.ts` → `"image-generation"`
- `stt.ts` → `"speech-to-text"`
- `pdf.ts` → `"pdf-chat"`

### 6.3 Transaction History UI (Optional)

**File:** `apps/web/src/modules/admin/customers/components/transactions-table.tsx`

```tsx
// Simple table showing transaction history for a customer
// Can be shown in a sheet/drawer from the credits dialog
```

---

## 7. Environment-Aware Defaults

### 7.1 Centralized Config

**File:** `packages/ai/src/modules/credits/config.ts`

```typescript
const nodeEnv = process.env.NODE_ENV ?? "development";

export const CreditsConfig = {
  /** Credits for new users */
  FREE_TIER: nodeEnv === "development" ? 10000 : 100,

  /** Credits for seed/dev users */
  DEV_SEED: 10000,

  /** Cost by operation complexity */
  COST: {
    LOW: 1,
    MEDIUM: 5,
    HIGH: 10,
    PREMIUM: 25,
  },

  /** Feature-specific costs (override defaults) */
  FEATURE_COST: {
    chat: 5,
    "text-to-speech": 10,
    "speech-to-text": 5,
    "image-generation": 25,
    "pdf-chat": 10,
  },
} as const;

export type FeatureName = keyof typeof CreditsConfig.FEATURE_COST;
```

---

## 8. Migration Steps

### Step-by-Step Deployment

```bash
# 1. Generate and apply schema migration
pnpm with-env -F @turbostarter/db db:generate
pnpm with-env -F @turbostarter/db db:migrate

# 2. Backfill existing users (run once)
pnpm with-env tsx packages/db/src/scripts/backfill-customers.ts

# 3. Update seed script and re-seed (dev only)
pnpm with-env -F @turbostarter/db db:seed

# 4. Deploy API changes

# 5. Deploy UI changes
```

### Rollback Plan

If issues arise:
1. The `credit_transaction` table is append-only, safe to truncate
2. Customer records can be manually fixed via SQL
3. Auth hook can be disabled by removing the `databaseHooks` config

---

## 9. Testing Checklist

### Manual Tests

- [ ] New user signup → customer record created with 100 credits
- [ ] New user can use TTS immediately (no 403)
- [ ] Admin can view customers list with credits column
- [ ] Admin can add credits to a customer
- [ ] Admin can deduct credits from a customer
- [ ] Admin can set exact credit amount
- [ ] Credit deduction fails if insufficient balance
- [ ] Transaction history shows all credit changes
- [ ] Seed script creates customers with 10000 credits

### Automated Tests

**File:** `packages/api/src/modules/admin/customers/__tests__/credits.test.ts`

```typescript
describe("Credit Management", () => {
  it("should add credits to customer", async () => {});
  it("should deduct credits from customer", async () => {});
  it("should fail deduct if insufficient", async () => {});
  it("should set exact credit amount", async () => {});
  it("should log all transactions", async () => {});
});
```

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `packages/db/src/schema/credit-transaction.ts` | CREATE | New audit log table |
| `packages/db/src/schema/index.ts` | MODIFY | Export new schema |
| `packages/ai/src/modules/credits/config.ts` | CREATE | Centralized config |
| `packages/billing/src/lib/customer.ts` | MODIFY | Add `createFreeCustomer` |
| `packages/auth/src/server.ts` | MODIFY | Add `databaseHooks` |
| `packages/api/src/schema/admin.ts` | MODIFY | Add credit schemas |
| `packages/api/src/modules/admin/customers/mutations.ts` | CREATE | Credit mutations |
| `packages/api/src/modules/admin/customers/queries.ts` | MODIFY | Add transactions query |
| `packages/api/src/modules/admin/customers/router.ts` | MODIFY | Add credit endpoints |
| `packages/api/src/middleware.ts` | MODIFY | Log credit usage |
| `apps/web/src/modules/admin/customers/components/credits-dialog.tsx` | CREATE | Admin UI |
| `packages/db/src/scripts/backfill-customers.ts` | CREATE | Migration script |
| `packages/db/src/seed.ts` | MODIFY | Include customers |

---

## Summary

This implementation provides:

1. **Zero-friction onboarding** - Users get credits immediately on signup
2. **Developer happiness** - Seed data works out of the box
3. **Admin control** - Full CRUD for credits with audit trail
4. **Visibility** - Transaction history for debugging and analytics
5. **Flexibility** - Environment-aware defaults, feature-specific costs

Total effort: ~4 hours for full implementation, or ~30 minutes for just the quick fixes (seed + auto-create).
