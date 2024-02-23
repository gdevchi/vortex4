const mongoose = require("mongoose");

const adminSchema = mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  createdAt: Date,
});

module.exports = mongoose.model("admin", adminSchema);
