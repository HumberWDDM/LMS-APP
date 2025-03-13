import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getDashboard,
  getHomepage,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/", getHomepage);
router.get("/dashboard", authMiddleware, getDashboard);

export default router;
