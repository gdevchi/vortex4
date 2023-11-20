const uuid = require("uuid");

const RoomModel = require("../models/Room.Model");

exports.createRoom = async function (req, res) {
  try {
    const room = await RoomModel.create({
      ...req.body,
      uuid: uuid.v4(),
    });
    return res.status(200).json({
      status: "success",
      data: {
        room,
      },
    });
  } catch (err) {
    return res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.fetchRooms = async function (req, res) {
  try {
    const query = {};
    if (["guest", "user"].includes(req.account.role)) query.public = true;

    const rooms = await RoomModel.find(query).lean();
    return res.status(200).json({
      status: "success",
      result: rooms.length,
      data: {
        rooms,
      },
    });
  } catch (err) {
    return res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.updateRoom = async function (req, res) {
  try {
    const result = await RoomModel.updateOne(
      { _id: req.params.roomId },
      req.body
    );
    if (!result.acknowledged) throw new Error("Failed to update room!");

    return res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    return res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

exports.deleteRoom = async function (req, res) {
  try {
    const result = await RoomModel.deleteOne({ _id: req.params.roomId });
    if (!result.deletedCount) throw new Error("Failed to delete room!");

    return res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    return res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};
