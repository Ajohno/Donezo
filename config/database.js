const mongoose = require("mongoose");
require("dotenv").config(); // Load environment variables

let connectionPromise = null;

// Connect to the database
const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI environment variable is required");
    }

    // readyState: 1 = connected
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = mongoose
        .connect(process.env.MONGO_URI)
        .then((connection) => {
            console.log("✅ MongoDB Connected Successfully!");
            return connection;
        })
        .catch((err) => {
            console.error("❌ MongoDB Connection Failed:", err);
            throw err;
        })
        .finally(() => {
            // Clear so a later request can retry if this attempt failed
            connectionPromise = null;
        });

    return connectionPromise;
};

module.exports = connectDB;
