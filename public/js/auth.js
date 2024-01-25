function logout() {
    fetch("/api/v1/auth/logout", {
      method: "GET",
    })
      .then(() => (window.location.href = "/"))
      .catch(() => alert("Logout failed!"));
  }