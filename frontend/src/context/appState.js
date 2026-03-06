import { useState, useEffect, useCallback } from "react";
import chatContext from "./chatContext";
import socket, { connectSocket, emitSetup } from "../lib/socket";
import { authApi, conversationApi } from "../lib/api";

/**
 * Global application state provider.
 *
 * Holds auth state, the current user, conversation list, active chat state, and
 * the socket reference.  Every piece of "shared" data that more than one
 * component needs lives here.
 */
const ChatState = ({ children }) => {
  /* ─── auth ───────────────────────────────────────────────────────────── */
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("token")
  );
  const [user, setUser] = useState({});

  /* ─── chat state ─────────────────────────────────────────────────────── */
  const [receiver, setReceiver] = useState({});
  const [messageList, setMessageList] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [myChatList, setMyChatList] = useState([]);
  const [originalChatList, setOriginalChatList] = useState([]);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingConversations, setTypingConversations] = useState({});
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /* ─── fetch conversation list ────────────────────────────────────────── */
  const fetchConversations = useCallback(async () => {
    try {
      const data = await conversationApi.list();
      setMyChatList(data);
      setOriginalChatList(data);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ─── bootstrap: validate token → fetch user → connect socket ────────── */
  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await authApi.getMe();
        setUser(data);
        setIsAuthenticated(true);
        connectSocket(token);
        emitSetup();
        fetchConversations();
      } catch {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setUser({});
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── global socket listeners (online / offline) ─────────────────────── */
  useEffect(() => {
    const onOnline = () =>
      setReceiver((prev) => ({ ...prev, isOnline: true }));
    const onOffline = () =>
      setReceiver((prev) => ({
        ...prev,
        isOnline: false,
        lastSeen: new Date().toISOString(),
      }));

    socket.on("receiver-online", onOnline);
    socket.on("receiver-offline", onOffline);

    return () => {
      socket.off("receiver-online", onOnline);
      socket.off("receiver-offline", onOffline);
    };
  }, []);

  /* ─── global typing listeners (for chat-list indicator) ──────────────── */
  useEffect(() => {
    const onTyping = (data) => {
      // Ignore events we ourselves emitted
      if (!data.conversationId || data.typer === user._id) return;
      setTypingConversations((prev) => ({ ...prev, [data.conversationId]: true }));
    };
    const onStopTyping = (data) => {
      if (!data.conversationId) return;
      setTypingConversations((prev) => {
        const next = { ...prev };
        delete next[data.conversationId];
        return next;
      });
    };

    socket.on("typing", onTyping);
    socket.on("stop-typing", onStopTyping);

    return () => {
      socket.off("typing", onTyping);
      socket.off("stop-typing", onStopTyping);
    };
  }, [user._id]);

  /* ─── context value ──────────────────────────────────────────────────── */
  const value = {
    isAuthenticated,
    setIsAuthenticated,
    user,
    setUser,
    receiver,
    setReceiver,
    messageList,
    setMessageList,
    activeChatId,
    setActiveChatId,
    myChatList,
    setMyChatList,
    originalChatList,
    fetchConversations,
    socket,
    isOtherUserTyping,
    setIsOtherUserTyping,
    typingConversations,
    isChatLoading,
    setIsChatLoading,
    isLoading,
    setIsLoading,
  };

  return (
    <chatContext.Provider value={value}>{children}</chatContext.Provider>
  );
};

export default ChatState;

