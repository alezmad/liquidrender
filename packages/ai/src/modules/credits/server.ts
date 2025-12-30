import { eq, sql } from "@turbostarter/db";
import { customer } from "@turbostarter/db/schema/customer";
import { db } from "@turbostarter/db/server";

import { Credits } from "./utils";

export const getUserCredits = async (userId: string) => {
  const data = await db.query.customer.findFirst({
    where: eq(customer.userId, userId),
  });

  return data?.credits ?? Credits.BALANCE;
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
