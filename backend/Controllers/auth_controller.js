const User = require("../Models/User.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Conversation = require("../Models/Conversation.js");
const nodemailer = require("nodemailer");
const { JWT_SECRET, EMAIL, PASSWORD } = require("../secrets.js");

let mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL,
    pass: PASSWORD,
  },
});

const register = async (req, res) => {
  // Registration involves 3 dependent DB writes:
  //   1. Create the new user
  //   2. Create a personal AI bot user tied to this account
  //   3. Create the initial conversation between the user and their bot
  //
  // All three must succeed together. MongoDB transactions require a replica set,
  // so instead we use manual compensation: track every document that gets
  // created and delete them all if any subsequent step fails, leaving the DB
  // in a clean state (no partial accounts).
  let newUser = null;
  let botUser = null;

  try {
    console.log("register request received");

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Please fill all the fields",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: "User already exists",
      });
    }

    var imageUrl = `https://ui-avatars.com/api/?name=${name}&background=random&bold=true`;

    const salt = await bcrypt.genSalt(10);
    const secPass = await bcrypt.hash(password, salt);

    // Write 1: create the real user account
    newUser = await User.create({
      name,
      email,
      password: secPass,
      profilePic: imageUrl,
      about: "Hello World!!",
    });

    // Write 2: create the dedicated bot user for this account.
    // Each real user gets their own bot instance so conversations stay isolated.
    botUser = await User.create({
      name: "AI Chatbot",
      email: email + "bot",
      password: secPass, // bot doesn't need login, but password is required
      about: "I am an AI Chatbot to help you",
      profilePic:
        "https://play-lh.googleusercontent.com/Oe0NgYQ63TGGEr7ViA2fGA-yAB7w2zhMofDBR3opTGVvsCFibD8pecWUjHBF_VnVKNdJ",
      isBot: true,
    });

    // Write 3: create the initial conversation between the user and their bot
    await Conversation.create({
      members: [newUser._id, botUser._id],
      unreadCounts: [
        { userId: newUser._id, count: 0 },
        { userId: botUser._id, count: 0 },
      ],
    });

    const data = {
      user: {
        id: newUser.id,
      },
    };

    const authtoken = jwt.sign(data, JWT_SECRET);
    res.json({
      authtoken,
    });
  } catch (error) {
    // Something went wrong during one of the DB writes.
    // Manually delete any documents that were already created so we don't
    // leave behind partial data (e.g. a user with no bot, or a bot with no
    // conversation). This is the compensation step in lieu of a transaction.
    try {
      if (newUser) await User.findByIdAndDelete(newUser._id);
      if (botUser) await User.findByIdAndDelete(botUser._id);
    } catch (cleanupError) {
      // Log but don't mask the original error
      console.error("Cleanup after failed registration also failed:", cleanupError.message);
    }
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const login = async (req, res) => {
  console.log("login request received");

  try {
    const { email, password, otp } = req.body;

    if (!email || (!password && !otp)) {
      return res.status(400).json({
        error: "Please fill all the fields",
      });
    }

    const user = await User.findOne({
      email: email,
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid Credentials",
      });
    }

    if (otp) {
      if (user.otp != otp) {
        return res.status(400).json({
          error: "Invalid otp",
        });
      }
      user.otp = "";
      await user.save();
    } else {
      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return res.status(400).json({
          error: "Invalid Credentials",
        });
      }
    }

    const data = {
      user: {
        id: user.id,
      },
    };

    const authtoken = jwt.sign(data, JWT_SECRET);

    res.json({
      authtoken,
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const authUser = async (req, res) => {
  try {
    // we get req.user from the fetchuser middleware, which verifies the JWT and extracts the user ID
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const sendotp = async (req, res) => {
  try {
    console.log("sendotp request received");
    const { email } = req.body;
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({
        error: "User not found",
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp;
    await user.save();

    //delete otp after 5 minutes
    setTimeout(() => {
      user.otp = "";
      user.save();
    }, 300000);

    let mailDetails = {
      from: EMAIL,
      to: email,
      subject: "Login with your Otp",

      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
          <title>Otp for Login</title>
          <style>
              .container {
                  width: 50%;
                  margin: 0 auto;
                  background: #f4f4f4;
                  padding: 20px;
              }
              h1 {
                  text-align: center;
              }
    
          </style> 
      </head>
      <body>
              <strong><h1>Conversa - online chatting app</h1></strong>
          <div class="container">
              <h2>Your Otp is</h2>
              <strong><p>${otp}</p><strong>
              <p>Use this Otp to login</p>
          </div>
      </body>
      </html>`,
    };

    await mailTransporter.sendMail(mailDetails, function (err, data) {
      if (err) {
        console.log("Error Occurs", err);
        res.status(400).json({ message: "Error Occurs" });
      } else {
        console.log("Email sent successfully");
        res.status(200).json({ message: "OTP sent" });
      }
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  register,
  login,
  getNonFriendsList,
  authUser,
  updateprofile,
  sendotp,
};
