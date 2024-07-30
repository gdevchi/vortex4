const metamaskBtn = document.querySelector(".metamask-button");

const loginState = {
  progress: false,
  ethereum: null,
};

function gotoPage() {
  const redirectTo =
    new URLSearchParams(window.location.search).get("redirectTo") ||
    "/conferences";
  window.location.href = redirectTo;
}

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
  alert(err.message);
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
    console.log("1. ADDRESSES");
    console.log(accounts);
    const address = accounts[0];
    const nonce = await getUserNonce(address);
    const message = `I am signing this message with nonce:${nonce}`;
    console.log("2. SIGN IN PARAMS");
    console.log({
      method: "personal_sign",
      params: [message, address],
    });
    const signedMessage = await ethereum.request({
      method: "personal_sign",
      params: [message, address],
    });
    console.log("3. SUCCESSFULLY SIGNED MESSAGE!");
    //get and save auth token in cookie
    await getAuthToken({ signedMessage, message, address });
    gotoPage();
  } catch (err) {
    console.log(err);
    loginState.progress = false;
    //alert("Something went wrong, Please refresh your page and try again!.");
    alert(err.message);
  }
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
