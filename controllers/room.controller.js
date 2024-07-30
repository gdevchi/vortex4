const uuid = require("uuid");

const RoomModel = require("../models/Room.Model");

const userServices = require("../services/user.services");
const ioServices = require("../services/io.services");

const MAX_ROOM_LIMIT = Number.parseInt(process.env.MAX_ROOM_LIMIT || 0);

exports.MAX_ROOM_LIMIT = MAX_ROOM_LIMIT;

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

    //const rooms = await RoomModel.find(query).lean();
    const rooms = await RoomModel.aggregate([
      {
        $match: query,
      },
      {
        $lookup: {
          from: "users",
          localField: "uuid",
          foreignField: "roomId",
          as: "users",
        },
      },
      {
        $project: {
          _id: 1,
          uuid: 1,
          name: 1,
          description: 1,
          public: 1,
          timeLimit: 1,
          user: {
            $reduce: {
              input: "$users",
              initialValue: { joined: 0, waitlisted: 0 },
              in: {
                joined: { 
                  $cond: { 
                    if: { $eq: ["$$this.status", "joined"] }, 
                    then: { $add: ["$$value.joined", 1] }, 
                    else: "$$value.joined" 
                  }
                },
                waitlisted: { 
                  $cond: { 
                    if: { $eq: ["$$this.status", "waitlisted"] }, 
                    then: { $add: ["$$value.waitlisted", 1] }, 
                    else: "$$value.waitlisted" 
                  }
                },
              },
            },
          },
        },
      },
    ]);

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

/**
 * @TYPE middleware
 * @REQUIRED_MIDDLEWARE none
 * @DESCRIPTION fetch room details and with joined user
 */
exports.getRoom = async function (req, res, next) {
  try {
    req.body.room = await RoomModel.findOne({
      uuid: req.params.conferenceId,
    })
      .select("uuid name timeLimit")
      .lean();
    if (!req.body.room) throw new Error("Room not found!");
    return next();
  } catch (err) {
    return res.status(400).json({
      status: "fail",
      message: err.message,
    });
  }
};

/**
 * @TYPE middleware
 * @REQUIRED_MIDDLEWARE none
 * @DESCRIPTION restrict user from join room when it is full and redirect user to waiting list
 */
exports.isRoomFull = async function (req, res, next) {
  //GET COUNT FROM SOCKET BECAUSE IT UPDATED BEFORE DB
  const totalUsers = await ioServices.getRoomUserCounts(
    req.params.conferenceId
  );
  //IF ROOM IS FULL
  if (totalUsers >= MAX_ROOM_LIMIT) {
    return res
      .status(200)
      .redirect(`/conferences/${req.params.conferenceId}/waitlist`);
  }
  /*
  const waitingUsers = await waitlistServices.totalWaitLists(
    req.params.conferenceId
  );
  if (waitingUsers) {
    return res
      .status(200)
      .redirect(`/conferences/${req.params.conferenceId}/waitlist`);
  }*/

  return next();
};

/**
 * @TYPE middleware
 * @REQUIRED_MIDDLEWARE none
 * @DESCRIPTION restrict user from join waiting list if room is empty
 */
exports.isRoomEmpty = async function (req, res, next) {
  const totalUsers = await userServices.getTotalUser(req.params.conferenceId);
  if (totalUsers < MAX_ROOM_LIMIT) {
    return res.status(200).redirect(`/conferences/${req.params.conferenceId}`);
  }
  return next();
};
