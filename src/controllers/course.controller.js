import { getDatabase } from "../db/database.js";
import { handleError } from "../utils/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {uploadDir} from "../utils/index.js"

const __fileName = fileURLToPath(import.meta.url);
const __dirName = path.dirname(__fileName);
const db = getDatabase();


export const listCoursesController = (req, res) => {
  try {
    const courses = db
      .prepare(
        `
          SELECT c.*, u.name as instructor_name 
          FROM courses c
          JOIN users u ON c.instructor_id = u.id
          WHERE c.status = 'active'
        `
      )
      .all();

    res.render("courses/list", {
      title: "All Courses",
      layout: "layouts/main",
      courses,
      // success: req.flash("success"),
      // error: req.flash("error"),
    });
  } catch (error) {
    handleError(req, res, error, "Failed to load courses", "/dashboard");
  }
};

export const viewCourseController = (req, res) => {
  try {
    const { id } = req.params;

    const course = db
      .prepare(
        `
        SELECT c.*, u.name as instructor_name 
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.id = ? AND c.status = 'active'
      `
      )
      .get(id);

    if (!course) {
      req.session.error = "Course not found";
      return res.redirect("/dashboard");
    }

    // Get modules for the course
    const modules = db
      .prepare(
        `
    SELECT * FROM modules
    WHERE course_id = ?
    ORDER BY order_index ASC
  `
      )
      .all(course.id);

    // Get contents for each module
    modules.forEach((module) => {
      module.contents = db
        .prepare(
          `
          SELECT * FROM contents
          WHERE module_id = ?  
          ORDER BY order_index ASC
        `
        )
        .all(module.id);
    });
    // Get assignments for the course
    const assignments = db
      .prepare(
        `
    SELECT * FROM assignments
    WHERE course_id = ?
  `
      )
      .all(course.id);

    res.render(`courses/view`, {
      title: "View Course",
      layout: "layouts/main",
      course,
      modules,
      assignments,
      // success: req.flash("success"),
      // error: req.flash("error"),
    });
  } catch (error) {
    handleError(req, res, error, "Failed to load course details", "/dashboard");
  }
};

export const showCreateCourseForm = (req, res) => {
  res.render("courses/create", {
    title: "Add Courses",
    layout: "layouts/main",
    // instructor: getInstructor(),
    formData: req.flash("formData")[0] || {},
    // error: req.flash("error"),
  });
};

export const createCourseController = (req, res) => {
  try {
    const instructorId = req.user.id;
    const { title, description } = req.body;
    let thumbnailPath = null, filePath = null;

    if (req.file) {
      const thumbnailUploadDir = uploadDir();
      filePath = path.join(thumbnailUploadDir, req.file.filename);

      console.log("Uploaded file path:", filePath);
      console.log("Checking if file exists:", fs.existsSync(filePath));

      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        throw new Error(`Uploaded file not found in public directory`);
      }
      thumbnailPath = filePath;
    }

    if (!title || !instructorId) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      req.session.error = "Title and instructor are required"
      // req.flash("formData", req.body);
      return res.redirect("/dashboard");
    }

    const instructor = db.prepare(
      "SELECT * FROM users WHERE id = ? AND role IN ('instructor', 'admin')"
    ).get(instructorId);

    if (!instructor) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      req.session.error = "Instructor not found";
      // req.flash("formData", req.body);
      return res.redirect("/dashboard");
    }

    const result = db.prepare(
      `INSERT INTO courses (title, description, instructor_id, thumbnail, status)
       VALUES (?, ?, ?, ?, 'active')`
    ).run(title, description, instructorId, thumbnailPath);

    if (result.changes > 0) {
      req.session.success =  "Course created successfully";
      return res.redirect(`/dashboard`);
    } else {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      req.session.error =  "Failed to create course";
      return res.redirect("/dashboard");
    }
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Error creating course:", error);
    handleError(req, res, error, "Error creating course", "/dashboard");
  }
};


