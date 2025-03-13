import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { changePasswordController, getAllUsersController, getChangePasswordController, getUserProfileController, updateUserProfileController } from "../controllers/user.controller.js";
import { isAdminMiddleware } from "../middlewares/roleCheck.middleware.js";

const router = express.Router()

router.get("/profile", authMiddleware,getUserProfileController)
router.get("/profile/change-password", authMiddleware, getChangePasswordController)
router.get("/all", authMiddleware, isAdminMiddleware, getAllUsersController )

router.post("/profile/change-password", authMiddleware, changePasswordController)
router.post("/profile/update", authMiddleware, updateUserProfileController)

export default router