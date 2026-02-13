const express = require("express");
const fs = require("fs");
const mime = require("mime");
const path = require("path");
const connectDB = require("./config/database"); // Connects to MongoDB
const session = require("express-session"); // Handles sessions for logged-in users
const passport = require("passport"); // Middleware for authentication
const bcrypt = require("bcryptjs"); // Used to hash passwords
const User = require("./config/models/user"); // User model for the database
const Task = require("./config/models/task"); // Task model for the database
const MongoStore = require("connect-mongo").default; // Store sessions in MongoDB


require("dotenv").config(); // Loads environment variables
require("./config/passport-config")(passport); // Configures Passport authentication

const app = express();
const port = process.env.PORT || 3000;
const REMEMBER_ME_MS = 14 * 24 * 60 * 60 * 1000;

let appdata = [];

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

// Connect to MongoDB
app.use(async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (error) {
    console.error("Database unavailable for request", error);
    return res.status(503).json({ error: "Service temporarily unavailable" });
  }
});

// Middleware -----------------------------------------------------------------------------------

// Ensure a user is logged in before accessing routes
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next(); // If the user is authenticated, continue to the route
    }
    res.status(401).json({ error: "Unauthorized - Please log in" });
}

// Session Handling
app.set("trust proxy", 1); // important on Vercel / proxies

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // https only in prod
    sameSite: "lax",
    maxAge: REMEMBER_ME_MS
  }
}));


app.use(passport.initialize());
app.use(passport.session()); // Enables persistent login sessions

app.use(express.json()); // Middleware to parse JSON request body
app.use(express.urlencoded({ extended: false })); // Parses form data

// Serve static files from the "public" directory
app.use(express.static("public"));

// ROUTES -----------------------------------------------------------------------------------

// Register Route
app.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({ firstName: firstName.trim(), lastName: lastName.trim(), email: normalizedEmail, passwordHash });

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);

    if (error && error.code === 11000) {
      return res.status(400).json({ error: "Email already exists" });
    }

    if (error && error.name === "ValidationError") {
      return res.status(400).json({ error: "Invalid registration data" });
    }

    return res.status(500).json({ error: "Server error while registering user" });
  }
});


// Login Route
app.post("/login", (req, res, next) => {
  const { rememberMe } = req.body;

  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || "Login failed" });

    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) return next(regenerateErr);

      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);

        if (rememberMe) {
          req.session.cookie.maxAge = REMEMBER_ME_MS;
        } else {
          // Keep a bounded persistent cookie to improve Safari/PWA reliability.
          req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
        }

        return res.json({
          message: "Logged in successfully",
          user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email },
        });
      });
    });
  })(req, res, next);
});


// Logout Route
app.post("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: "Error logging out" });
        }
        req.session.destroy(() => {
          res.clearCookie("connect.sid");
          res.json({ message: "Logged out successfully" });
        });
    });
});

// Serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});



// Handles the submit button
app.post("/tasks", ensureAuthenticated, async (req, res) => {
  const { description, dueDate, effortLevel } = req.body;
  let parsedDueDate = null;
  if (typeof dueDate === "string" && dueDate.trim() !== "") {
    parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ error: "Invalid due date" });
    }
  }

  await Task.create({
    userId: req.user.id,
    description: description.trim(),
    dueDate: parsedDueDate,
    effortLevel: parseInt(effortLevel, 10) || 3,
    status: "active",
  });

  const userTasks = await Task.find({ userId: req.user.id });
  return res.json(userTasks);
});


// Gets tasks for the logged-in user
app.get("/tasks", ensureAuthenticated, async (req, res) => {
    try {
        const userTasks = await Task.find({ userId: req.user.id });
        res.status(200).json(userTasks);
    } catch (err) {
        console.error("Error Fetching Tasks:", err);
        res.status(500).json({ error: "Server error while retrieving tasks" });
    }
});

// Route to update tasks in the MongoDB database
app.put("/tasks/:taskId", ensureAuthenticated, async (req, res) => {
  const task = await Task.findOne({ _id: req.params.taskId, userId: req.user.id });
  if (!task) return res.status(404).json({ error: "Task not found" });

  // allow updates
  if (req.body.description) task.description = req.body.description.trim();
  if (req.body.status) task.status = req.body.status;

  await task.save();
  return res.json(task);
});

// Route to delete a task
app.delete("/tasks/:taskId", ensureAuthenticated, async (req, res) => {
  try {
    const deleted = await Task.findOneAndDelete({
      _id: req.params.taskId,
      userId: req.user.id, // important: only delete your own tasks
    });

    if (!deleted) {
      return res.status(404).json({ error: "Task not found" });
    }

    return res.json({ message: "Task deleted successfully" });
    fetchTasks(); // Refresh the task list on the client side
  } catch (err) {
    console.error("Error deleting task:", err);
    return res.status(500).json({ error: "Server error while deleting task" });
  }
});






// Route to check user authentication status
app.get("/auth-status", (req, res) => {
  if (!req.isAuthenticated()) return res.json({ loggedIn: false });

  return res.json({
    loggedIn: true,
    user: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
    },
  });
});


// Serve other static files dynamically
app.get("/:file", (req, res) => {
    const filename = path.join(__dirname, "public", req.params.file);
    if (fs.existsSync(filename)) {
        res.type(mime.getType(filename));
        res.sendFile(filename);
    } else {
        res.status(404).send("404 Error: File Not Found");
    }
});

if (require.main === module) {
    // Only execute when this file is run directly (local dev)

    // Start the Express server
    app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    });
}

// Always export for Vercel
module.exports = app;
