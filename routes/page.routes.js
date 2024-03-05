const path = require("path");
const router = require("express").Router();
const accountController = require("../controllers/auth.controller");
const roomController = require("../controllers/room.controller");

function renderStaticPage(page) {
  return (req, res) => {
    const file = path.resolve(path.join("public", page));
    return res.status(200).sendFile(file);
  };
}

//pages
router.get(
  "/",
  accountController.restrictPageAccess(["guest", "user"]),
  renderStaticPage("login.html")
);

router.get(
  "/register",
  accountController.restrictPageAccess(["user"]),
  (req, res) => {
    return res.status(200).render("register.ejs", { account: req.account });
  }
);

router.get(
  "/conferences",
  accountController.restrictPageAccess(["guest", "user", "admin"]),
  renderStaticPage("conferences.html")
);

router.get(
  `/conferences/:conferenceId`,
  accountController.restrictPageAccess(["guest", "user", "admin"]),
  roomController.getRoom,
  (req, res) => {
    return res.status(200).render("conference.ejs", {
      account: req.account,
      room: req.body.room,
      path: req.account.role === "admin" ? "/admin/rooms" : "/conferences",
    });
  }
);

router.get(
  `/conferences/:conferenceId/waitlist`,
  accountController.restrictPageAccess(["guest", "user", "admin"]),
  roomController.getRoom,
  (req, res) => {
    return res.status(200).render("waitlist.ejs", {
      account: req.account,
      room: req.body.room,
    });
  }
);

//ADMIN
router.get("/admin", renderStaticPage("/admin/login.html"));

router.get(
  "/admin/rooms",
  accountController.restrictPageAccess(["admin"]),
  renderStaticPage("/admin/rooms.html")
);

module.exports = router;
