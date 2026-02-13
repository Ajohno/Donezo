const mongoose = require("mongoose");
require("dotenv").config(); // Load environment variables

let cachedConnection = null;

// Connect to the database
const connectDB = async () => {
    if (cachedConnection) {
        return cachedConnection;
    }

    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI environment variable is required");
    }

    try {
        cachedConnection = await mongoose.connect(process.env.MONGO_URI); // Just pass the connection string
        console.log("✅ MongoDB Connected Successfully!");
        return cachedConnection;
    } catch (err) {
        cachedConnection = null;
        console.error("❌ MongoDB Connection Failed:", err);
        throw err;
    }
};

module.exports = connectDB;
