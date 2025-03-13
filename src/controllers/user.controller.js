import { getDatabase } from "../db/database.js";
import { formatDate, handleError } from "../utils/index.js";
import bcrypt from "bcryptjs";

const db = getDatabase();


export const getAllUsersController = (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, name, email, role, created_at, updated_at 
      FROM users
      ORDER BY name ASC
    `).all();

    res.render('users/list', {
      title: 'All Users',
      users,
      currentUser: req.user
    });
  } catch (error) {
    handleError(req,res.error,'Error fetching users','/dashboard')
  }
};

export const getUserProfileController = (req, res) => {
  try {
    const userId = req.params.id || req.user.id;
    
    const user = db.prepare(`
      SELECT id, name, email, role, created_at, updated_at 
      FROM users 
      WHERE id = ?
    `).get(userId);

    if (!user) {
      req.session.error =  'User not found';
      return res.redirect('/dashboard');
    }

    let enrolledCourses = [];
    if (user.role === 'student') {
      enrolledCourses = db.prepare(`
        SELECT c.id, c.title, c.description, e.progress, e.status, u.name as instructor_name
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        WHERE e.user_id = ?
      `).all(userId);
    }

    let instructedCourses = [];
    if (user.role === 'instructor' || user.role === 'admin') {
      instructedCourses = db.prepare(`
        SELECT id, title, description, status, created_at
        FROM courses
        WHERE instructor_id = ?
      `).all(userId);
    }

    res.render('users/profile', {
      title: 'User Profile',
      layout: "layouts/main",
      profileUser: user,
      enrolledCourses,
      instructedCourses,
      formatDate,
      currentUser: req.user,
      // success: req.flash('success'),
      // error: req.flash('error')
    });
  } catch (error) {
    handleError(req,res.error,'Error fetching user profile','/dashboard')
  }
};

export const getChangePasswordController = (req, res) => {
  res.render('users/change-password', {
    title: 'Change Password',
    layout: 'layouts/main',
    // success: req.flash('success'),
    // error: req.flash('error')
  });
};

export const changePasswordController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate password match
    if (newPassword !== confirmPassword) {
      req.session.error =  'New passwords do not match';
      return res.redirect('/users/profile/change-password');
    }

    // Get user from database
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      req.session.error = 'User not found';
      return res.redirect('/users/profile/change-password');
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      req.session.error = 'Current password is incorrect';
      return res.redirect('/users/profile/change-password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const result = db.prepare(`
      UPDATE users 
      SET password = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(hashedPassword, userId);

    if (result.changes > 0) {
      req.session.success =  'Password updated successfully';
      return res.redirect('/users/profile');
    }

    req.session.error = 'Failed to update password';
    res.redirect('/users/profile/change-password');
  } catch (error) {
    handleError(req, res, error, 'Error changing password', '/users/profile/change-password');
  }
};

export const updateUserProfileController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;
    
    const currentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    if (!currentUser) {
      req.session.error =  'User not found';
      return res.redirect('/users/profile');
    }

    let updateFields = [];
    let updateValues = [];

    if (name !== undefined && name !== currentUser.name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (email !== undefined && email !== currentUser.email) {
      const emailExists = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?')
        .get(email, userId);
      
      if (emailExists) {
        req.session.error =  'Email already in use';
        return res.redirect('/users/profile');
      }
      
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (updateFields.length === 0) {
      req.session.success =  'No changes submitted';
      return res.redirect('/users/profile');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(userId);

    const result = db.prepare(`
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).run(...updateValues);

    if (result.changes > 0) {
      req.user.name = name || req.user.name;
      req.user.email = email || req.user.email;
      req.session.success =  'Profile updated successfully';
    } else {
      req.session.error =  'Failed to update profile';
    }

    res.redirect('/users/profile');
  } catch (error) {
    handleError(req, res, error, 'Error updating profile', '/users/profile');
  }
};