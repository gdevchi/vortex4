const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: [true, "Please provide username"],
  },
  userId: {
    type: String,
    required: [true, "Please provide socket Id"],
  },
  roomId: String,
  position: {
    x: Number,
    y: Number,
  },
  speechDisabled: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("user", userSchema);
