import express from "express";
import { Router } from "express";
import {
  cashfreeWebhook,
  createCashfreeOrder,
  createPayment,
  listPaymentReminders,
  resolvePaymentReminder,
  sendPaymentReminder,
  listPayments,
  updatePayment,
  voidPayment,
  verifyCashfreeOrder,
} from "../controllers/paymentController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  cashfreeOrderIdParamsSchema,
  createCashfreeOrderSchema,
  createPaymentSchema,
  paymentIdParamsSchema,
  paymentQuerySchema,
  reminderParamsSchema,
  updatePaymentSchema,
  voidPaymentSchema,
} from "../validation/index.js";

export const cashfreeWebhookRoutes = Router();
cashfreeWebhookRoutes.post(
  "/cashfree/webhook",
  express.raw({ type: "application/json", limit: "32kb" }),
  cashfreeWebhook,
);

const paymentRoutes = Router();
paymentRoutes.use(requireAuthentication);
paymentRoutes.get("/reminders", requireRole("owner"), listPaymentReminders);
paymentRoutes.post("/reminders/:paymentId/send", requireRole("owner"), validateRequest({ params: reminderParamsSchema }), sendPaymentReminder);
paymentRoutes.patch("/reminders/:paymentId/resolve", requireRole("owner"), validateRequest({ params: reminderParamsSchema }), resolvePaymentReminder);
paymentRoutes.post("/cashfree/orders", requireRole("owner", "client"), validateRequest({ body: createCashfreeOrderSchema }), createCashfreeOrder);
paymentRoutes.get("/cashfree/orders/:orderId", requireRole("owner", "client"), validateRequest({ params: cashfreeOrderIdParamsSchema }), verifyCashfreeOrder);
paymentRoutes.get("/", requireRole("owner"), validateRequest({ query: paymentQuerySchema }), listPayments);
paymentRoutes.post("/", requireRole("owner"), validateRequest({ body: createPaymentSchema }), createPayment);
paymentRoutes.patch("/:id", requireRole("owner"), validateRequest({ params: paymentIdParamsSchema, body: updatePaymentSchema }), updatePayment);
paymentRoutes.post("/:id/void", requireRole("owner"), validateRequest({ params: paymentIdParamsSchema, body: voidPaymentSchema }), voidPayment);

export default paymentRoutes;
