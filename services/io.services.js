const { io } = require("../config/setup");

exports.getRoomUsers = async (roomId) => {
  return await io.in(roomId).fetchSockets();
};

exports.getRoomUserCounts = async (roomId) => {
  return (await this.getRoomUsers(roomId)).length;
};
