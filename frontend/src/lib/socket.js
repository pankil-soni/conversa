/**
 * Centralized socket.io client.
 *
 * Creates a single socket instance with autoConnect: false.  Components never
 * call `io()` themselves — they import this module and use the helpers below.
 */
import io from "socket.io-client";

const SOCKET_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5500";

const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: { token: localStorage.getItem("token") || "" },
});

/* ─── connection helpers ───────────────────────────────────────────────── */

/** Attach (or replace) the JWT and open the connection if not already open. */
export const connectSocket = (token) => {
  socket.auth = { token };
  if (!socket.connected) socket.connect();
};

/** Close the connection gracefully (e.g. on logout). */
export const disconnectSocket = () => {
  socket.disconnect();
};

/* ─── emitters (every outbound event lives here) ───────────────────────── */

export const emitSetup = () => socket.emit("setup");

export const emitJoinChat = (roomId) =>
  socket.emit("join-chat", { roomId });

export const emitLeaveChat = (roomId) =>
  socket.emit("leave-chat", roomId);

export const emitSendMessage = ({ conversationId, text, imageUrl }) =>
  socket.emit("send-message", { conversationId, text, imageUrl });

export const emitDeleteMessage = ({ messageId, conversationId, deleteFrom }) =>
  socket.emit("delete-message", { messageId, conversationId, deleteFrom });

export const emitTyping = ({ conversationId, typer, receiverId }) =>
  socket.emit("typing", { conversationId, typer, receiverId });

export const emitStopTyping = ({ conversationId, typer, receiverId }) =>
  socket.emit("stop-typing", { conversationId, typer, receiverId });

/* ─── raw socket (needed by useEffect listeners in components) ─────────── */
export default socket;
