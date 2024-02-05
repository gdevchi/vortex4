//SERVICES
const userService = require("./services/user.services");
//CONTROLLERS
const { getUserAccount } = require("./controllers/auth.controller");
const userController = require("./controllers/user.controller");

const activeUserCache = {};

exports.initiateSocket = (io) => {
  //Socket: listen for new connection
  io.on("connection", (socket) => {
    const userAccount = getUserAccount(socket.handshake.headers.cookie);
    const roomId = socket.handshake.query.roomId;

    socket.on("user-joined", async ({ username }) => {
      try {
        const payload = {
          user: {
            username,
            userId: socket.id,
            roomId,
            speechDisabled: false,
            account: userAccount,
          },
        };

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
        const sockets = await io.in(roomId).fetchSockets();
        payload.user.index = sockets.length;
        //5. Add user in conference room
        socket.join(roomId);
        //6. Emit user payload to all users in room
        socket.emit("you", payload);
        socket.to(roomId).emit("user-joined", payload);
      } catch (err) {
        socket.emit(
          "error",
          `Error occurred while joining room: ${err.message}`
        );
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

    //Update Start Time
    socket.on("speech-started", async (user) => {
      await userService.updateUserStartTime(user.userId, user.assignedAt);
      io.to(roomId).emit("speech-started", user);
    });

    socket.on("speech-completed", async () => {
      try {
        const prevUserIndex = await userService.disableSpeech(
          roomId,
          socket.id
        );
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
      } catch (err) {
        console.log("Disconnect Error");
        console.log(err.message);
      }
    });
  });
};
