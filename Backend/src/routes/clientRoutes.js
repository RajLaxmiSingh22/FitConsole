import express, { Router } from "express";
import { downloadImportTemplate, importClients } from "../controllers/clientImportController.js";
import {
  assignClientTrainer,
  createClient,
  getClient,
  getMyClient,
  listClients,
  updateClient,
  updateClientIdProof,
  updateMyClient,
} from "../controllers/clientController.js";
import { listClientAttendance } from "../controllers/attendanceController.js";
import {
  createDietEntry,
  deleteDietEntry,
  getDietSummary,
  listDietEntries,
  updateDietEntry,
} from "../controllers/dietTrackerController.js";
import {
  createProgressEntry,
  generateDietPlan,
  listClientDietPlans,
  listProgressEntries,
  suggestDietPlanTweak,
} from "../controllers/dietPlanController.js";
import { listClientMemberships } from "../controllers/membershipController.js";
import { listClientPayments } from "../controllers/paymentController.js";
import { listClientWaivers } from "../controllers/waiverController.js";
import { createTrainerNote, getMemberAnalytics, getMemberCalendar, saveWellnessCheckin } from "../controllers/memberAnalyticsController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { publicRateLimit } from "../middleware/publicRateLimit.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  assignTrainerSchema,
  clientIdParamsSchema,
  createClientSchema,
  dietEntrySchema,
  dietEntriesQuerySchema,
  dietPlanClientParamsSchema,
  dietPlanTweakParamsSchema,
  progressEntrySchema,
  generateDietPlanSchema,
  idProofSchema,
  optionalClientIdParamsSchema,
  updateClientSchema,
  clientHistoryQuerySchema,
  memberAnalyticsQuerySchema,
  memberCalendarQuerySchema,
  trainerNoteSchema,
  wellnessCheckinSchema,
  clientListQuerySchema,
  clientImportQuerySchema,
} from "../validation/index.js";

const clientRoutes = Router();
clientRoutes.use(requireAuthentication);
clientRoutes.get("/me", requireRole("client"), getMyClient);
clientRoutes.patch("/me", requireRole("client"), validateRequest({ body: updateClientSchema }), updateMyClient);
clientRoutes.get("/", requireRole("owner", "trainer"), validateRequest({ query: clientListQuerySchema }), listClients);
clientRoutes.post("/", requireRole("owner"), validateRequest({ body: createClientSchema }), createClient);
clientRoutes.get("/import/template.xlsx", requireRole("owner"), downloadImportTemplate);
clientRoutes.post(
  "/import",
  requireRole("owner"),
  express.raw({ type: () => true, limit: "2mb" }),
  validateRequest({ query: clientImportQuerySchema }),
  importClients,
);
clientRoutes.put("/:id/id-proof", requireRole("owner", "client"), validateRequest({ params: optionalClientIdParamsSchema, body: idProofSchema }), updateClientIdProof);
clientRoutes.patch("/:id/trainer", requireRole("owner"), validateRequest({ params: clientIdParamsSchema, body: assignTrainerSchema }), assignClientTrainer);
clientRoutes.get("/:id/memberships", requireRole("owner", "trainer", "client"), validateRequest({ params: clientIdParamsSchema, query: clientHistoryQuerySchema }), listClientMemberships);
clientRoutes.get("/:id/payments", requireRole("owner", "client"), validateRequest({ params: clientIdParamsSchema, query: clientHistoryQuerySchema }), listClientPayments);
clientRoutes.get("/:id/waivers", requireRole("owner", "client"), validateRequest({ params: clientIdParamsSchema }), listClientWaivers);
clientRoutes.get("/:id/diet-entries/summary", requireRole("owner", "trainer", "client"), validateRequest({ params: clientIdParamsSchema }), getDietSummary);
clientRoutes.post("/:id/diet-entries", requireRole("trainer", "client"), validateRequest({ params: clientIdParamsSchema, body: dietEntrySchema }), createDietEntry);
clientRoutes.get("/:id/diet-entries", requireRole("owner", "trainer", "client"), validateRequest({ params: clientIdParamsSchema, query: dietEntriesQuerySchema }), listDietEntries);
clientRoutes.post(
  "/:id/diet-plans/generate",
  requireRole("trainer"),
  publicRateLimit({ limit: 5, windowMs: 60 * 60 * 1000, keyPrefix: "diet-plan-generation", keyGenerator: (req) => req.user.id }),
  validateRequest({ params: dietPlanClientParamsSchema, body: generateDietPlanSchema }),
  generateDietPlan,
);
clientRoutes.post(
  "/:id/diet-plans/:planId/suggest-tweak",
  requireRole("trainer"),
  publicRateLimit({ limit: 5, windowMs: 60 * 60 * 1000, keyPrefix: "diet-plan-generation", keyGenerator: (req) => req.user.id }),
  validateRequest({ params: dietPlanTweakParamsSchema }),
  suggestDietPlanTweak,
);
clientRoutes.post("/:id/progress", requireRole("trainer", "client"), validateRequest({ params: clientIdParamsSchema, body: progressEntrySchema }), createProgressEntry);
clientRoutes.get("/:id/progress", requireRole("owner", "trainer", "client"), validateRequest({ params: clientIdParamsSchema, query: clientHistoryQuerySchema }), listProgressEntries);
clientRoutes.get("/:id/diet-plans", requireRole("trainer", "client"), validateRequest({ params: dietPlanClientParamsSchema }), listClientDietPlans);
clientRoutes.get("/:id/attendance", requireRole("owner", "trainer", "client"), validateRequest({ params: clientIdParamsSchema, query: clientHistoryQuerySchema }), listClientAttendance);
clientRoutes.get("/:id/analytics", requireRole("owner", "trainer", "client"), validateRequest({ params: clientIdParamsSchema, query: memberAnalyticsQuerySchema }), getMemberAnalytics);
clientRoutes.get("/:id/analytics/calendar", requireRole("owner", "trainer", "client"), validateRequest({ params: clientIdParamsSchema, query: memberCalendarQuerySchema }), getMemberCalendar);
clientRoutes.post("/:id/wellness", requireRole("client"), validateRequest({ params: clientIdParamsSchema, body: wellnessCheckinSchema }), saveWellnessCheckin);
clientRoutes.post("/:id/trainer-notes", requireRole("owner", "trainer"), validateRequest({ params: clientIdParamsSchema, body: trainerNoteSchema }), createTrainerNote);
clientRoutes.get("/:id", requireRole("owner", "trainer", "client"), validateRequest({ params: clientIdParamsSchema }), getClient);
clientRoutes.patch("/:id", requireRole("owner", "trainer"), validateRequest({ params: clientIdParamsSchema, body: updateClientSchema }), updateClient);

export default clientRoutes;
