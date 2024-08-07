const mongoose = require("mongoose");

const accountSchema = mongoose.Schema({
  address: {
    type: String,
    required: [true, "Please provide address"],
  },
  nonce: {
    type: String,
    required: [true, "Please provide nonce"],
  },
  firstName: String,
  lastName: String,
  username: {
    type: String,
    unique: true,
    required: [true, "Please provide username"],
  },
  email: String,
  description: String,
  createdAt: Date,
});

module.exports = mongoose.model("account", accountSchema);
