const { GoogleGenAI } = require("@google/genai");
const Message = require("../Models/Message.js");
const Conversation = require("../Models/Conversation.js");
const User = require("../Models/User.js");
const {
  GEMINI_MODEL,
  GEMINI_API_KEY,
} = require("../secrets.js");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const allMessage = async (req, res) => {
  try {
    // Verify the requesting user is a member of this conversation
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    const isMember = conversation.members.some(
      (m) => m.toString() === req.user.id
    );
    if (!isMember) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Mark all unseen messages as seen in a single bulk write
    await Message.updateMany(
      {
        conversationId: req.params.id,
        hiddenFrom: { $ne: req.user.id },
        "seenBy.user": { $ne: req.user.id },
      },
      { $push: { seenBy: { user: req.user.id, seenAt: new Date() } } }
    );

    const messages = await Message.find({
      conversationId: req.params.id,
      hiddenFrom: { $ne: req.user.id },
    }).lean();

    // Sanitize soft-deleted messages before sending to client:
    // replace content with tombstone text so the real content
    // is never exposed in the network response.
    const sanitized = messages.map((msg) => {
      if (!msg.softDeleted) return msg;
      return {
        ...msg,
        text: "This message was deleted",
        imageUrl: undefined,
      };
    });

    res.json(sanitized);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

/**
 * DELETE /api/message/:id
 * body: { scope: "me" | "everyone" }
 *
 * scope="everyone"  — soft-delete: sets softDeleted=true, visible to all as tombstone.
 *                     Only the original sender may do this.
 * scope="me"        — hard-delete for caller: adds caller to hiddenFrom so the
 *                     message (or tombstone) is skipped when queried for them.
 *                     Available for both own and received messages.
 */
const deleteMessage = async (req, res) => {
  const { scope } = req.body;
  if (!scope || !['me', 'everyone'].includes(scope)) {
    return res.status(400).json({ error: 'scope must be "me" or "everyone"' });
  }
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    if (scope === 'everyone') {
      // Only the original sender can soft-delete for everyone
      if (message.senderId.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Only the sender can delete for everyone' });
      }
      message.softDeleted = true;
    } else {
      // scope === 'me': hide from requester only
      const alreadyHidden = message.hiddenFrom.some(
        (id) => id.toString() === req.user.id
      );
      if (!alreadyHidden) message.hiddenFrom.push(req.user.id);
    }

    await message.save();
    res.status(200).json(message);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * POST /api/message/clear/:conversationId
 * Adds the requesting user to hiddenFrom for every message in the conversation,
 * effectively clearing the entire chat history from their view.
 */
const clearChat = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const isMember = conversation.members.some(
      (m) => m.toString() === req.user.id
    );
    if (!isMember) return res.status(403).json({ error: 'Forbidden' });

    await Message.updateMany(
      {
        conversationId: req.params.conversationId,
        hiddenFrom: { $ne: req.user.id },
      },
      { $push: { hiddenFrom: req.user.id } }
    );

    res.status(200).json({ message: 'Chat cleared' });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Async generator that:
 * 1. Saves the user message to DB immediately → yields { type: "user-message", message }
 * 2. Streams the Gemini response chunk-by-chunk → yields { type: "chunk", text }
 * 3. Saves the completed bot message → yields { type: "done", message }
 * Yields { type: "error" } on failure so the caller can clean up.
 */
const streamAiResponse = async function* (text, senderId, conversationId) {
  const conv = await Conversation.findById(conversationId);
  const botMember = await User.findOne({
    _id: { $in: conv.members },
    isBot: true,
  });
  if (!botMember) { yield { type: "error" }; return; }
  const botId = botMember._id;

  // Save user message first so it gets a real _id
  const userMessage = await Message.create({
    conversationId,
    senderId,
    text,
    seenBy: [{ user: botId, seenAt: new Date() }],
  });
  yield { type: "user-message", message: userMessage };

  // Build chat history (skip the message we just saved and image-only messages)
  const messagelist = await Message.find({
    conversationId,
    _id: { $ne: userMessage._id },
    text: { $exists: true, $ne: null },
  })
    .sort({ createdAt: -1 })
    .limit(19);

  const history = messagelist
    .reverse()
    .map((m) => ({
      role: m.senderId.toString() === senderId.toString() ? "user" : "model",
      parts: [{ text: m.text }],
    }));

  const chat = ai.chats.create({
    model: GEMINI_MODEL,
    history,
    config: { temperature: 0.5, maxOutputTokens: 1024 },
  });

  let fullText = "";
  try {
    const stream = await chat.sendMessageStream({ message: text });
    for await (const chunk of stream) {
      const chunkText = chunk.text || "";
      if (chunkText) {
        fullText += chunkText;
        yield { type: "chunk", text: chunkText };
      }
    }
  } catch (err) {
    console.error("Gemini stream error:", err.message);
    // Roll back the user message so the conversation stays consistent
    await Message.findByIdAndDelete(userMessage._id);
    yield { type: "error", userMessageId: userMessage._id.toString() };
    return;
  }

  if (!fullText) {
    await Message.findByIdAndDelete(userMessage._id);
    yield { type: "error", userMessageId: userMessage._id.toString() };
    return;
  }

  const botMessage = await Message.create({
    conversationId,
    senderId: botId,
    text: fullText,
  });

  conv.latestmessage = fullText;
  await conv.save();

  yield { type: "done", message: botMessage };
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
    conversation.latestmessage = text || "sent an image";
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
      imageUrl,
      seenBy: [
        {
          user: receiverId,
          seenAt: new Date(),
        },
      ],
    });
    conversation.latestmessage = text || "sent an image";
    await conversation.save();
    return message;
  }
};

