const express = require("express");
const router = express.Router();
const fetchuser = require("../middleware/fetchUser.js");

const {
  getPresignedUrl,
  getOnlineStatus,
  getNonFriendsList,
  updateprofile,
  blockUser,
  unblockUser,
  getBlockStatus,
  deleteAccount,
} = require("../Controllers/user-controller.js");

router.put("/update", fetchuser, updateprofile);
router.get("/online-status/:id", fetchuser, getOnlineStatus);
router.get("/non-friends", fetchuser, getNonFriendsList);
router.get("/presigned-url", fetchuser, getPresignedUrl);
router.post("/block/:id", fetchuser, blockUser);
router.delete("/block/:id", fetchuser, unblockUser);
router.get("/block-status/:id", fetchuser, getBlockStatus);
router.delete("/delete", fetchuser, deleteAccount);

module.exports = router;
