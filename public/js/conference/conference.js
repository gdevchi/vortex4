//CONFERENCE LAYOUT CONTAINER
const conferenceEl = document.querySelector(".user-circles");
const audioContainer = document.querySelector(".audio-container");
const speakerTimerEl = document.querySelector(".center-circle");
const timer = speakerTimerEl.querySelector("#timer");
const speakerNameEl = speakerTimerEl.querySelector("#active-user");
//ACTION LAYOUT CONTAINER
const actionEl = document.querySelector(".action-layout");
const micButton = actionEl.querySelector("#mic-button");
const passButton = actionEl.querySelector("#pass-button");
const skipButton = actionEl.querySelector("#skip-button");
const statusMessage = document.querySelector(".status-message");
//MESSAGE LAYOUT CONTAINER
const chatContainers = document.querySelectorAll(".chat-layout");

//Make connection with socket server
const socket = io.connect("/", {
  query: `roomId=${roomId}`,
});

const state = {
  users: [],
  user: null,
  activeUser: null,
  interval: null,
  timer: null,
  audioTrack: null,
  audioStream: null,
  micStatus: {},
  isMuted: true,
  peers: {}, //store connected users
  rtcConfig: {
    //simple third party server to retrieve network details
    iceServers: [
      {
        urls: "turn:143.110.152.166:5500",
        username: "abdullah",
        credential: "qwerty123",
      },
    ],
  },
  origin: {
    x: 0,
    y: 0,
  },
  isDragging: false,
  disconnected: false,
};

function showMessage({ status, message }) {
  statusMessage.className = `status-message ${status}`;
  statusMessage.children[0].textContent = message;
}

function updateSwitchLabel(label) {
  if (!actionEl.children[2]) return;
  if (!actionEl.children[2].children[0]) return;
  actionEl.children[2].children[0].textContent = label;
}

function hideSwitch(hide) {
  skipButton.classList[hide ? "add" : "remove"]("hide-button");
}

function insertUser(user) {
  state.users[user.index] = user;
}

function updatePosition({ userId, position }) {
  const { x, y } = getPixelPosition(position);
  const circle = conferenceEl.querySelector(`#ID_${userId}`);
  if (!circle) return;
  circle.style.transform = `translate(${x}px,${y}px)`;
  //update user position in state
  try {
    const userIndex = state.users.findIndex((user) => user.userId === userId);
    if (userIndex < 0) return;
    state.users[userIndex]["position"] = position;
  } catch (err) {
    console.log(`Error in update position state of ${userId}`);
    console.log(err.message);
  }
}

function renderCircle() {
  [...conferenceEl.children].forEach((circle, elIndex) => {
    //SKIP WHEN ENCOUNTER CENTER CIRCLE IN BETWEEN USER CIRCLE
    if (circle.classList.contains("center-circle")) return;
    //BALANCE INDEX ON CENTER CIRCLE (numbers of children in container in 13 and number of users will be 12);
    const index = elIndex <= 6 ? elIndex : elIndex - 1;

    const user = state.users[index];
    if (!user) {
      circle.id = "";
      circle.style.transform = `translate(0px,0px)`;
      circle.style.opacity = "0.5";
      circle.innerHTML = "";
      circle.classList.add(`circle-${index + 1}`);
      return;
    }

    circle.id = `ID_${user.userId}`;
    circle.style.opacity = "1";
    circle.innerHTML = `<label>${user.username} ${index + 1}</label>`;

    //attach movement handler
    const isMoved =
      user?.position?.x !== undefined && user?.position?.y !== undefined;
    const moved = !(
      user?.position?.x === undefined && user?.position?.y === undefined
    );
    const isCurrentUser = user.userId === state.user.userId;
    if (isCurrentUser) {
      circle.style.zIndex = "10";
      //change circle position if it is not moved
      if (moved) {
        circle.className = state.userCircle?.el?.className;
        initializeOrigin(circle);
        state.userCircle = {
          el: circle,
          index: index,
        };
        initializeMovementEvents();
      } else {
        circle.classList.add(`circle-${index + 1}`);
        circle.style.transform = `translate(0px,0px)`;
        initializeOrigin(circle, { forceUpdate: true });
        state.userCircle = {
          el: circle,
          index: index,
        };
        initializeMovementEvents();
      }
    } else {
      circle.classList.add(`circle-${index + 1}`);
    }

    //update user position
    if (isMoved) {
      const { x, y } = getPixelPosition(user.position);
      circle.style.transform = `translate(${x}px,${y}px)`;
    }
    //reset the circle position moved by previous user if current user not moved
    if (!isCurrentUser && !isMoved) {
      circle.style.transform = `translate(0px,0px)`;
    }

    //toggle active user
    if (user.userId === state.activeUser?.userId) {
      toggleActiveUser(user.userId, true);
    } else {
      toggleActiveUser(user.userId);
    }
  });
}

