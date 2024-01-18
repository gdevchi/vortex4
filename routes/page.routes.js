const path = require("path");
const router = require("express").Router();
const userController = require("../services/user.services");
const accountController = require("../controllers/auth.controller");
const roomController = require("../controllers/room.controller");

function renderStaticPage(page) {
  return (req, res) => {
    const file = path.resolve(path.join("public", page));
    return res.status(200).sendFile(file);
  };
}

async function isRoomFull(req, res, next) {
  const totalUsers =
    req.body.room?.users || (await userController.getTotalUser());
  if (totalUsers >= 12)
    return res.status(200).redirect(`/?message=Room is full`);
  return next();
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
  isRoomFull,
  (req, res) => {
    return res.status(200).render("conference.ejs", {
      account: req.account,
      conferenceId: req.params.conferenceId,
      conferenceName: req.body.room?.name || "",
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
