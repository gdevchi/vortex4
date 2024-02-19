const userContainer = document.querySelector(".users");
const countContainer = document.querySelector(".count");
const yourContainer = document.querySelector(".current-users");
//Make connection with socket server
const socket = io.connect("/", {
  query: `roomId=${roomId}&room=waitlist`,
});

const state = {
  users: [],
  current: null,
};

function isCurrentUser(user) {
  return user.userId === state.current?.userId;
}

function userTemplate(user, index) {
  return `<div id="user_${user.userId}" class="user ${
    isCurrentUser(user) ? "you" : ""
  }">
      <span><b>${index + 1}</b></span>
      <div>
        <span>${user.username}</span>
        <span>${user.userId}</span>
      </div>
    </div>`;
}

function renderUsers(users) {
  //RENDER USERS
  userContainer.innerHTML = users.map(userTemplate).join("");
  //RENDER CURRENT USER
  const currentIndex = users.findIndex(isCurrentUser);
  yourContainer.innerHTML = userTemplate(state.current, currentIndex);
  countContainer.innerHTML = `Waiting (${users.length})`;
}

//MANAGE USERS
function insertUser(user) {
  state.users.push(user);
  renderUsers(state.users);
}

function removeUser(userId) {
  state.users = state.users.filter((user) => user.userId !== userId);
  renderUsers(state.users);
}

socket.emit("join", username);

socket.on("users", ({ users, currentUser }) => {
  state.users = users;
  state.current = currentUser;
  renderUsers(state.users);
});

socket.on("user:joined", insertUser);
socket.on("user:disconnect", removeUser);
socket.on(
  "user:rejoin",
  () => (window.location.href = `/conferences/${roomId}`)
);
