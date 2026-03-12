const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { S3Client } = require("@aws-sdk/client-s3");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
const User = require("../Models/User.js");
const Conversation = require("../Models/Conversation.js");
const {
  AWS_BUCKET_NAME,
  AWS_SECRET,
  AWS_ACCESS_KEY
} = require("../secrets.js");

const s3Client = new S3Client({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET,
  },
  region: "ap-south-1",
});

const getPresignedUrl = async (req, res) => {

  const filename = req.query.filename;
  const filetype = req.query.filetype;

  if (!filename || !filetype) {
    return res
      .status(400)
      .json({ error: "Filename and filetype are required" });
  }

  if (!filetype.startsWith("image/")) {
    return res.status(400).json({ error: "Invalid file type" });
  }

  const userId = req.user.id;

  try {
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: AWS_BUCKET_NAME,
      Key: `conversa/${userId}/${crypto.randomUUID()}-${filename}`,
      Conditions: [["content-length-range", 0, 5 * 1024 * 1024]],
      Fields: {
        success_action_status: "201",
      },
      Expires: 15 * 60,
    });

    return res.status(200).json({ url, fields });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getOnlineStatus = async (req, res) => {
  const userId = req.params.id;
  const requesterId = req.user.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // If this user has blocked the requester, return offline (sanitized)
    const isBlocked = user.blockedUsers?.some(
      (id) => id.toString() === requesterId
    );
    res.status(200).json({ isOnline: isBlocked ? false : user.isOnline });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const blockUser = async (req, res) => {
  const targetId = req.params.id;
  const myId = req.user.id;
  if (targetId === myId) return res.status(400).json({ error: "Cannot block yourself" });
  try {
    await User.findByIdAndUpdate(myId, {
      $addToSet: { blockedUsers: targetId },
    });
    res.status(200).json({ message: "User blocked" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const unblockUser = async (req, res) => {
  const targetId = req.params.id;
  const myId = req.user.id;
  try {
    await User.findByIdAndUpdate(myId, {
      $pull: { blockedUsers: targetId },
    });
    res.status(200).json({ message: "User unblocked" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getBlockStatus = async (req, res) => {
  const targetId = req.params.id;
  const myId = req.user.id;
  try {
    const [me, them] = await Promise.all([
      User.findById(myId, "blockedUsers"),
      User.findById(targetId, "blockedUsers"),
    ]);
    if (!them) return res.status(404).json({ error: "User not found" });
    const iBlockedThem = me.blockedUsers.some(
      (id) => id.toString() === targetId
    );
    const theyBlockedMe = them.blockedUsers.some(
      (id) => id.toString() === myId
    );
    res.status(200).json({ iBlockedThem, theyBlockedMe });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const PINNED_EMAIL = "pmsoni2016@gmail.com";

const getNonFriendsList = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const sort = req.query.sort || "name_asc";   // name_asc | name_desc | last_seen_recent | last_seen_oldest
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // IDs already in a conversation with the requester (including the requester themselves)
    const conversations = await Conversation.find({ members: { $in: [req.user.id] } });
    const excludedIds = conversations.flatMap((c) => c.members);

    // Base filter: not in any conversation + not a bot
    const baseFilter = {
      _id: { $nin: excludedIds },
      email: { $not: /bot$/ },
    };

    // Search filter
    if (search) {
      baseFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Sort map
    const sortMap = {
      name_asc: { name: 1 },
      name_desc: { name: -1 },
      last_seen_recent: { lastSeen: -1 },
      last_seen_oldest: { lastSeen: 1 },
    };
    const mongoSort = sortMap[sort] || sortMap.name_asc;

    // When no search: handle pinned user separately so they always appear at top of page 1
    let pinnedUser = null;
    if (!search) {
      pinnedUser = await User.findOne({
        ...baseFilter,
        email: PINNED_EMAIL,
      }).select("-password");
    }

    // Exclude pinned user from main paginated query
    const mainFilter = pinnedUser
      ? { ...baseFilter, _id: { $nin: [...excludedIds, pinnedUser._id] } }
      : baseFilter;

    // Adjust skip/limit on page 1 to account for the pinned slot
    const effectiveLimit = (pinnedUser && page === 1) ? limit - 1 : limit;
    const effectiveSkip = (pinnedUser && page > 1) ? skip - 1 : skip;

    const [users, total] = await Promise.all([
      User.find(mainFilter).sort(mongoSort).skip(Math.max(0, effectiveSkip)).limit(effectiveLimit).select("-password"),
      User.countDocuments(mainFilter),
    ]);

    // Total including the pinned user
    const grandTotal = total + (pinnedUser ? 1 : 0);
    const hasMore = skip + limit < grandTotal;

    res.json({
      users,
      pinnedUser: page === 1 ? pinnedUser : null,
      hasMore,
      total: grandTotal,
      page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateprofile = async (req, res) => {
  try {
    const dbuser = await User.findById(req.user.id);
    const allowedUpdates = {
      name: req.body.name,
      about: req.body.about,
      profilePic: req.body.profilePic,
      emailNotificationsEnabled: req.body.emailNotificationsEnabled,
    };

    if (req.body.newpassword) {
      const passwordCompare = await bcrypt.compare(
        req.body.oldpassword,
        dbuser.password
      );
      if (!passwordCompare) {
        return res.status(400).json({
          error: "Invalid Credentials",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(req.body.newpassword, salt);
      allowedUpdates.password = secPass;
    }

    // Remove undefined keys
    Object.keys(allowedUpdates).forEach(
      (key) => allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    await User.findByIdAndUpdate(req.user.id, allowedUpdates);
    res.status(200).json({ message: "Profile Updated" });
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const anonymisedEmail = `deleted-${crypto.randomUUID()}-${user.email}`;

    await User.findByIdAndUpdate(userId, {
      isDeleted: true,
      name: "Deleted Conversa User",
      about: "",
      email: anonymisedEmail,
      profilePic: "https://ui-avatars.com/api/?name=Deleted+User&background=808080&color=ffffff&bold=true",
      // Wipe login credentials so the account cannot be accessed again
      password: "",
      otp: "",
      otpExpiry: null,
      lastSeen: null
    });

    res.status(200).json({ message: "Account deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { getPresignedUrl, getOnlineStatus, getNonFriendsList, updateprofile, blockUser, unblockUser, getBlockStatus, deleteAccount };