export const showEditCourseForm = (req, res) => {
  try {
    const course = db
      .prepare("SELECT * FROM courses WHERE id = ?")
      .get(req.params.id);
    if (!course) {
      req.session.error =  "Course not found";
      return res.redirect("/dashboard");
    }
    res.render("courses/edit", {
      title: "Edit Course",
      layout: "layouts/main",
      course,
      // instructors: getInstructors(),
      // error: req.flash("error"),
    });
  } catch (error) {
    handleError(req, res, error, "Failed to load edit form", "/courses/list");
  }
};

export const updateCourseController = (req, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;
    const { title, description, status } = req.body;
    let thumbnailPath = null;

    // Check if course exists
    const existingCourse = db
      .prepare("SELECT * FROM courses WHERE id = ? AND instructor_id = ?")
      .get(id, instructorId);

    if (!existingCourse) {
      // Clean up file if there was an upload
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      req.session.error = "Course not found";
      return res.redirect("/dashboard");
    }

    // Build update query dynamically based on provided fields
    let updateFields = [];
    let updateValues = [];

    if (title) {
      updateFields.push("title = ?");
      updateValues.push(title);
    }

    if (description) {
      updateFields.push("description = ?");
      updateValues.push(description);
    }

    // Handle file upload
    if (req.file) {
      // Save the relative path to the database
      thumbnailPath = `/uploads/course-thumbnails/${req.file.filename}`;
      updateFields.push("thumbnail = ?");
      updateValues.push(thumbnailPath);

      // Delete old thumbnail if it exists
      if (existingCourse.thumbnail) {
        try {
          const oldFilePath = path.join(
            process.cwd(),
            "public",
            existingCourse.thumbnail
          );
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (err) {
          console.error("Error deleting old thumbnail:", err);
        }
      }
    }

    if (status) {
      if (!["active", "draft", "archived", "deleted"].includes(status)) {
        // Clean up file if there was an upload
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }

        req.session.error = "Invalid status value. Must be one of: active, draft, archived, deleted"
        return res.redirect(`/courses/${id}/edit`);
      }
      updateFields.push("status = ?");
      updateValues.push(status);
    }

    updateFields.push("updated_at = CURRENT_TIMESTAMP");

    if (updateFields.length === 1) {
      // Clean up file if there was an upload
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }

      req.session.success =  "No changes submitted";
      return res.redirect(`/courses/${id}/edit`);
    }

    // Add course ID to values array
    updateValues.push(id);

    const result = db
      .prepare(
        `
        UPDATE courses
        SET ${updateFields.join(", ")}
        WHERE id = ?
      `
      )
      .run(...updateValues);

    if (result.changes > 0) {
      req.session.success =  "Course updated successfully";
      return res.redirect(`/dashboard`);
    }

    // Clean up file if the update failed
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    req.session.error = "Failed to update course";
    res.redirect(`/courses/${id}/edit`);
  } catch (error) {
    // Clean up file if there was an upload
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    console.error("Error updating course:", error);
    handleError(
      req,
      res,
      error,
      "Error updating course",
      `/courses/${req.params.id}/edit`
    );
  }
};

export const deleteCourseController = (req, res) => {
  try {
    const { id } = req.params;

    // Check if course exists
    const existingCourse = db
      .prepare("SELECT * FROM courses WHERE id = ?")
      .get(id);

    if (!existingCourse) {
      req.session.error = "Course not found";
      return res.redirect("/dashboard");
    }
    // Soft delete by updating status
    const result = db
      .prepare(
        `
        UPDATE courses
        SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
      )
      .run(id);

    if (result.changes > 0) {
      req.session.success = "Course deleted successfully";
      res.redirect("/courses/list");
    } else {
      req.session.error =  "Failed to delete course";
      return res.redirect(`/courses/${id}`);
    }
  } catch (error) {
    handleError(
      req,
      res,
      error,
      "Failed to delete course",
      `/courses/${req.params.id}`
    );
  }
};
