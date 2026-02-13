const mongoose = require("mongoose");

// Define Task Schema
const TaskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, trim: true, default: "" },
    description: { type: String, required: true, trim: true },

    dueDate: { type: Date, default: null },

    effortLevel: { type: Number, min: 1, max: 5, default: 3 },

    status: { type: String, enum: ["active", "completed"], default: "active" },
    completedAt: { type: Date, default: null },

    isBigThree: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);
