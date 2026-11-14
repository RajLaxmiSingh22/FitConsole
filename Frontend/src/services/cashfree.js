import { load } from "@cashfreepayments/cashfree-js";

const cashfreePromises = {};

export async function openCashfreeCheckout(paymentSessionId, mode = import.meta.env.VITE_CASHFREE_MODE === "production" ? "production" : "sandbox") {
  cashfreePromises[mode] ??= load({ mode });
  let cashfree;
  try {
    cashfree = await cashfreePromises[mode];
  } catch (error) {
    delete cashfreePromises[mode];
    throw error;
  }
  if (!cashfree) {
    throw new Error("Cashfree checkout could not be initialized.");
  }
  return cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
}
