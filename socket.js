//SERVICES
const ioService = require("./services/io.services");
const userService = require("./services/user.services");
const waitlistService = require("./services/waitlist.services");
//CONTROLLERS
const { getUserAccount } = require("./controllers/auth.controller");
const userController = require("./controllers/user.controller");
const { MAX_ROOM_LIMIT } = require("./controllers/room.controller");

const activeUserCache = {};

function initiateConferenceSocket(io, socket, roomId, account) {
  socket.on("user-joined", async ({ username }) => {
    const userLength = await ioService.getRoomUserCounts(roomId);
    if (userLength >= MAX_ROOM_LIMIT) socket.emit("rejoin");
    try {
      const payload = {
        user: {
          username,
          userId: socket.id,
          roomId,
          speechDisabled: false,
          account: account,
        },
      };

      //1. Enable user speech, if no user is active
      const isUserEligibleForSpeech =
        !(await userService.getActiveUser(roomId)) && !activeUserCache[roomId];

      if (isUserEligibleForSpeech) {
        activeUserCache[roomId] = socket.id;
        payload.user.active = true;
        payload.isActiveUser = true;
      }
      //2. Insert user in queue
      await userService.insertUser(payload.user);
      //3. Delete active user cache
      delete activeUserCache[roomId];
      //4. Get total users in room
      payload.user.index = userLength;
      //5. Add user in conference room
      socket.join(roomId);
      //6. Emit user payload to all users in room
      socket.emit("you", payload);
      socket.to(roomId).emit("user-joined", payload);
    } catch (err) {
      socket.emit("error", `Error occurred while joining room: ${err.message}`);
    }
  });

  //1. RECEIVE CALL FROM ROOM MEMBERS
  socket.on("call", async ({ userId, offer }) => {
    try {
      const caller = await userService.getUser(roomId, socket.id);
      socket.to(userId).emit("call", {
        caller, //caller details
        isActive: caller.active, //caller speech status
        offer, //caller offer
      });
    } catch (err) {
      socket.emit(
        "error",
        `Error occured while calling new joined user: ${err.message}`
      );
    }
  });

  //2. RECEIVER NEW USER CALL RESPONSE
  socket.on("answer", ({ caller, answer }) => {
    socket.to(caller).emit("answer", {
      responder: socket.id,
      answer,
    });
  });

  //3. EXCHANGE NETWORK DETAILS
  socket.on("ICE-Candidate", ({ receiver, candidate }) => {
    socket.to(receiver).emit("ICE-Candidate", {
      sender: socket.id,
      candidate, //network details of sender
    });
  });

  //UPDATE START TIME
  socket.on("speech-started", async (user) => {
    await userService.updateUserStartTime(user.userId, user.assignedAt);
    io.to(roomId).emit("speech-started", user);
  });

  socket.on("speech-completed", async () => {
    try {
      const prevUserIndex = await userService.disableSpeech(roomId, socket.id);
      const newActiveUser = await userController.assignSpeechToEligibleUser({
        roomId,
        userIndex: prevUserIndex + 1,
      });
      io.to(roomId).emit("new-speech-assigned", newActiveUser);
    } catch (err) {
      socket.emit(
        "error",
        `Error occured while calling new joined user: ${err.message}`
      );
    }
  });

  socket.on("speech-disabled", async (speechDisabled) => {
    try {
      await userService.update(socket.id, { speechDisabled });
      socket.emit("your-speech-disabled", speechDisabled);
    } catch (err) {
      socket.emit("error", err.message);
    }
  });

  socket.on("movement", async (position) => {
    try {
      userService.update(socket.id, { position });
    } catch (err) {
      console.log(`Failed to update ${socket.id} position`);
    }
    socket.to(roomId).emit("movement", { userId: socket.id, position });
  });

  socket.on("message", (payload) =>
    socket.to(roomId).emit("message", payload.message)
  );

  socket.on("disconnect", async () => {
    try {
      //Get Current Active User
      let activeUser = null;
      const user = await userService.removeUser(roomId, socket.id);
      //Assign speech to next user, if disconnected user was speaking
      if (user.active) {
        activeUser = await userController.assignSpeechToEligibleUser({
          roomId,
          userIndex: user.index,
        });
      }
      //Inform other user about disconnection and speech assign
      socket.to(roomId).emit("user-disconnect", {
        userId: user.userId,
        activeUser,
      });
      //REJOIN WAITING USER
      const waitingUser = (
        await ioService.getRoomUsers(`waitlist:${roomId}`)
      )[0];
      //DELAY ROOM ENTRY
      if (waitingUser) socket.to(waitingUser.id).emit("user:rejoin", null);
    } catch (err) {
      console.log("Disconnect Error");
      console.log(err.message);
    }
  });
}

function initiateWaitListSocket(socket, roomId) {
  const waitListRoomId = `waitlist:${roomId}`;
  socket.on("join", async (username) => {
    try {
      const user = await waitlistService.insertUser({
        username,
        userId: socket.id,
        roomId,
        createdAt: Date.now(),
      });
      socket.join(waitListRoomId);
      socket.to(waitListRoomId).emit("user:joined", user);
      //LOAD WAITLIST USERS
      const users = await waitlistService.fetchUsers(roomId);
      socket.emit("users", { users, currentUser: user });
    } catch (err) {
      socket.emit("error", { action: "user:joined", message: err.message });
    }
  });

  socket.on("disconnect", async () => {
    try {
      await waitlistService.removeUser(socket.id);
      socket.to(waitListRoomId).emit("user:disconnect", socket.id);
    } catch (err) {
      socket.emit("error", { action: "user:disconnect", message: err.message });
    }
  });
}

exports.initiateSocket = (io) => {
  io.on("connection", (socket) => {
    const userAccount = getUserAccount(socket.handshake.headers.cookie);
    const { roomId, room } = socket.handshake.query;
    switch (room) {
      case "waitlist":
        initiateWaitListSocket(socket, roomId, userAccount);
        break;
      default:
        initiateConferenceSocket(io, socket, roomId, userAccount);
        break;
    }
  });
};