function calculateRemainingTime(startedAt) {
  const delayed = 1000; //atleast 1sec delay before starting speech
  const startedAtSeconds = Math.ceil(
    (new Date().getTime() - delayed - new Date(startedAt).getTime()) / 1000
  );
  return 30 - startedAtSeconds;
}

function startSpeakerTimer(user) {
  var seconds = calculateRemainingTime(user.startedAt); //calculate remaining seconds
  timer.textContent = seconds;
  speakerNameEl.textContent = user.username;
  state.timer = setInterval(() => (timer.textContent = --seconds), 1000);
}

function resetSpeakerTimer(timerId) {
  clearInterval(timerId);
  timer.textContent = 0;
  speakerNameEl.textContent = "-";
}

function toggleActiveUser(userId, toggle) {
  const user = conferenceEl.querySelector(`#ID_${userId}`);
  if (!user) return;
  user.classList[toggle ? "add" : "remove"]("active-circle");
}

function chanegMicStatus(message, active) {
  const micEl = document.querySelector(".mic-status");
  const micClass = active ? "fa-microphone" : "fa-microphone-slash";
  //show message related to micrphone access
  micEl.children[0].textContent = message;
  //change microphone access
  micEl.children[1].innerHTML = `<i class="fas ${micClass}"></i>`;
}

function toggleMic(muteStatus) {
  try {
    if (!muteStatus) {
      muteStatus = {
        mute: state.audioTrack.enabled,
        manually: true,
        auto: false,
      };
    }
    state.audioTrack.enabled = !muteStatus.mute;
    const micClass = muteStatus.mute ? "fa-microphone-slash" : "fa-microphone";
    micButton.innerHTML = `<i class="fas ${micClass}"></i>`;
    state.micStatus = muteStatus;
  } catch (err) {
    console.log("Error while disabling mic!");
    console.log(err);
  }
}

/*
function toggleMic(active) {
  try {
    if (active === undefined) active = !state.audioTrack.enabled;
    state.audioTrack.enabled = active;
    //if current user speech is active
    const micClass = active ? "fa-microphone" : "fa-microphone-slash";
    micButton.innerHTML = `<i class="fas ${micClass}"></i>`;
  } catch (err) {
    console.log("Error while disabling mic!");
    console.log(err);
  }
}*/

function setRemoteAudioTrack(event, userId) {
  const [remoteStream] = event.streams;
  const div = document.createElement("div");
  div.id = `DA_${userId}`;
  const audio = document.createElement("audio");
  audio.id = `A_${userId}`;
  audio.srcObject = remoteStream;
  audio.play();
  div.appendChild(audio);
  audioContainer.appendChild(div);
}

function removeRemoteAudioTrack(userId) {
  const child = document.querySelector(`#DA_${userId}`);
  if (!child) return;
  audioContainer.removeChild(child);
}

function removeTrackFromConnection(userId) {
  const connection = state.peers[userId].peerConnection;
  if (!connection) return;
  const sender = connection.getSenders().find(function (s) {
    return s.track === state.audioTrack;
  });
  if (sender) {
    try {
      connection.removeTrack(sender);
      connection.removeStream(state.audioStream);
    } catch (err) {
      console.log(err);
    }
  }
  connection.close();
  delete state.peers[userId];
}

function insertMessage(container, message) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("msg-wrapper");
  if (state?.user?.username === message.username)
    wrapper.classList.add("owner"); //add owner class to align message right side

  const sender = document.createElement("span");
  sender.classList.add("sender");
  sender.innerText = message.username;
  wrapper.appendChild(sender);

  const msg = document.createElement("span");
  msg.classList.add("message");
  msg.innerText = message.text;
  wrapper.appendChild(msg);

  container.appendChild(wrapper);
  //scroll top to see latest message
  container.scrollTop = container.scrollHeight;
}

