import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import expressLayouts from "express-ejs-layouts";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import session from "express-session";
import flash from "connect-flash";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import courseRoutes from "./routes/course.routes.js";
import userRoutes from "./routes/user.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

// Database initialization
import { initializeDatabase } from "./db/database.js";
import { runMigrations } from "./db/migrations.js";

// Middleware
import { checkUserMiddleware } from "./middlewares/auth.middleware.js";

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initializeDatabase();

// Middleware setup
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "../public")));
app.use(cookieParser());

// Set up EJS
app.use(expressLayouts);

// Setup flash messages
// app.use(flash());

// Setup session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.set("layout", "layouts/main");

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success = req.session.success;
  res.locals.error = req.session.error;
  // Clear the messages from session after transferring
  delete req.session.error;
  delete req.session.success;

  next();
});

// Check auth status on all routes
app.use("*", checkUserMiddleware);

// Routes
app.use("/", dashboardRoutes);
app.use("/auth", authRoutes);
app.use("/courses", courseRoutes);
app.use("/users", userRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

async function startServer() {
  try {
    initializeDatabase();
    runMigrations();
    // Start your Express server here
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
}
// Start server

startServer();
