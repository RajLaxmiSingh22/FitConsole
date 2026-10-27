import { Router } from "express";
import { checkIn, listAttendance } from "../controllers/attendanceController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { attendanceQuerySchema, checkInSchema } from "../validation/index.js";

const attendanceRoutes = Router();
attendanceRoutes.use(requireAuthentication);
attendanceRoutes.post("/check-in", requireRole("owner", "trainer"), validateRequest({ body: checkInSchema }), checkIn);
attendanceRoutes.get("/", requireRole("owner", "trainer"), validateRequest({ query: attendanceQuerySchema }), listAttendance);

export default attendanceRoutes;
