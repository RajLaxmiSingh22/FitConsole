import { useEffect, useRef, useState } from "react";
import { apiCalls, getApiError, responseData } from "../services/api.js";

// Verifies a Cashfree return (?cashfree_order_id=...) with the API; the provider status is authoritative.
export function usePaymentReturn(user, setSection) {
  const [paymentNotice, setPaymentNotice] = useState(null);
  const handledPaymentOrders = useRef(new Set());
  useEffect(() => {
    const returnUrl = new URL(window.location.href);
    const orderId = returnUrl.searchParams.get("cashfree_order_id");
    if (!orderId || handledPaymentOrders.current.has(orderId)) return;
    handledPaymentOrders.current.add(orderId);
    returnUrl.searchParams.delete("cashfree_order_id");
    window.history.replaceState({}, document.title, returnUrl);

    apiCalls.payments.verifyCashfreeOrder(orderId).then((response) => {
      const paymentStatus = responseData(response)?.paymentStatus;
      if (paymentStatus === "success") {
        setPaymentNotice({ tone: "success", message: "Cashfree payment confirmed and recorded." });
        setSection(user.role === "owner" ? "Payments" : "Membership");
        window.dispatchEvent(new CustomEvent("fitconsole:payment-confirmed"));
      } else if (paymentStatus === "pending") {
        setPaymentNotice({ tone: "warning", message: "Cashfree payment is still pending. Check again shortly." });
      } else {
        setPaymentNotice({ tone: "error", message: "Cashfree payment was not completed." });
      }
    }).catch((error) => {
      setPaymentNotice({ tone: "error", message: getApiError(error, "Unable to verify Cashfree payment.") });
    });
  }, [user.id, user.role, setSection]);
  return paymentNotice;
}
