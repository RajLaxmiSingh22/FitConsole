import { Router } from "express";
import {
  createCashfreeOrder,
  createPayment,
  listPaymentReminders,
  listPayments,
  updatePayment,
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
  updatePaymentSchema,
} from "../validation/index.js";

const paymentRoutes = Router();
paymentRoutes.use(requireAuthentication);
paymentRoutes.get("/reminders", requireRole("owner"), listPaymentReminders);
paymentRoutes.post("/cashfree/orders", requireRole("owner", "client"), validateRequest({ body: createCashfreeOrderSchema }), createCashfreeOrder);
paymentRoutes.get("/cashfree/orders/:orderId", requireRole("owner", "client"), validateRequest({ params: cashfreeOrderIdParamsSchema }), verifyCashfreeOrder);
paymentRoutes.get("/", requireRole("owner"), validateRequest({ query: paymentQuerySchema }), listPayments);
paymentRoutes.post("/", requireRole("owner"), validateRequest({ body: createPaymentSchema }), createPayment);
paymentRoutes.patch("/:id", requireRole("owner"), validateRequest({ params: paymentIdParamsSchema, body: updatePaymentSchema }), updatePayment);

export default paymentRoutes;
