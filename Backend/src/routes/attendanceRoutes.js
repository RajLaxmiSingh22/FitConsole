import { Router } from "express";
import { checkOut } from "../controllers/memberAnalyticsController.js";
import { checkIn, listAttendance } from "../controllers/attendanceController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { attendanceIdParamsSchema, attendanceQuerySchema, checkInSchema } from "../validation/index.js";

const attendanceRoutes = Router();
attendanceRoutes.use(requireAuthentication);
attendanceRoutes.post("/check-in", requireRole("owner", "trainer"), validateRequest({ body: checkInSchema }), checkIn);
attendanceRoutes.post("/:id/check-out", requireRole("owner", "trainer"), validateRequest({ params: attendanceIdParamsSchema }), checkOut);
attendanceRoutes.get("/", requireRole("owner", "trainer"), validateRequest({ query: attendanceQuerySchema }), listAttendance);

export default attendanceRoutes;
