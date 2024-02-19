const WaitingListModel = require("../models/WaitList.Model");

exports.insertUser = async (user) => {
  return await WaitingListModel.create(user);
};

exports.fetchUsers = async (roomId) => {
  return await WaitingListModel.find({ roomId }).lean();
};

exports.totalWaitLists = async (roomId) => {
  return await WaitingListModel.countDocuments({ roomId });
};

exports.removeUser = async (userId) => {
  return await WaitingListModel.deleteOne({ userId });
};
