import { load } from "@cashfreepayments/cashfree-js";

let cashfreePromise;

export async function openCashfreeCheckout(paymentSessionId) {
  cashfreePromise ??= load({
    mode: import.meta.env.VITE_CASHFREE_MODE === "production" ? "production" : "sandbox",
  });
  let cashfree;
  try {
    cashfree = await cashfreePromise;
  } catch (error) {
    cashfreePromise = undefined;
    throw error;
  }
  if (!cashfree) {
    throw new Error("Cashfree checkout could not be initialized.");
  }
  return cashfree.checkout({ paymentSessionId, redirectTarget: "_self" });
}
