//SERVICES
const ioService = require("./services/io.services");
const userService = require("./services/user.services");
const waitlistService = require("./services/waitlist.services");
//CONTROLLERS
const { getUserAccount } = require("./controllers/auth.controller");
const userController = require("./controllers/user.controller");
const { MAX_ROOM_LIMIT } = require("./controllers/room.controller");

const activeUserCache = {};
const activeRejoining = {};

function initiateConferenceSocket(io, socket, roomId, account) {
  const waitListRoomId = `waitlist:${roomId}`;
  socket.on("user-joined", async ({ username }) => {
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
      const userLength = await ioService.getRoomUserCounts(roomId);

      //IF ROOM IS FULL WAILIST USER
      console.log(userLength,MAX_ROOM_LIMIT,userLength >= MAX_ROOM_LIMIT, activeRejoining[roomId]);
      if (userLength >= MAX_ROOM_LIMIT || activeRejoining[roomId]) {
        payload.user.status = "waitlisted";
        //1. Store User
        await waitlistService.inserUser(payload.user);
        //2. Add user in conference room
        socket.join(waitListRoomId);
        //3. Load Waitlisted Users
        const users = await waitlistService.fetchUsers(roomId);
        //4. Inform other waitlisted user about new user
        socket.emit("waitlist:users", { users, currentUser: payload.user });
        socket.to(waitListRoomId).emit("waitlist:user:joined", payload.user);
      } else {
        //1. Enable user speech, if no user is active
        const isUserEligibleForSpeech =
          !(await userService.getActiveUser(roomId)) &&
          !activeUserCache[roomId];

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
        socket.emit("conference:joined", payload);
        socket.to(roomId).emit("user-joined", payload);
      }
    } catch (err) {
      socket.emit("error", {
        action: "join",
        message: `Error occurred while joining room: ${err.message}`,
      });
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
      activeRejoining[roomId] = true;
      //Get Current Active User
      let activeUser = null;
      const user = await userService.removeUser(roomId, socket.id);
      if (!user.userId) {
        delete activeRejoining[roomId];
        socket.to(waitListRoomId).emit("waitlist:user:disconnect", socket.id);
      } else {
        //Assign speech to next user, if disconnected user was speaking
        if (user.active) {
          activeUser = await userController.assignSpeechToEligibleUser({
            roomId,
            userIndex: user.index,
          });
        }
        //Join waitlist user to conference room
        const isWaitListWillActive = user.active && !activeUser.active;
        const waitListUser = await waitlistService.moveToConference({
          roomId,
          activate: isWaitListWillActive,
        });
        if (waitListUser) {
          //REMOVE USER FROM WAITLIST ROOM
          socket
            .to(waitListRoomId)
            .emit("waitlist:user:disconnect", waitListUser.userId);
          //REJOIN USER IN CONFERENCE ROOM
          const payload = {
            user: {
              username: waitListUser.username,
              userId: waitListUser.userId,
              roomId,
              speechDisabled: false,
              index: user.index,
              active: waitListUser.active,
              account: waitListUser.account,
            },
            isActiveUser: isWaitListWillActive,
          };
          if (payload.isActiveUser) activeUser = payload.user;
          io.to(waitListUser.userId).emit("waitlist:rejoin", payload);
        } else {
          delete activeRejoining[roomId];
        }
        //Inform other user about disconnection and speech assign
        socket.to(roomId).emit("user-disconnect", {
          userId: user.userId,
          activeUser,
        });
      }
    } catch (err) {
      console.log("Disconnect Error");
      console.log(err.message);
    }
  });

  socket.on("conference:join", (payload) => {
    socket.leave(waitListRoomId);
    socket.join(roomId);
    delete activeRejoining[roomId];
    socket.emit("conference:joined", payload);
    socket.to(roomId).emit("user-joined", payload);
  });
}

exports.initiateSocket = (io) => {
  io.on("connection", (socket) => {
    const userAccount = getUserAccount(socket.handshake.headers.cookie);
    const { roomId } = socket.handshake.query;
    initiateConferenceSocket(io, socket, roomId, userAccount);
  });
};
