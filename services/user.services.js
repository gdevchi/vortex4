//Container Methods Directly Linked with databases
const UserModel = require("../models/User.Model");

exports.getTotalUser = async (roomId) => {
  return await UserModel.countDocuments({ roomId }).lean();
};

exports.insertUser = async (user) => {
  await UserModel.create(user);
};

exports.getUsers = async (roomId) => {
  return [
    ...(await UserModel.find({ roomId })
      .select("userId username speechDisabled position active")
      .lean()),
  ];
};

exports.getUserIndex = async (roomId, userId) => {
  const users = await this.getUsers(roomId);
  return {
    users,
    userIndex: users.findIndex((user) => user.userId === userId),
  };
};

exports.getUser = async (roomId, userId) => {
  const { users, userIndex } = await this.getUserIndex(roomId, userId);
  return {
    index: userIndex,
    ...(users[userIndex] || {}),
  };
};

exports.disableSpeech = async (roomId, userId) => {
  const user = await this.getUser(roomId, userId);
  await UserModel.updateOne({ userId }, { active: false });
  return user.index;
};

exports.update = async (userId, data) => {
  await UserModel.updateOne({ userId }, data);
};

/*
exports.updatePosition = async (userId, position) => {
  await UserModel.updateOne({ userId }, { position });
};*/

/**
  @users list of rooms users
  @userIndex index of next user to be active

  @note old method
 */
exports.assignSpeech = async (users, userIndex) => {
  var user = users[userIndex];
  if (!user) {
    userIndex = 0;
    user = users[userIndex];
  }

  if (user)
    await UserModel.updateOne({ userId: user.userId }, { active: true });

  return {
    ...(user || {}),
    active: user ? true : false,
    index: userIndex,
  };
};

exports.activateUserSpeech = async (userId) => {
  if (!userId) return;
  await UserModel.updateOne({ userId }, { active: true });
};

exports.getActiveUser = (roomId) => {
  return UserModel.findOne({ roomId, active: true })
    .select("_id userId")
    .lean();
};

exports.removeUser = async (roomId, userId) => {
  const user = await this.getUser(roomId, userId);
  await UserModel.deleteOne({ userId });
  return user;
};
