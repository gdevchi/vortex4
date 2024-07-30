const guestForm = document.querySelector(".guest-form");

const loginState = {
  progress: false,
};

function gotoPage() {
  const redirectTo =
    new URLSearchParams(window.location.search).get("redirectTo") ||
    "/conferences";
  window.location.href = redirectTo;
}

async function getGuestAuthToken(crendentials) {
  const rawRes = await fetch("/api/v1/auth/authenticate-guest", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(crendentials),
  });
  const response = await rawRes.json();
  if (response.status !== "authorized") throw response;
}

//Handle guest form button click
guestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (loginState.progress) return;
  try {
    loginState.progress = true;
    await getGuestAuthToken({
      username: event.target.elements.username.value,
    });
    gotoPage();
  } catch (err) {
    loginState.progress = false;
    alert(err.message);
  }
});
