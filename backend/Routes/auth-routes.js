const express = require("express");
const router = express.Router();

const {
  register,
  login,
  authUser,
  sendotp,
  sendVerificationOtp,
  verifyEmail,
} = require("../Controllers/auth-controller.js");
const fetchuser = require("../middleware/fetchUser.js");

router.post("/register", register);
router.post("/login", login);
router.post("/getotp", sendotp);
router.get("/me", fetchuser, authUser);
router.post("/send-verification-otp", fetchuser, sendVerificationOtp);
router.post("/verify-email", fetchuser, verifyEmail);

module.exports = router;
