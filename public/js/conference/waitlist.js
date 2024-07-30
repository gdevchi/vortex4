const userContainer = document.querySelector(".users");
const countContainer = document.querySelector(".count");
const yourContainer = document.querySelector(".current-users");

const waitListState = {
  users: [],
  current: null,
};

function isCurrentUser(user) {
  return user.userId === waitListState?.current?.userId;
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
  yourContainer.innerHTML = userTemplate(waitListState.current, currentIndex);
  countContainer.innerHTML = `Waiting (${users.length})`;
}

//MANAGE USERS
function renderWaitListUsers({ users, currentUser }) {
  document.querySelector(".waitlist-room").style.display = "block";
  waitListState.users = users;
  waitListState.current = currentUser;
  renderUsers(waitListState.users);
}

function updateUser(user) {
  waitListState.users.push(user);
  renderUsers(waitListState.users);
}

function removeUser(userId) {
  waitListState.users = waitListState.users.filter(
    (user) => user.userId !== userId
  );
  renderUsers(waitListState.users);
}
