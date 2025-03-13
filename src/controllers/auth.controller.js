import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDatabase } from "../db/database.js";
import { handleError } from "../utils/index.js";

export const registerUserController = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;
    const allowedRoles = ["student", "instructor", "admin"];
    if (!allowedRoles.includes(role)) {
      req.session.error = "Invalid user role";
      return res.redirect("/auth/register");
    }
    const db = getDatabase();

    if (password !== confirmPassword) {
      req.session.error = "Passwords do not match"
      // req.flash("error", "Passwords do not match");
      return res.redirect("/auth/register");
    }

    const existingUser = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);
    if (existingUser) {
      req.session.error = "Email already in use"

      // req.flash("error", "Email already in use");
      return res.redirect("/auth/register");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const insertUser = db.prepare(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
    );
    const result = insertUser.run(name, email, hashedPassword, role);

    // Retrieve newly inserted user
    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(result.lastInsertRowid);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name , createdAt:user.create_at},
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    req.session.success = `Registration successful! Welcome ${name}`
    // req.flash("success", `Registration successful! Welcome ${name}`);
    res.redirect("/dashboard");
  } catch (error) {
    handleError(req,res,error,"Registration failed. Please try again.","/auth/register")
  }
};

export const loginUserController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDatabase();

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    // console.log("user", user.created_at);
    
    if (!user) {
      req.session.error = "Invalid email or password"
      // req.flash("error", "Invalid email or password");
      return res.redirect("/auth/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // req.flash("error", "Incorrect password");
      req.session.error = "Invalid email or password"
      console.log("Flash message set:", req.flash("error"));
      return res.redirect("/auth/login");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name,createdAt:user.created_at },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });
    req.session.success = `Welcome back, ${user.name}!`;
    // req.flash("success", `Welcome back, ${user.name}!`);
    res.redirect("/dashboard");
  } catch (error) {
    handleError(req,res,error,"Login failed. Please try again.","/auth/login")
  }
};

export const logout = (req, res) => {
  res.clearCookie("accessToken");
  req.session.success = "You have been logged out successfully"
  // req.flash("success", "You have been logged out successfully");
  res.redirect("/auth/login");
};

export const getLoginForm = (req, res) => {
  res.render("auth/login", {
    title: "Login",
    layout: "layouts/main",
    // success: req.flash("success"),
    // error: req.flash("error"),
    formData: req.flash("formData")[0] || {},
    // user: undefined,
  });
};

export const getRegisterForm = (req, res) => {
  res.render("auth/register", {
    title: "Register",
    layout: "layouts/main",
    // success: req.flash("success"),
    // error: req.flash("error"),
    formData: req.flash("formData")[0] || {},
    // user: undefined,
  });
};
