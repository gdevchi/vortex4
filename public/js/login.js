const messageEl = document.querySelector(".message");
const metamaskBtn = document.querySelector(".metamask-button");
const guestForm = document.querySelector(".guest-form");

const loginState = {
  progress: false,
  ethereum: null,
};

try {
  const MMSDK = new MetaMaskSDK.MetaMaskSDK();
  MMSDK.init()
    .then(() => {
      loginState.ethereum = MMSDK.getProvider();
      metamaskBtn.classList.remove("disabled");
      if (loginState.ethereum) {
        loginState.ethereum.on("disconnect", () => {
          console.log("disconnected!");
        });
        loginState.ethereum.on("error", () => {
          console.log("error");
        });
      }
    })
    .catch((err) => console.log(err));
} catch (err) {
  messageEl.textContent = err.message;
}

async function getUserNonce(address) {
  const rawRes = await fetch("/api/v1/auth/nonce", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      address,
    }),
  });
  const response = await rawRes.json();
  if (response.status !== "success") throw response;
  return response.data.nonce;
}

async function getAuthToken(crendentials) {
  const rawRes = await fetch("/api/v1/auth/authenticate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(crendentials),
  });
  const response = await rawRes.json();
  if (response.status !== "authorized") throw response;
}

// Function to request user login using Metamask
async function initiateLogin(ethereum) {
  try {
    loginState.progress = true;
    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });

    messageEl.textContent =
      "Please open metamask app manually, if metamask sign window popup not visible in mobile";

    const address = accounts[0];
    const nonce = await getUserNonce(address);
    const message = `I am signing this message with nonce:${nonce}`;
    const signedMessage = await ethereum.request({
      method: "personal_sign",
      params: [message, address],
    });
    //get and save auth token in cookie
    await getAuthToken({ signedMessage, message, address });
    window.location.href = "/conferences";
  } catch (err) {
    loginState.progress = false;
    alert(err.message);
  }
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

// Handle the login button click
metamaskBtn.addEventListener("click", async () => {
  try {
    if (!loginState.ethereum) {
      throw { message: "Please wait initializing sdk" };
    }
    await initiateLogin(loginState.ethereum);
  } catch (err) {
    loginState.progress = false;
    alert(err.message);
  }
});

//Handle guest form button click
guestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (loginState.progress) return;
  try {
    loginState.progress = true;
    await getGuestAuthToken({
      username: event.target.elements.username.value,
    });
    window.location.href = "/conferences";
  } catch (err) {
    loginState.progress = false;
    alert(err.message);
  }
});
