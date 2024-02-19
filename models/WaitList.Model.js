const mongoose = require("mongoose");

const waitlistSchema = mongoose.Schema({
  userId: {
    type: String,
    required: [true, "Please provide socket Id"],
  },
  username: String,
  roomId: {
    type: String,
    required: [true, "Please provide room Id"],
  },
  createdAt: Date,
});

module.exports = mongoose.model("waitlist", waitlistSchema);
