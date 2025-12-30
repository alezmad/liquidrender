export const Credits = {
  BALANCE: 100,
  COST: {
    FREE: 0,
    DEFAULT: 5,
    HIGH: 10,
  },
};

export type CreditsLevel = "high" | "medium" | "low";

export const hasEnoughCredits = (available: number, required: number) => {
  return available >= required;
};

export const getCreditsLevel = (
  credits: number,
  max = Credits.BALANCE,
): CreditsLevel => {
  const percentage = getCreditsProgress(credits, max) * 100;

  if (percentage > 50) {
    return "high";
  } else if (percentage > 15) {
    return "medium";
  } else {
    return "low";
  }
};

export const getCreditsProgress = (credits: number, max = Credits.BALANCE) =>
  credits / max;