//Get Microphone Access
function getAudioStreamAccess() {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      chanegMicStatus("Mic access granted", true);
      //Get Audio Tracks and Stream
      state.audioTrack = stream.getAudioTracks()[0];
      state.audioStream = new MediaStream([state.audioTrack]);
      //By default disable mic of user
      toggleMic({ mute: true, manually: false, auto: true });
      //Attach the listener to the audio track [automatically update status of on external device event]
      state.audioTrack.addEventListener("mute", () =>
        toggleMic({ mute: true, manually: true, auto: false })
      );
      state.audioTrack.addEventListener("unmute", () =>
        toggleMic({ mute: false, manually: true, auto: false })
      );
      state.audioTrack.addEventListener("ended", () =>
        toggleMic({ mute: true, manually: false, auto: true })
      );
      socket.emit("user-joined", { username, speechDisabled: false });
    })
    .catch((err) => chanegMicStatus(err.message));
}

function toggleActionButtons() {
  micButton.classList.toggle("hide-button");
  passButton.classList.toggle("hide-button");
}

function setAssignUser(user) {
  assignSpeech(user);
  if (user?.userId) {
    startSpeakerTimer(user);
  }
}

function disableSpeech(user, timerId) {
  try {
    //Get final status mic mute when disabling speech, to restore it in next chance
    state.isMuted = state.micStatus.mute && state.micStatus.manually;
    //Disable mic after speech timeout & store current status of mic mute action to control mic mute action on next chance
    toggleMic({
      mute: true,
      manually: state.micStatus.manually,
      auto: state.micStatus.auto,
    });
    //update circle color
    toggleActiveUser(user?.userId);
    //stop timer
    resetSpeakerTimer(timerId);
    //stop main timer
    clearInterval(state.interval);
    //hide action button
    toggleActionButtons();
    //emit complete event to assign next user
    socket.emit("speech-completed");
  } catch (err) {
    console.log("Error Occured while disabling speech!");
    console.log(err);
    console.log("Clearing Intervals");
    //stop timer
    resetSpeakerTimer(timerId);
    //stop main timer
    clearInterval(state.interval);
    //emit complete event to assign next user
    socket.emit("speech-completed");
    //hide action button
    toggleActionButtons();
  }
}

function assignSpeech(user) {
  try {
    //While assigning speech to new user, reset current active user circle and audio
    if (state.activeUser) toggleActiveUser(state.activeUser?.userId);
    //Reset previous timers
    if (state.timer) resetSpeakerTimer(state.timer);
    if (!user?.userId) {
      state.activeUser = null;
      return;
    }
    //update active user state with new user
    state.activeUser = user;
    //if current user get a chance to speak
    if (user.userId === state?.user?.userId) {
      //Automatically enable mic if mic disabled automatically on previous chance else keep the mic muted
      if (!state.isMuted)
        toggleMic({ mute: false, manually: false, auto: true });
      if (state.interval) clearInterval(state.interval);
      //Close speech after 30 seconds
      state.interval = setInterval(() => {
        disableSpeech(state.activeUser, state.timer);
      }, 30000);
      toggleActionButtons();
    }
    toggleActiveUser(user?.userId, true);
  } catch (err) {
    console.log("Error occured while enabling speech");
    console.log(err);
  }
}

function passToNextUser() {
  disableSpeech(state.activeUser, state.timer);
}

function toggleSwitch(event) {
  socket.emit("speech-disabled", event.target.checked);
  updateSwitchLabel("Please wait...");
}

socket.on("your-speech-disabled", (status) => {
  chanegMicStatus(
    !status ? "Mic Access Granted!" : "Microphone feature disabled",
    !status
  );
  updateSwitchLabel("Listen only");
  if (state?.user?.userId === state?.activeUser?.userId && status) {
    disableSpeech(state.activeUser, state.timer);
  }
});

socket.on("you", ({ user, isActiveUser }) => {
  chanegMicStatus(
    !user.speechDisabled
      ? "Mic Access Granted!"
      : "Microphone feature disabled",
    !user.speechDisabled
  );
  state.user = user; //store your details
  //new
  insertUser(user);
  //assign listeners
  renderCircle();
  if (isActiveUser) setAssignUser(user);
});

