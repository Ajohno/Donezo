const mongoose = require("mongoose");

// The fields for a user in the database
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

module.exports = mongoose.model("User", UserSchema);
