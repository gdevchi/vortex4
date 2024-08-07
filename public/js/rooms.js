const modal = document.querySelector(".backdrop");
const updateModal = document.querySelector(".update-form");
const roomsContainer = document.querySelector(".rooms");
const roomForm = document.querySelector(".room-form");
const updateRoomForm = updateModal.querySelector("form");

const state = {
  rooms: [],
  roomId: "",
};

function toggleModal() {
  modal.classList.toggle("hide");
}

const fillFormInput = (form, name, value) => {
  const input = form.querySelector(`input[name=${name}]`);
  if (!input) return;
  input.value = value;
};

const fillTextAreaInput = (form, name,value) => {
  const input = form.querySelector(`textarea[name=${name}]`);
  if (!input) return;
  input.value = value;
}

const fillSelectInput = (form, value) => {
  const select = form.querySelector(`select`);
  if (!select) return;
  select.value = value;
};

function updateToggleModal(_, roomId) {
  updateModal.classList.toggle("hide");
  state.roomId = roomId;
  if (roomId) {
    const room = state.rooms.find((room) => room._id === roomId);
    if (!room) return;
    //fill form
    fillFormInput(updateRoomForm, "name", room.name);
    fillFormInput(updateRoomForm, "timeLimit", room.timeLimit || 0);
    fillTextAreaInput(updateRoomForm, "description", room.description || "");
    fillSelectInput(updateRoomForm, room.public ? "public" : "private");
  }
}

function getRoom(roomId) {
  const roomEl = document.querySelector(`#room_${roomId}`);
  if (!roomEl) return;
  if (roomEl.classList.contains("loading")) return;
  return roomEl;
}

function renderRoomList() {
  roomsContainer.innerHTML = state.rooms
  .map(renderRoomTemplate)
  .join("");
}

async function fetchRooms() {
  fetch("/api/v1/rooms", {
    method: "GET",
  })
    .then((res) => res.json())
    .then((res) => {
      state.rooms = res.data.rooms;
      renderRoomList();
    })
    .catch((err) => alert(err.message));
}

async function createRoom(data) {
  const rawRes = await fetch(`/api/v1/rooms`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "content-type": "application/json",
    },
  });
  const res = await rawRes.json();
  if (res.status !== "success") throw res;
  state.rooms.push(res.data.room);
  renderRoomList();
}

async function updateRoom(roomId, data) {
  const rawRes = await fetch(`/api/v1/rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: {
      "content-type": "application/json",
    },
  });
  const res = await rawRes.json();
  if (res.status !== "success") throw res;
  window.location.reload();
}

async function updateRoomVisibility(event, roomId) {
  const roomEl = getRoom(roomId);
  if (!roomEl) return;

  roomEl.classList.add("loading");

  const data = { public: !roomEl.classList.contains("public") };
  fetch(`/api/v1/rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: {
      "content-type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.status !== "success") throw res;
      roomEl.classList.remove(data.public ? "private" : "public");
      roomEl.classList.add(data.public ? "public" : "private");
      event.target.classList.remove(data.public ? "fa-eye-slash" : "fa-eye");
      event.target.classList.add(data.public ? "fa-eye" : "fa-eye-slash");
    })
    .catch((err) => {
      console.log(err);
      alert(err.message);
    })
    .finally(() => roomEl.classList.remove("loading"));
}

async function deleteRoom(roomId) {
  const roomEl = getRoom(roomId);
  if (!roomEl) return;

  roomEl.classList.add("loading");

  fetch(`/api/v1/rooms/${roomId}`, {
    method: "DELETE",
  })
    .then((res) => res.json())
    .then((res) => {
      if (res.status !== "success") throw res;
      roomsContainer.removeChild(roomEl);
    })
    .catch((err) => {
      alert(err.message);
    });
}

function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      alert("Copied to clipboard");
    })
    .catch((err) => {
      alert("Error copying to clipboard", err.message);
    });
}

function goto(uuid) {
  window.location.href = `/conferences/${uuid}`;
}

function renderRoomTemplate(room) {
  return `<tr class="conf-row" id="room_${room._id}">
 <td class="conf-info" onclick='goto("${room.uuid}")'>
  <div>
    <h3>${room.name}</h3>
    <p>${room.description || "-no description-"}</p>
  </div>
 </td>
 <td>${room.user?.joined || 0}/12</td>
 <td>${room.user?.waitlisted || 0}</td>
 <td class="conf-action"><span class="fa fa-copy" onclick="copyToClipboard('${window.location.origin}/conferences/${room.uuid}')"></span>
 <span class="fa fa-edit" onclick="updateToggleModal(event, '${room._id}')"></span>
 <span class="fa fa-trash" onclick="deleteRoom('${room._id}')"></span></td>
</tr>
<br/>
`;
}

function convertStringToHTML(template) {
  const parser = new DOMParser();
  const parsedHTML = parser.parseFromString(template, "text/html");
  return parsedHTML.body.children[0];
}

roomForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = {
      name: event.target.elements.name.value,
      timeLimit: event.target.elements.timeLimit.value,
      description:event.target.elements.description.value,
      public: event.target.elements.public.value === "public" ? true : false,
    };
    if (!data.name) throw { message: "Please provide room name!" };
    await createRoom(data);
    alert("Room Created!");
    event.target.elements.name.value = "";
    event.target.elements.timeLimit.value = "";
  } catch (err) {
    console.log(err);
    alert(err.message);
  }
});

updateRoomForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = {
      name: event.target.elements.name.value,
      timeLimit: event.target.elements.timeLimit.value,
      description:event.target.elements.description.value,
      public: event.target.elements.public.value === "public" ? true : false,
    };
    if (!data.name) throw { message: "Please provide room name!" };
    await updateRoom(state.roomId, data);
    alert("Room updated");
    event.target.elements.name.value = "";
    event.target.elements.timeLimit.value = "";
  } catch (err) {
    console.log(err);
    alert(err.message);
  }
});

document.addEventListener("DOMContentLoaded", async function () {
  await fetchRooms();
});
