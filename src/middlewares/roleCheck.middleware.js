export const isAdminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  };
  
  export const isInstructorMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'instructor') {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. Instructor role required.'
    });
  };
  
  export const isInstructorOrAdminMiddleware = (req, res, next) => {
    if (req.user && (req.user.role === 'instructor' || req.user.role === 'admin')) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. Instructor or admin role required.'
    });
  };
  
  export const isCourseInstructorMiddleware = (req, res, next) => {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    // If user is admin, allow access
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user is the instructor for this course
    const db = req.db;
    const course = db.prepare('SELECT * FROM courses WHERE id = ? AND instructor_id = ?')
      .get(courseId, userId);
      
    if (course) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. You are not the instructor for this course.'
    });
  };
  
  export const isEnrolledInCourseMiddleware = (req, res, next) => {
    const { courseId } = req.params;
    const userId = req.user.id;
    
    // If user is admin or instructor, allow access
    if (req.user.role === 'admin' || req.user.role === 'instructor') {
      return next();
    }
    
    // Check if user is enrolled in this course
    const db = req.db;
    const enrollment = db.prepare(
      'SELECT * FROM enrollments WHERE course_id = ? AND user_id = ? AND status = "active"'
    ).get(courseId, userId);
      
    if (enrollment) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. You are not enrolled in this course.'
    });
  };