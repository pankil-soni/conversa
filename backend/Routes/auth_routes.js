const express = require("express");
const router = express.Router();
const {
  register,
  login,
  authUser,
  sendotp,
} = require("../Controllers/auth_controller.js");
const fetchuser = require("../middleware/fetchUser.js");

router.post("/register", register);
router.post("/login", login);
router.post("/getotp", sendotp);
router.get("/me", fetchuser, authUser);
module.exports = router;
