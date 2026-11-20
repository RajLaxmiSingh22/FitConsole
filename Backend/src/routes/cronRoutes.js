import { Router } from "express";
import { dailyMaintenance } from "../controllers/cronController.js";

const router = Router();

router.get("/daily", dailyMaintenance);

export default router;
