const mongoose = require("mongoose");

// Define Task Schema
const TaskSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, // Link each task to a user
        ref: "User", // Reference the "User" model
        required: true // Make sure every task has an associated user
    },
    taskDescription: { type: String, required: true }, // The actual task
    taskDate: { type: String, required: true } // The due date
});

// Export the model so it can be used elsewhere in the project
module.exports = mongoose.model("Task", TaskSchema);
