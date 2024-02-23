const router = require("express").Router();

const authController = require("../../controllers/auth.controller");
const roomController = require("../../controllers/room.controller");

router.post(
  "/",
  authController.restrictApiAccess(["admin"]),
  roomController.createRoom
);

router.get(
  "/",
  authController.restrictApiAccess(["guest", "user", "admin"]),
  roomController.fetchRooms
);

router.patch(
  "/:roomId",
  authController.restrictApiAccess(["admin"]),
  roomController.updateRoom
);


router.delete(
  "/:roomId",
  authController.restrictApiAccess(["admin"]),
  roomController.deleteRoom
);

module.exports = router;
