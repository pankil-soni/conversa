const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: function () {
        return !this.imageUrl;
      },
    },
    imageUrl: {
      type: String,
      required: function () {
        return !this.text;
      },
    },
    seenBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        seenAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // hiddenFrom: hard-deleted for these users — skipped entirely in queries
    hiddenFrom: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // softDeleted: message shows as "This message was deleted" tombstone for everyone
    softDeleted: { type: Boolean, default: false },
    // starredBy: users who have starred this message
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "Message",
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", MessageSchema);
module.exports = Message;
