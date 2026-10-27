import { Cashfree, CFEnvironment } from "cashfree-pg";

export function getCashfreeClient() {
  const appId = process.env.CASHFREE_APP_ID ?? process.env.Cashfree_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY ?? process.env.Cashfree_Secret_Key;
  if (!appId || !secretKey) {
    throw new Error("CASHFREE_APP_ID and CASHFREE_SECRET_KEY must be configured.");
  }

  const environment = process.env.CASHFREE_ENVIRONMENT ?? "sandbox";
  if (!["sandbox", "production"].includes(environment)) {
    throw new Error("CASHFREE_ENVIRONMENT must be sandbox or production.");
  }

  return new Cashfree(
    environment === "production" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX,
    appId,
    secretKey,
  );
}

export function getCashfreeReturnUrl(orderIdPlaceholder) {
  const configuredUrl = process.env.CASHFREE_RETURN_URL
    ?? process.env.CORS_ORIGIN?.split(",")[0]?.trim()
    ?? "http://localhost:5173/";
  const returnUrl = new URL(configuredUrl);
  if (!["http:", "https:"].includes(returnUrl.protocol)) {
    throw new Error("CASHFREE_RETURN_URL must use HTTP or HTTPS.");
  }
  returnUrl.searchParams.set("cashfree_order_id", "CASHFREE_ORDER_PLACEHOLDER");
  return returnUrl.toString()
    .replace("CASHFREE_ORDER_PLACEHOLDER", orderIdPlaceholder)
    .replace("%7Border_id%7D", "{order_id}");
}

export function getCashfreePaymentStatus(payments) {
  if (payments.some((payment) => payment.payment_status === "SUCCESS")) return "success";
  if (payments.some((payment) => payment.payment_status === "PENDING")) return "pending";
  return "failed";
}

export function getCashfreePaymentMethod(paymentGroup = "") {
  const group = paymentGroup.toLowerCase();
  if (group.startsWith("upi")) return "upi";
  if (group.includes("card")) return "card";
  return null;
}
