const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  account: {
    id: String,
    role: String,
    label: String,
  },
  username: String,
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
    default: true,
  },
  assignedAt: Number,
  status: {
    type: String,
    enum: {
      values: ["joined", "waitlisted"],
      message: "Please provide valid status",
    },
    default: "joined",
  },
  micMuted: {
    type: Boolean,
    default: false,
  },
  active: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("user", userSchema);
