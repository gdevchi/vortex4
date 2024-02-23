const WaitingListModel = require("../models/User.Model");

exports.inserUser = async (user) => {
  return await WaitingListModel.create(user);
};

exports.fetchUsers = async (roomId) => {
  return await WaitingListModel.find({ roomId, status: "waitlisted" }).lean();
};

exports.totalWaitLists = async (roomId) => {
  return await WaitingListModel.countDocuments({
    roomId,
    status: "waitlisted",
  });
};

exports.removeUser = async (userId) => {
  return await WaitingListModel.deleteOne({ userId });
};

exports.moveToConference = async ({ roomId, activate }) => {
  const waitListUser = await WaitingListModel.findOne({
    roomId,
    status: "waitlisted",
  });
  if (waitListUser) {
    waitListUser.status = "joined";
    waitListUser.active = activate;
    await waitListUser.save();
  }
  return waitListUser;
};
