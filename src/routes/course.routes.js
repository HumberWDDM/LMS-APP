import express from "express";
import {
  createCourseController,
  deleteCourseController,
  listCoursesController,
  viewCourseController,
  updateCourseController,
  showCreateCourseForm,
  showEditCourseForm,
} from "../controllers/course.controller.js";
import {
  isInstructorMiddleware,
  isInstructorOrAdminMiddleware,
} from "../middlewares/roleCheck.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/thumbnail.middleware.js";

const router = express.Router();

// Course routes
router.get("/list", listCoursesController);
router.get("/view/:id", viewCourseController);
router.get("/create", authMiddleware, isInstructorMiddleware,showCreateCourseForm)
router.post("/create",authMiddleware,isInstructorMiddleware,upload.single("thumbnail"),createCourseController);
router.get("/:id/edit",authMiddleware,isInstructorOrAdminMiddleware,showEditCourseForm)
router.post(
  "/:id/update",
  authMiddleware,
  isInstructorOrAdminMiddleware,
  upload.single("thumbnail"),
  updateCourseController
);
router.post(
  "/:id/delete",
  authMiddleware,
  isInstructorOrAdminMiddleware,
  deleteCourseController
);


export default router;
