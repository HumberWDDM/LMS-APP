import jwt from "jsonwebtoken";
import { getDatabase } from "../db/database.js";

// Verify token and require authentication
export const authMiddleware = (req, res, next) => {
  const token = req.cookies.accessToken;
  const db = getDatabase();
  

  if (!token) {
    req.flash("error", "Please log in or register to access this page");
    return res.redirect("/auth/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("decoded",decoded);
    
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(decoded.email);
    if (!user) {
      res.clearCookie("accessToken");
      req.flash("error", "User not found");
      return res.redirect("/auth/login");
    }
    req.user = decoded;
    res.locals.user = decoded
    next();
  } catch (error) {
    console.error("Authentication error", error);
    res.clearCookie("accessToken");

    let message = "Session expired, please login again";
    if (error.name === "JsonWebTokenError") {
      message = "Invalid session, please login again";
    }
    req.flash("error", message);
    return res.redirect("/auth/login");
  }
};

// Verify if user is already logged in
export const goToDashBoardIfAthMiddleware = (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    // req.flash("error", "Please login or register to proceed");
    return next();
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    req.flash("info", "You are already logged in");
    return res.redirect("/dashboard");
  } catch (error) {
    console.log(error);
    return next();
  }
};

export const checkUserMiddleware = (req, res, next) => {
  const token = req.cookies.accessToken;

  res.locals.user = null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDatabase();

    const user = db
      .prepare("SELECT id, name, email, role FROM users WHERE id = ?")
      .get(decoded.id);

    if (user) {
      res.locals.user = user;
      req.user = user;
    }

    next();
  } catch (error) {
    console.error(error);
    req.flash("error", error);
    return res.redirect("/auth/login");
  }
};


