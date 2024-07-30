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
  renderStaticPage("index.html")
);

router.get(
  "/guest",
  accountController.restrictPageAccess(["guest", "user"]),
  renderStaticPage("guest.html")
);

router.get(
  "/account",
  accountController.restrictPageAccess(["user"]),
  (req, res) => {
    return res.status(200).render("account.ejs", {
      account: req.account,
      username:
        req.account?.address !== req.account?.username
          ? req.account.username
          : "",
      action: req.query.action,
    });
  }
);

router.get(
  "/conferences",
  accountController.restrictPageAccess(["guest", "user", "admin"]),
  (req, res) => {
    return res.status(200).render("conferences.ejs", {
      username:
        req.account?.address !== req.account?.username
          ? req.account.username
          : "",
    });
  }
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
  renderStaticPage("/admin/conferences.html")
);

module.exports = router;
