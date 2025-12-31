import { eq, sql } from "@turbostarter/db";
import {
  creditTransaction,
  customer,
} from "@turbostarter/db/schema";
import { db } from "@turbostarter/db/server";
import { generateId } from "@turbostarter/shared/utils";

import { CreditsConfig } from "./config";
import { Credits } from "./utils";

export const getUserCredits = async (userId: string) => {
  const data = await db.query.customer.findFirst({
    where: eq(customer.userId, userId),
  });

  return data?.credits ?? Credits.BALANCE;
};

export const getCustomerByUserId = async (userId: string) => {
  return db.query.customer.findFirst({
    where: eq(customer.userId, userId),
  });
};

export const deductUserCredits = (userId: string, amount: number) =>
  db
    .update(customer)
    .set({ credits: sql`${customer.credits} - ${amount}` })
    .where(eq(customer.userId, userId));

export const addUserCredits = (userId: string, amount: number) =>
  db
    .update(customer)
    .set({ credits: sql`${customer.credits} + ${amount}` })
    .where(eq(customer.userId, userId));

/**
 * Create a free customer record for a new user with welcome credits.
 * Called automatically on user signup via auth hooks.
 */
export const createFreeCustomer = async (userId: string) => {
  const id = generateId();
  const credits = CreditsConfig.FREE_TIER;

  await db.transaction(async (tx) => {
    // Create customer record
    await tx.insert(customer).values({
      id,
      userId,
      customerId: `free_${userId}`,
      status: "active",
      plan: "free",
      credits,
    });

    // Log the initial credit transaction
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

/**
 * Ensure a customer record exists for a user.
 * Creates one with free credits if not present.
 */
export const ensureCustomerExists = async (userId: string) => {
  const existing = await getCustomerByUserId(userId);
  if (existing) return existing;

  const { id, credits } = await createFreeCustomer(userId);
  return {
    id,
    userId,
    customerId: `free_${userId}`,
    status: "active" as const,
    plan: "free" as const,
    credits,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