//start a webrtc call with new user
socket.on("user-joined", async ({ user, isActiveUser }) => {
  if (!user) return;
  //create new connection
  const peerConnection = new RTCPeerConnection(state.rtcConfig);
  //store peer connection
  state.peers[user.userId] = { peerConnection };
  //add local track in remote user connection
  if (state.audioTrack && state.audioStream) {
    peerConnection.addTrack(state.audioTrack, state.audioStream);
  }
  //create offer for new user
  //offer: contains system config like: type of media format being send, ip address and port of caller
  const offer = await peerConnection.createOffer();
  //set offer description in local connection
  peerConnection.setLocalDescription(offer);
  //receive network details from third party server and send details to new user
  peerConnection.addEventListener("icecandidate", function (event) {
    //send network details to new user
    socket.emit("ICE-Candidate", {
      receiver: user.userId,
      candidate: event.candidate,
    });
  });
  //when new user get chance to speak, this listener will trigger and set the remote stream on dom
  peerConnection.addEventListener("track", (event) => {
    if (event.track.kind === "audio") {
      setRemoteAudioTrack(event, user.userId);
      insertUser(user);
      renderCircle();
      if (isActiveUser) setAssignUser(user);
    }
  });

  //send offer (system config) to new user
  socket.emit("call", { userId: user.userId, offer });
});

//receive answer from new user
socket.on("answer", async ({ responder, answer }) => {
  //get responder connection
  const peerConnection = state.peers[responder].peerConnection;
  //set responder answer (system config) in connection
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

//recieve network details (ICE-Candidate) of user
socket.on("ICE-Candidate", async ({ sender, candidate }) => {
  if (!state.peers[sender]) return;
  //find sender peer connection in list of peers
  const peerConnection = state.peers[sender].peerConnection;
  //store network details in connection
  await peerConnection.addIceCandidate(candidate);
});

//receive call (offer) from users and respond to call by sharing their system details
socket.on("call", async ({ caller, isActive, offer }) => {
  //create new webrtc peer connection
  const peerConnection = new RTCPeerConnection(state.rtcConfig);
  //store caller peer connection
  state.peers[caller.userId] = { peerConnection };
  //add local stream to caller connection
  if (state.audioTrack && state.audioStream) {
    peerConnection.addTrack(state.audioTrack, state.audioStream);
  }
  //receive network details from third party server and send it to caller
  peerConnection.addEventListener("icecandidate", function (event) {
    //send network details to caller
    socket.emit("ICE-Candidate", {
      receiver: caller.userId,
      candidate: event.candidate,
    });
  });

  peerConnection.addEventListener("track", (event) => {
    if (event.track.kind === "audio") {
      setRemoteAudioTrack(event, caller.userId);
      insertUser(caller);
      renderCircle();
      if (isActive) setAssignUser(caller);
    }
  });

  //set received offer (caller system config) in connection
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  //create your system config as answer
  const answer = await peerConnection.createAnswer();
  //set answer in connection
  await peerConnection.setLocalDescription(answer);
  //send call response (system config) to caller
  socket.emit("answer", { caller: caller.userId, answer });
});

socket.on("new-speech-assigned", setAssignUser);

socket.on("movement", updatePosition);

socket.on("connect", () => {
  if (state.disconnected) {
    state.disconnected = false;
    showMessage({ status: "info", message: "Rejoining..." });
    setInterval(() => {
      window.location.reload();
    }, 800);
  }
});

socket.on("disconnect", () => {
  state.disconnected = true;
  showMessage({
    status: "error",
    message:
      "Disconnected from server, check your internet or refresh the page!",
  });
});

socket.on("user-disconnect", ({ userId, activeUser }) => {
  //close and delete user connection from list connected users peer
  if (!state.peers[userId]) return;
  //remove audio track and element
  removeTrackFromConnection(userId);
  removeRemoteAudioTrack(userId);
  //remove user from users array and re render circle
  state.users = state.users.filter((user) => user.userId !== userId);
  //change active circle of disconnected user
  toggleActiveUser(userId);
  //reset current user movement event for reassigning in new circle
  resetMovementEvents();
  renderCircle();
  //activate next active user circle and mic
  if (activeUser) setAssignUser(activeUser);
});

socket.on("error", (message) => showMessage({ status: "error", message }));

//handle form submission
[...chatContainers].forEach((chatContainer) => {
  const messageContainer = chatContainer.children[0];
  const form = chatContainer.children[1];

  //ATTACH FORM EVENT
  form.addEventListener("submit", (e) => {
    e.preventDefault(); //prevent page from reloading
    const message = e.target.elements.message.value;
    if (!message) return;
    //send message to other users in room
    const payload = {
      username: state.user.username,
      text: message,
    };
    socket.emit("message", { message: payload });
    //display message in your chat box
    insertMessage(messageContainer, payload);
    //clear form input
    e.target.elements.message.value = "";
    e.target.elements.message.focus();
  });

  //ATTACH SOCKET EMITTER
  socket.on("message", (message) => insertMessage(messageContainer, message));
});

window.addEventListener("DOMContentLoaded", () => {
  getAudioStreamAccess();
});