/**
 * Used by the socket handler for real-time delete.
 * scope="everyone" → soft-delete (sets softDeleted=true), only sender allowed.
 * scope="me"       → adds requesterId to hiddenFrom.
 * Returns the updated message or false on failure.
 */
const deleteMessageHandler = async ({ messageId, scope, requesterId }) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) return false;

    if (scope === 'everyone') {
      if (message.senderId.toString() !== requesterId.toString()) return false;
      message.softDeleted = true;
    } else {
      const alreadyHidden = message.hiddenFrom.some(
        (id) => id.toString() === requesterId.toString()
      );
      if (!alreadyHidden) message.hiddenFrom.push(requesterId);
    }

    await message.save();
    return message;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

/**
 * DELETE /api/message/bulk
 * body: { messageIds: string[] }
 * Adds the requesting user to hiddenFrom for every listed message (hard-delete for self).
 */
const bulkHide = async (req, res) => {
  const { messageIds } = req.body;
  if (!Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ error: 'messageIds must be a non-empty array' });
  }
  try {
    await Message.updateMany(
      { _id: { $in: messageIds }, hiddenFrom: { $ne: req.user.id } },
      { $push: { hiddenFrom: req.user.id } }
    );
    res.status(200).json({ message: 'Messages hidden' });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * POST /api/message/:id/star
 * Toggle star for the requesting user on a single message.
 * Returns { isStarred: boolean }.
 */
const toggleStar = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    // Ensure the requester is a member of the conversation
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    const isMember = conversation.members.some((m) => m.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Forbidden' });

    const alreadyStarred = message.starredBy.some((id) => id.toString() === req.user.id);
    if (alreadyStarred) {
      message.starredBy = message.starredBy.filter((id) => id.toString() !== req.user.id);
    } else {
      message.starredBy.push(req.user.id);
    }
    await message.save();
    res.status(200).json({ isStarred: !alreadyStarred, starredBy: message.starredBy });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * GET /api/message/starred
 * Returns all messages starred by the requesting user, newest first.
 * Each message includes a populated conversationId so the client knows
 * which chat to navigate to.
 */
const getStarredMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      starredBy: req.user.id,
      hiddenFrom: { $ne: req.user.id },
      softDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'conversationId',
        select: 'members',
        populate: {
          path: 'members',
          select: '-password',
        },
      })
      .lean();

    res.json(messages);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  allMessage,
  streamAiResponse,
  deleteMessage,
  bulkHide,
  clearChat,
  sendMessageHandler,
  deleteMessageHandler,
  toggleStar,
  getStarredMessages,
};
