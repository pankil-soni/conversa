const { GoogleGenerativeAI } = require("@google/generative-ai");
const { S3Client } = require("@aws-sdk/client-s3");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
const Message = require("../Models/Message.js");
const Conversation = require("../Models/Conversation.js");
const {
  AWS_BUCKET_NAME,
  AWS_SECRET,
  AWS_ACCESS_KEY,
  GEMINI_MODEL,
  GEMINI_API_KEY,
} = require("../secrets.js");

const configuration = new GoogleGenerativeAI(GEMINI_API_KEY);
const modelId = GEMINI_MODEL;
const model = configuration.getGenerativeModel({ model: modelId });

const allMessage = async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.id,
      deletedFrom: { $ne: req.user.id },
    });

    // Use Promise.all with map instead of forEach
    await Promise.all(
      messages.map(async (message) => {
        const alreadySeen = message.seenBy.some(
          (element) => element.user.toString() === req.user.id
        );
        if (!alreadySeen) {
          message.seenBy.push({ user: req.user.id });
          await message.save();
        }
      })
    );

    res.json(messages);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const deletemesage = async (req, res) => {
  const msgid = req.body.messageid;
  const userids = req.body.userids;
  try {
    const message = await Message.findById(msgid);

    userids.forEach(async (userid) => {
      if (!message.deletedby.includes(userid)) {
        message.deletedby.push(userid);
      }
    });
    await message.save();
    res.status(200).send("Message deleted successfully");
  } catch (error) {
    console.log(error.message);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

const getPresignedUrl = async (req, res) => {
  const filename = req.query.filename;
  const filetype = req.query.filetype;

  if (!filename || !filetype) {
    return res
      .status(400)
      .json({ error: "Filename and filetype are required" });
  }

  const validFileTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
  ];

  if (!validFileTypes.includes(filetype)) {
    return res.status(400).json({ error: "Invalid file type" });
  }

  const userId = req.user.id;
  const s3Client = new S3Client({
    credentials: {
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET,
    },
    region: "ap-south-1",
  });

  try {
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: AWS_BUCKET_NAME,
      Key: `conversa/${userId}/${Math.random()}/${filename}`,
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

const getAiResponse = async (prompt, senderId, conversationId) => {
  var currentMessages = [];
  const conv = await Conversation.findById(conversationId);
  const botId = conv.members.find((member) => member != senderId);

  const messagelist = await Message.find({
    conversationId: conversationId,
  })
    .sort({ createdAt: -1 })
    .limit(20);

  messagelist.forEach((message) => {
    if (message.senderId == senderId) {
      currentMessages.push({
        role: "user",
        parts: message.text,
      });
    } else {
      currentMessages.push({
        role: "model",
        parts: message.text,
      });
    }
  });

  // reverse currentMessages
  currentMessages = currentMessages.reverse();

  try {
    const chat = model.startChat({
      history: currentMessages,
      generationConfig: {
        maxOutputTokens: 2000,
      },
    });

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    var responseText = response.text();

    if (responseText.length < 1) {
      return null;
    }

    await Message.create({
      conversationId: conversationId,
      senderId: senderId,
      text: prompt,
      seenBy: [{ user: botId, seenAt: new Date() }],
    });

    const botMessage = await Message.create({
      conversationId: conversationId,
      senderId: botId,
      text: responseText,
    });

    conv.latestmessage = responseText;
    await conv.save();

    return botMessage;
  } catch (error) {
    console.error("AI response error:", error.message);
    return null; // use null consistently
  }
};

const sendMessageHandler = async (data) => {
  const {
    text,
    imageUrl,
    senderId,
    conversationId,
    receiverId,
    isReceiverInsideChatRoom,
  } = data;
  const conversation = await Conversation.findById(conversationId);
  if (!isReceiverInsideChatRoom) {
    const message = await Message.create({
      conversationId,
      senderId,
      text,
      imageUrl,
      seenBy: [],
    });

    // update conversation latest message and increment unread count of receiver by 1
    conversation.latestmessage = text;
    conversation.unreadCounts.map((unread) => {
      if (unread.userId.toString() == receiverId.toString()) {
        unread.count += 1;
      }
    });
    await conversation.save();
    return message;
  } else {
    // create new message with seenby receiver
    const message = await Message.create({
      conversationId,
      senderId,
      text,
      seenBy: [
        {
          user: receiverId,
          seenAt: new Date(),
        },
      ],
    });
    conversation.latestmessage = text;
    await conversation.save();
    return message;
  }
};

const deleteMessageHandler = async (data) => {
  const { messageId, deleteFrom } = data;
  const message = await Message.findById(messageId);

  if (!message) {
    return false;
  }

  try {
    for (const userId of deleteFrom) {
      const alreadyDeleted = message.deletedFrom.some(
        (id) => id.toString() === userId.toString()
      );
      if (!alreadyDeleted) {
        message.deletedFrom.push(userId);
      }
    }
    await message.save();

    return true;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

module.exports = {
  allMessage,
  getPresignedUrl,
  getAiResponse,
  deletemesage,
  sendMessageHandler,
  deleteMessageHandler,
};
