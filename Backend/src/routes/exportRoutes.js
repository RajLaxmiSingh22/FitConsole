import { Router } from "express";
import {
  exportAttendance,
  exportClients,
  exportCourseRevenue,
  exportDues,
  exportGst,
  exportPayments,
} from "../controllers/exportController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { reportRangeQuerySchema } from "../utils/reportRange.js";

const exportRoutes = Router();
exportRoutes.use(requireAuthentication, requireRole("owner"));
exportRoutes.get("/payments.xlsx", exportPayments);
exportRoutes.get("/clients.xlsx", exportClients);
const ranged = validateRequest({ query: reportRangeQuerySchema });
exportRoutes.get("/course-revenue.xlsx", ranged, exportCourseRevenue);
exportRoutes.get("/gst.xlsx", ranged, exportGst);
exportRoutes.get("/dues.xlsx", ranged, exportDues);
exportRoutes.get("/attendance.xlsx", ranged, exportAttendance);

export default exportRoutes;
