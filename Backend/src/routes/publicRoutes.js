import { Router } from "express";
import { collectPublicEvent } from "../controllers/analyticsController.js";
import { listPublicGallery } from "../controllers/galleryController.js";
import { getPublicGymContact } from "../controllers/gymSettingsController.js";
import { createTrialBooking } from "../controllers/leadController.js";
import { optionalAuthentication } from "../middleware/optionalAuthentication.js";
import { publicRateLimit } from "../middleware/publicRateLimit.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { analyticsEventSchema, trialBookingSchema } from "../validation/index.js";

const publicRoutes = Router();

publicRoutes.post(
  "/trial-bookings",
  publicRateLimit({ limit: 5, windowMs: 60 * 60 * 1000, keyPrefix: "trial-booking" }),
  validateRequest({ body: trialBookingSchema }),
  createTrialBooking,
);
publicRoutes.post(
  "/events",
  optionalAuthentication,
  publicRateLimit({ limit: 120, windowMs: 60 * 60 * 1000, keyPrefix: "analytics-event" }),
  validateRequest({ body: analyticsEventSchema }),
  collectPublicEvent,
);
publicRoutes.get(
  "/gallery",
  publicRateLimit({ limit: 300, windowMs: 60 * 60 * 1000, keyPrefix: "public-gallery" }),
  listPublicGallery,
);
publicRoutes.get("/gym-contact", getPublicGymContact);

export default publicRoutes;
