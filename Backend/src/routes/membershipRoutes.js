import { Router } from "express";
import {
  cancelMembership,
  createClientMembership,
  createMembership,
  listMemberships,
  renewMembership,
} from "../controllers/membershipController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createClientMembershipSchema,
  createMembershipSchema,
  listMembershipsQuerySchema,
  membershipIdParamsSchema,
} from "../validation/index.js";

const membershipRoutes = Router();
membershipRoutes.use(requireAuthentication);
membershipRoutes.post("/checkout", requireRole("client"), validateRequest({ body: createClientMembershipSchema }), createClientMembership);
membershipRoutes.post("/", requireRole("owner"), validateRequest({ body: createMembershipSchema }), createMembership);
membershipRoutes.get("/", requireRole("owner"), validateRequest({ query: listMembershipsQuerySchema }), listMemberships);
membershipRoutes.patch("/:id/renew", requireRole("owner"), validateRequest({ params: membershipIdParamsSchema }), renewMembership);
membershipRoutes.patch("/:id/cancel", requireRole("owner"), validateRequest({ params: membershipIdParamsSchema }), cancelMembership);

export default membershipRoutes;
