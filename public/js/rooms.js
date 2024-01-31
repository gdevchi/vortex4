const modal = document.querySelector(".backdrop");
const roomsContainer = document.querySelector(".rooms");
const roomForm = document.querySelector(".room-form");

function toggleModal() {
  modal.classList.toggle("hide");
}

function getRoom(roomId) {
  const roomEl = document.querySelector(`#room_${roomId}`);
  if (!roomEl) return;
  if (roomEl.classList.contains("loading")) return;
  return roomEl;
}

async function updateRoom(event, roomId) {
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
  console.log(roomId);
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

function renderRoomTemplate(room) {
  return ` <div class='room ${room.public ? "public" : "private"}' id='room_${
    room._id
  }'>
<div class="details">
  <a href="/conferences/${room.uuid}">
    <h3>${room.name}</h3>
    <span>ID: ${room.uuid}</span>
  </a>
</div>
<div class="action">
<span class="fa fa-copy" onclick="copyToClipboard('${
    window.location.origin
  }/conferences/${room.uuid}')"></span>
  <span class="fa ${
    room.public ? "fa-eye" : "fa-eye-slash"
  }" onclick="updateRoom(event, '${room._id}')"></span>
  <span class="fa fa-trash" onclick="deleteRoom('${room._id}')"></span>
</div>
</div>`;
}

function convertStringToHTML(template) {
  const parser = new DOMParser();
  const parsedHTML = parser.parseFromString(template, "text/html");
  return parsedHTML.body.children[0];
}

async function fetchRooms() {
  fetch("/api/v1/rooms", {
    method: "GET",
  })
    .then((res) => res.json())
    .then((res) => {
      roomsContainer.innerHTML = res.data.rooms
        .map(renderRoomTemplate)
        .join("");
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
  const roomEL = convertStringToHTML(renderRoomTemplate(res.data.room));
  roomsContainer.appendChild(roomEL);
}

roomForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const data = {
      name: event.target.elements.name.value,
      public: event.target.elements.public.value === "public" ? true : false,
    };
    if (!data.name) throw { message: "Please provide room name!" };
    await createRoom(data);
    alert("Room Created!");
    event.target.elements.name.value = "";
  } catch (err) {
    console.log(err);
    alert(err.message);
  }
});

document.addEventListener("DOMContentLoaded", async function () {
  await fetchRooms();
});
