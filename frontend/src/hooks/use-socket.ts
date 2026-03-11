import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import socket from "../lib/socket";

type TypingConversations = Record<string, boolean>;

interface TypingData {
  conversationId: string;
  typer: string;
}

export const useSocketListeners = (
  setTypingConversations: Dispatch<SetStateAction<TypingConversations>>,
  userId?: string
) => {
  useEffect(() => {
    const onTyping = (data: TypingData) => {
      if (!data.conversationId || data.typer === userId) return;

      setTypingConversations((prev) => ({
        ...prev,
        [data.conversationId]: true,
      }));
    };

    const onStopTyping = (data: TypingData) => {
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
  }, [userId, setTypingConversations]);
};