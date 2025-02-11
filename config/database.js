const mongoose = require("mongoose");
require("dotenv").config(); // Load environment variables

// Connect to the database
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI); // Just pass the connection string
        console.log("✅ MongoDB Connected Successfully!");
    } catch (err) {
        console.error("❌ MongoDB Connection Failed:", err);
        process.exit(1); // Exit the app if the connection fails
    }
};

module.exports = connectDB;
