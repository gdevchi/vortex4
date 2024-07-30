const form = document.querySelector("form");

const state = {
  progress: false,
};

async function registerUser(data) {
  const rawRes = await fetch("/api/v1/auth/account:update", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(data),
  });
  const response = await rawRes.json();
  if (response.status !== "success") throw response;
}

form.addEventListener("submit", async function (event) {
  try {
    event.preventDefault();
    if (state.progress) {
      alert("Please wait for previous request to complete");
    }
    state.progress = true;
    await registerUser({
      username: event.target.elements.username.value,
      email: event.target.elements.email.value,
      description: event.target.elements.description.value,
    });
    if (action === "edit") alert("Profile updated!");
    else window.location.href = "/conferences";
  } catch (err) {
    alert(err.message);
  }
  state.progress = false;
});
