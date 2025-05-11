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

require("dotenv").config(); // Loads environment variables
require("./config/passport-config")(passport); // Configures Passport authentication

const app = express();
const port = process.env.PORT || 3000;

let appdata = [];

// Connect to MongoDB
connectDB();

// Middleware -----------------------------------------------------------------------------------

// Ensure a user is logged in before accessing routes
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next(); // If the user is authenticated, continue to the route
    }
    res.status(401).json({ error: "Unauthorized - Please log in" });
}

// Session Handling
app.use(session({
    secret: process.env.SESSION_SECRET || "fallback_secret", // Encryption key
    resave: false, // Don't save session if nothing has changed
    saveUninitialized: false // Don't create session until something is stored
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
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10); // Fixes password hashing

        const newUser = await User.create({ username, password: hashedPassword });
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error during registration" });
    }
});

// Login Route
app.post("/login", passport.authenticate("local"), (req, res) => {
    res.json({ message: "Logged in successfully", user: req.user });
});

// Logout Route
app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: "Error logging out" });
        }
        res.json({ message: "Logged out successfully" });
    });
});

// Serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});



// Handles the submit button
app.post("/submit", ensureAuthenticated, async (req, res) => {
    try {
        const newTask = new Task({
            user: req.user.id,
            taskDescription: req.body.taskDescription,
            taskDate: req.body.taskDate
        });

        await newTask.save();

        const userTasks = await Task.find({ user: req.user.id });
        res.status(200).json(userTasks);
    } catch (err) {
        console.error("Error Saving Task:", err);
        res.status(500).json({ error: "Server error while saving task" });
    }
});

// Gets tasks for the logged-in user
app.get("/tasks", ensureAuthenticated, async (req, res) => {
    try {
        const userTasks = await Task.find({ user: req.user.id });
        res.status(200).json(userTasks);
    } catch (err) {
        console.error("Error Fetching Tasks:", err);
        res.status(500).json({ error: "Server error while retrieving tasks" });
    }
});

// Route to update tasks in the MongoDB database
app.put("/tasks/:taskId", ensureAuthenticated, async (req, res) => {
    const { taskId } = req.params;
    const { taskDescription } = req.body;

    try {
        const task = await Task.findOne({ _id: taskId, user: req.user.id });

        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        task.taskDescription = taskDescription;
        await task.save();

        res.status(200).json(task);
    } catch (err) {
        console.error("Error Updating Task:", err);
        res.status(500).json({ error: "Server error while updating task" });
    }
});

//Route for deleting tasks
app.delete("/tasks/:taskId", ensureAuthenticated, async (req, res) => {
    const { taskId } = req.params;

    try {
        const task = await Task.findOneAndDelete({ _id: taskId, user: req.user.id });

        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        res.status(200).json({ message: "Task deleted successfully" });
    } catch (err) {
        console.error("Error Deleting Task:", err);
        res.status(500).json({ error: "Server error while deleting task" });
    }
});


// Route to check user authentication status
app.get("/auth-status", (req, res) => {
    console.log("Checking authentication status...");
    console.log("Session data:", req.session);
    console.log("User data:", req.user);

    if (req.isAuthenticated()) {
        console.log("User is authenticated:", req.user);
        res.json({ loggedIn: true, user: { username: req.user.username } });
    } else {
        console.log("User is NOT authenticated");
        res.json({ loggedIn: false });
    }
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