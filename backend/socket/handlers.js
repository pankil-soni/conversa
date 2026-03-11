const Conversation = require("../Models/Conversation.js");
const User = require("../Models/User.js");
const Message = require("../Models/Message.js");
const {
  streamAiResponse,
  sendMessageHandler,
  deleteMessageHandler,
} = require("../Controllers/message-controller.js");

// userSocketMap is Map<userId, Set<socketId>> injected from socket/index.js.
// It is used to determine whether a user still has any open connections before
// marking them offline, so closing one browser tab doesn't falsely show them
// as offline while another tab is still connected.
module.exports = (io, socket, userSocketMap) => {
  // socket.userId is set by the JWT auth middleware in socket/index.js.
  // We never trust a user-supplied ID for security-sensitive operations.
  const currentUserId = socket.userId;

  // ─── Setup ────────────────────────────────────────────────────────────────
  // Client calls this once after connecting to join their personal room and
  // announce they are online.
  socket.on("setup", async () => {
    try {
      socket.join(currentUserId);
      console.log("User joined personal room", currentUserId);
      socket.emit("user setup", currentUserId);

      await User.findByIdAndUpdate(currentUserId, { isOnline: true });

      const conversations = await Conversation.find({
        members: { $in: [currentUserId] },
      });

      // Collect unique friend IDs across all conversations
      const friendIds = new Set();
      conversations.forEach((conversation) => {
        conversation.members.forEach((memberId) => {
          if (memberId.toString() !== currentUserId) {
            friendIds.add(memberId.toString());
          }
        });
      });

      // Notify every online friend via their personal room
      friendIds.forEach((friendId) => {
        io.to(friendId).emit("user-online", { userId: currentUserId });
      });
    } catch (error) {
      console.error("Error in setup handler:", error);
    }
  });

  // ─── Join chat room ────────────────────────────────────────────────────────
  socket.on("join-chat", async (data) => {
    try {
      const { roomId } = data;
      console.log("User joined chat room", roomId);

      const conv = await Conversation.findById(roomId);
      if (!conv) return;

      // Verify the authenticated user is actually a member of this conversation
      const isMember = conv.members.some(
        (m) => m.toString() === currentUserId
      );
      if (!isMember) {
        console.warn(
          `User ${currentUserId} tried to join conversation ${roomId} they are not a member of`
        );
        return;
      }

      socket.join(roomId);

      // Reset unread count for this user
      conv.unreadCounts = conv.unreadCounts.map((unread) => {
        if (unread.userId.toString() === currentUserId) {
          unread.count = 0;
        }
        return unread;
      });
      await conv.save({ timestamps: false });

      // Mark all unseen messages in this conversation as seen by this user
      const seenAt = new Date();
      await Message.updateMany(
        {
          conversationId: roomId,
          senderId: { $ne: currentUserId },
          hiddenFrom: { $ne: currentUserId },
          "seenBy.user": { $ne: currentUserId },
        },
        { $push: { seenBy: { user: currentUserId, seenAt } } }
      );

      // Notify the sender(s) in this room that their messages were seen
      io.to(roomId).emit("messages-seen", {
        conversationId: roomId,
        seenBy: currentUserId,
        seenAt,
      });

      io.to(roomId).emit("user-joined-room", currentUserId);
    } catch (error) {
      console.error("Error in join-chat handler:", error);
    }
  });

  // ─── Leave chat room ───────────────────────────────────────────────────────
  socket.on("leave-chat", (room) => {
    socket.leave(room);
  });

  // ─── Send message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (data) => {
    try {
      console.log("Received message");

      const { conversationId, text, imageUrl } = data;
      // Always use the authenticated user as the sender — never trust client-supplied senderId
      const senderId = currentUserId;

      const conversation = await Conversation.findById(conversationId).populate(
        "members"
      );
      if (!conversation) return;

      // Verify sender is a member of this conversation
      const isMember = conversation.members.some(
        (m) => m._id.toString() === senderId
      );
      if (!isMember) {
        console.warn(
          `User ${senderId} tried to send to conversation ${conversationId} they don't belong to`
        );
        return;
      }

      // ── AI bot processing ────────────────────────────────────────────────
      // Use the isBot field instead of an email-suffix heuristic.
      const botMember = conversation.members.find(
        (member) => member._id.toString() !== senderId && member.isBot
      );

      if (botMember) {
        const botId = botMember._id.toString();
        const tempId = `bot-stream-${Date.now()}`;

        try {
          for await (const event of streamAiResponse(text, senderId, conversationId)) {
            if (event.type === "user-message") {
              // Emit real user message (has a proper MongoDB _id)
              io.to(conversationId).emit("receive-message", event.message);
              // Now start the typing indicator (conversationId required by frontend)
              io.to(conversationId).emit("typing", { typer: botId, conversationId });
            } else if (event.type === "chunk") {
              io.to(conversationId).emit("bot-chunk", { conversationId, tempId, chunk: event.text });
            } else if (event.type === "done") {
              io.to(conversationId).emit("stop-typing", { typer: botId, conversationId });
              io.to(conversationId).emit("bot-done", { conversationId, tempId, message: event.message });
            } else if (event.type === "error") {
              io.to(conversationId).emit("stop-typing", { typer: botId, conversationId });
              io.to(conversationId).emit("bot-error", {
                conversationId,
                userMessageId: event.userMessageId ?? null,
              });
            }
          }
        } catch (err) {
          console.error("Bot streaming error:", err);
          io.to(conversationId).emit("stop-typing", { typer: botId, conversationId });
          io.to(conversationId).emit("bot-error", { conversationId, userMessageId: null });
        }
        return;
      }

      // ── Personal chat processing ─────────────────────────────────────────
      const receiverMember = conversation.members.find(
        (member) => member._id.toString() !== senderId
      );
      if (!receiverMember) return;

      const receiverId = receiverMember._id;

      // ── Block check ───────────────────────────────────────────────────────
      // Prevent sending if (a) the receiver has blocked the sender, or
      // (b) the sender has blocked the receiver.
      const [receiverDoc, senderDoc] = await Promise.all([
        User.findById(receiverId, "blockedUsers"),
        User.findById(senderId, "blockedUsers"),
      ]);
      const isBlockedByReceiver = receiverDoc?.blockedUsers?.some(
        (id) => id.toString() === senderId
      );
      const senderBlockedReceiver = senderDoc?.blockedUsers?.some(
        (id) => id.toString() === receiverId.toString()
      );
      if (isBlockedByReceiver || senderBlockedReceiver) {
        socket.emit("message-blocked", { conversationId });
        return;
      }

      // Determine if the receiver currently has the conversation room open.
      // Check ALL of the receiver's sockets so multi-device is handled correctly.
      const receiverSocketIds = userSocketMap.get(receiverId.toString());
      let isReceiverInsideChatRoom = false;

      if (receiverSocketIds) {
        const conversationRoom = io.sockets.adapter.rooms.get(conversationId);
        if (conversationRoom) {
          isReceiverInsideChatRoom = Array.from(receiverSocketIds).some((sid) =>
            conversationRoom.has(sid)
          );
        }
      }

      const message = await sendMessageHandler({
        text,
        imageUrl,
        senderId,
        conversationId,
        receiverId,
        isReceiverInsideChatRoom,
      });

      io.to(conversationId).emit("receive-message", message);

      conversation.unreadCounts = conversation.unreadCounts.map((unread) => {
        if (unread.userId.toString() === receiverId.toString()) {
          return { userId: unread.userId, count: unread.count + 1 };
        }
        return unread;
      });

      conversation.latestmessage = text || "sent an image";

      if (!isReceiverInsideChatRoom) {
        console.log("Emitting new message notification to:", receiverId.toString());
        const senderInfo = conversation.members.find(
          (m) => m._id.toString() === senderId
        );
        io.to(receiverId.toString()).emit("new-message-notification", {
          message,
          sender: senderInfo,
          conversation: conversation
        });
      }
    } catch (error) {
      console.error("Error in send-message handler:", error);
    }
  };

  socket.on("send-message", handleSendMessage);

  // ─── Delete message ────────────────────────────────────────────────────────
  // scope="everyone": soft-delete → shows tombstone to all. Broadcast to room.
  // scope="me":       hard-delete for sender only → no broadcast (only caller hides it).
  const handleDeleteMessage = async (data) => {
    try {
      const { messageId, conversationId, scope } = data;
      const updated = await deleteMessageHandler({
        messageId,
        scope,
        requesterId: currentUserId,
      });
      if (!updated) return;

      if (scope === 'everyone') {
        // Broadcast to every member so they see the tombstone in real-time
        io.to(conversationId).emit('message-deleted', {
          messageId,
          conversationId,
          softDeleted: true,
        });
      }
      // scope="me": no broadcast — remove from local state on client only
    } catch (error) {
      console.error('Error in delete-message handler:', error);
    }
  };

  socket.on('delete-message', handleDeleteMessage);

  // ─── Typing indicators ─────────────────────────────────────────────────────
  // Helper: emit a typing event to everyone in the conversation room, and also
  // to the receiver's personal room if they are online but not currently viewing
  // this conversation (so they can show a subtle indicator in the chat list).
  const emitTypingEvent = (event, data) => {
    const { conversationId, receiverId } = data;

    // Always notify users already inside the room
    io.to(conversationId).emit(event, data);

    if (!receiverId) return;

    // Check if receiver is online
    const receiverSockets = userSocketMap.get(receiverId.toString());
    if (!receiverSockets || receiverSockets.size === 0) return; // offline

    // Check if ANY of their sockets are inside the conversation room
    const conversationRoom = io.sockets.adapter.rooms.get(conversationId);
    const isInsideRoom =
      conversationRoom &&
      Array.from(receiverSockets).some((sid) => conversationRoom.has(sid));

    if (!isInsideRoom) {
      // Online but not viewing this chat — emit to their personal room
      io.to(receiverId.toString()).emit(event, data);
    }
  };

  socket.on("typing", (data) => emitTypingEvent("typing", data));

  socket.on("stop-typing", (data) => emitTypingEvent("stop-typing", data));

  // ─── Disconnect ────────────────────────────────────────────────────────────
  // Only mark the user offline when ALL their sockets have disconnected
  // (i.e. they closed every tab/device), not just one of them.
  socket.on("disconnect", async () => {
    console.log("Socket disconnected", socket.id, "user:", currentUserId);
    try {
      // userSocketMap is updated by socket/index.js AFTER this event fires,
      // so at this point the disconnecting socket is still in the set.
      // size <= 1 means this is the last (or only) socket for the user.
      const sockets = userSocketMap.get(currentUserId);
      const isLastSocket = !sockets || sockets.size <= 1;

      if (!isLastSocket) {
        console.log(
          `User ${currentUserId} still has other sockets open — staying online`
        );
        return;
      }

      await User.findByIdAndUpdate(currentUserId, {
        isOnline: false,
        lastSeen: new Date(),
      });

      const conversations = await Conversation.find({
        members: { $in: [currentUserId] },
      });

      // Collect unique friend IDs across all conversations
      const friendIds = new Set();
      conversations.forEach((conversation) => {
        conversation.members.forEach((memberId) => {
          if (memberId.toString() !== currentUserId) {
            friendIds.add(memberId.toString());
          }
        });
      });

      // Notify every online friend via their personal room
      friendIds.forEach((friendId) => {
        io.to(friendId).emit("user-offline", { userId: currentUserId });
      });
    } catch (error) {
      console.error("Error updating user status on disconnect:", error);
    }
  });
};
