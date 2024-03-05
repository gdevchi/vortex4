const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide name"],
  },
  description: String,
  uuid: String,
  public: {
    type: Boolean,
    default: true,
  },
  timeLimit: {
    type: Number,
    default: 30,
  },
  createdAt: Date,
});

module.exports = new mongoose.model("room", roomSchema);
