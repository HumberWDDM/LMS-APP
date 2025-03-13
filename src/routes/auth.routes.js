import express from "express";
import { goToDashBoardIfAthMiddleware } from "../middlewares/auth.middleware.js";
import {
  getLoginForm,
  getRegisterForm,
  loginUserController,
  logout,
  registerUserController,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/login", goToDashBoardIfAthMiddleware, getLoginForm);
router.get("/register", goToDashBoardIfAthMiddleware, getRegisterForm);
router.get("/logout", logout);

router.post("/register", registerUserController);
router.post("/login", loginUserController);

export default router;
