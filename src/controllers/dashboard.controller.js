import { getDatabase } from '../db/database.js';
import { formatDate } from '../utils/index.js';

export const getDashboard = (req, res) => {
  try {
    if (!res.locals.user) {
      return res.redirect('/auth/login');
    }

    const db = getDatabase();
    const { id: userId, role } = res.locals.user;
    const isAdmin = role === 'admin';
    const isInstructor = role === 'instructor';
    const isStudent = role === 'student';

    // Role-based data fetching
    let courses, recentAssignments, recentActivity, allStudents, allInstructors, availableCourses;

    if (isAdmin) {
      // Admin sees all courses and assignments
      courses = db.prepare(`
        SELECT c.*, u.name as instructor_name, 
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as student_count
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.status != 'deleted'
        ORDER BY c.created_at DESC
        LIMIT 5
      `).all();

      recentActivity = db.prepare(`
        SELECT 
          'submission' as type,
          a.title, 
          s.submitted_at as timestamp,
          u.name as user_name,
          null as course_id
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON s.user_id = u.id
        UNION ALL
        SELECT 
          'enrollment' as type,
          c.title, 
          e.created_at as timestamp,
          u.name as user_name,
          c.id as course_id
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON e.user_id = u.id
        UNION ALL
        SELECT 
          'course_created' as type,
          c.title,
          c.created_at as timestamp,
          u.name as user_name,
          c.id as course_id
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.created_at = c.updated_at
        UNION ALL
        SELECT 
          'course_updated' as type,
          c.title,
          c.updated_at as timestamp,
          u.name as user_name,
          c.id as course_id
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.created_at != c.updated_at AND c.status != 'deleted'
        UNION ALL
        SELECT 
          'course_deleted' as type,
          c.title,
          c.updated_at as timestamp,
          u.name as user_name,
          c.id as course_id
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.status = 'deleted'
        ORDER BY timestamp DESC
        LIMIT 5
      `).all();

      // Get all students for admin view
      allStudents = db.prepare(`
        SELECT u.id, u.name, u.email, u.created_at,
        (SELECT COUNT(*) FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.user_id = u.id AND c.status != 'deleted') as enrolled_courses
        FROM users u
        WHERE u.role = 'student'
        ORDER BY u.name
      `).all();

      // Get all instructors for admin view
      allInstructors = db.prepare(`
        SELECT u.id, u.name, u.email, u.created_at,
        (SELECT COUNT(*) FROM courses WHERE instructor_id = u.id AND status != 'deleted') as course_count
        FROM users u
        WHERE u.role = 'instructor'
        ORDER BY u.name
      `).all();

    } else if (isInstructor) {
      // Instructor sees their own courses and related data
      courses = db.prepare(`
        SELECT c.*, 
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as student_count
        FROM courses c
        WHERE c.instructor_id = ? AND c.status != 'deleted'
        ORDER BY c.created_at DESC
        LIMIT 5
      `).all(userId);


      // Enhanced activity tracking for instructors including deletions
      recentActivity = db.prepare(`
        SELECT 
          'submission' as type,
          a.title, 
          s.submitted_at as timestamp,
          u.name as user_name,
          c.id as course_id
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON s.user_id = u.id
        JOIN courses c ON a.course_id = c.id
        WHERE c.instructor_id = ? AND c.status != 'deleted'
        UNION ALL
        SELECT 
          'enrollment' as type,
          c.title, 
          e.created_at as timestamp,
          u.name as user_name,
          c.id as course_id
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON e.user_id = u.id
        WHERE c.instructor_id = ? AND c.status != 'deleted'
        UNION ALL
        SELECT 
          'course_created' as type,
          c.title,
          c.created_at as timestamp,
          'You' as user_name,
          c.id as course_id
        FROM courses c
        WHERE c.instructor_id = ? AND c.created_at = c.updated_at
        UNION ALL
        SELECT 
          'course_updated' as type,
          c.title,
          c.updated_at as timestamp,
          'You' as user_name,
          c.id as course_id
        FROM courses c
        WHERE c.instructor_id = ? AND c.created_at != c.updated_at AND c.status != 'deleted'
        UNION ALL
        SELECT 
          'course_deleted' as type,
          c.title,
          c.updated_at as timestamp,
          'You' as user_name,
          c.id as course_id
        FROM courses c
        WHERE c.instructor_id = ? AND c.status = 'deleted'
        ORDER BY timestamp DESC
        LIMIT 5
      `).all(userId, userId, userId, userId, userId);

    } else if (isStudent) {
      // Student sees their enrolled courses and assignments
      courses = db.prepare(`
        SELECT c.*, u.name as instructor_name, e.progress
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        WHERE e.user_id = ? AND c.status != 'deleted'
        ORDER BY e.updated_at DESC
        LIMIT 5
      `).all(userId);

      courses = courses.map(course => {
        const isEnrolled = db.prepare(`
          SELECT COUNT(*) as count FROM enrollments WHERE user_id = ? AND course_id = ?
        `).get(userId, course.id).count > 0;
        return { ...course, isEnrolled };
      });

      // Get available courses that the student is not enrolled in
      availableCourses = db.prepare(`
        SELECT c.*, u.name as instructor_name, 
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as student_count,
        c.description as course_description
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.status != 'deleted'
        AND c.id NOT IN (
          SELECT course_id FROM enrollments WHERE user_id = ?
        )
        ORDER BY c.created_at DESC
      `).all(userId);


      recentActivity = db.prepare(`
        SELECT 
          'submission' as type,
          a.title, 
          s.submitted_at as timestamp,
          'You' as user_name,
          null as course_id
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE s.user_id = ? AND c.status != 'deleted'
        UNION ALL
        SELECT 
          'enrollment' as type,
          c.title, 
          e.created_at as timestamp,
          'You' as user_name,
          c.id as course_id
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = ? AND c.status != 'deleted'
        UNION ALL
        SELECT 
          'course_deleted' as type,
          c.title,
          c.updated_at as timestamp,
          u.name as user_name,
          c.id as course_id
        FROM courses c
        JOIN enrollments e ON c.id = e.course_id
        JOIN users u ON c.instructor_id = u.id
        WHERE e.user_id = ? AND c.status = 'deleted'
        ORDER BY timestamp DESC
        LIMIT 5
      `).all(userId, userId, userId);
    }
    
    res.render('dashboard', { 
      title: 'Dashboard',
      courses,
      recentAssignments,
      recentActivity,
      allStudents: isAdmin ? allStudents : null,
      allInstructors: isAdmin ? allInstructors : null,
      availableCourses: isStudent ? availableCourses : null,
      formatDate,
      isAdmin,
      isInstructor,
      isStudent,
      user: res.locals.user,
      layout: "layouts/main",
      //success: req.flash("success"),
    });
  } catch (error) {
    console.error(error);
    req.success.error = 'Failed to load dashboard',

    res.render('dashboard', { 
      title: 'Dashboard',
      courses: [],
      recentAssignments: [],
      recentActivity: [],
      allStudents: null,
      allInstructors: null,
      availableCourses: null,
      isAdmin: false,
      isInstructor: false,
      isStudent: false,
      // error: 'Failed to load dashboard',
      layout: "layouts/main",
      // success: req.flash("success"),
    });
  }
};

export const getHomepage = (req, res) => {
  if (res.locals.user) {
    return res.redirect('/dashboard');
  }
  
  res.render('home', { 
    title: 'Learning Management System',
    layout: 'layouts/main'
  });
};