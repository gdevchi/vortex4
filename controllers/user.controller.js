const userService = require("../services/user.services");

/**
 * @note old method
 */
exports.assignSpeechToNextUser = async ({ io, roomId, userIndex }) => {
  const sockets = await io.in(roomId).fetchSockets();
  const users = sockets.map((socket) => {
    return { userId: socket.id };
  });
  return await userService.assignSpeech(users, userIndex);
};

exports.assignSpeechToEligibleUser = async ({ roomId, userIndex }) => {
  var activeUser = null;
  const users = await userService.getUsers({
    roomId,
    status: "joined",
  });
  const allUserDisabled = users.find((user) => !user.speechDisabled)
    ? false
    : true;
  //Find eligible user only if any user speech is enabled
  if (!allUserDisabled) {
    //this blocks assume atleast one user has enabled speech

    const loopLimit = users.length; //loop limit to prevent infinite loop
    var looped = 0; //number of times loop runs;

    while (!activeUser) {
      activeUser = users[userIndex];
      //If no user found. Reset index
      if (!activeUser) {
        userIndex = 0;
        activeUser = users[userIndex];
      }
      //If user found but speech is disabled. Increment index and set activeUser to null
      if (activeUser && activeUser.speechDisabled) {
        userIndex += 1;
        activeUser = null;
      }
      //Stop loop from running infinite time.
      looped += 1;
      if (loopLimit < looped) break;
    }
  }

  await userService.activateUserSpeech(activeUser?.userId);
  //Return user details with userIndex and update active status
  return {
    ...(activeUser || {}),
    active: activeUser ? true : false,
    index: userIndex,
  };
};
