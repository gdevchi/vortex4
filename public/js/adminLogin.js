const state = {
  progress: false,
};
//Handle guest form button click
document
  .querySelector(".admin-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.progress) return;
    try {
      state.progress = true;
      await getAuthToken({
        email: event.target.elements.email.value,
        password: event.target.elements.password.value,
      });
      window.location.href = "/admin/rooms";
    } catch (err) {
      state.progress = false;
      alert(err.message);
    }
  });

async function getAuthToken(crendentials) {
  const rawRes = await fetch("/api/v1/auth/authenticate-admin", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(crendentials),
  });
  const response = await rawRes.json();
  if (response.status !== "authorized") throw response;
}
