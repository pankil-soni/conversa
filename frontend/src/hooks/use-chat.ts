import { useState } from "react";
import type { User } from "./use-auth";
import { useContext } from "react";
import { createContext } from "react";

export type Message = {
    _id: string;
    conversationId: string;
    senderId: string;
    text?: string;
    imageUrl?: string;
    seenBy: Array<{ user: string; seenAt: string }>;
    hiddenFrom: string[];
    softDeleted: boolean;
    starredBy?: string[];
    replyTo?: string | null;
    createdAt: string;
    updatedAt: string;
};

export const useChatProvider = () => {
    const [receiver, setReceiver] = useState<User | null>(null);
    const [messageList, setMessageList] = useState<Message[]>([]);
    const [activeChatId, setActiveChatId] = useState<string>("");

    const [typingConversations, setTypingConversations] = useState<
        Record<string, boolean>
    >({});

    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);

    return {
        receiver,
        setReceiver,
        messageList,
        setMessageList,
        activeChatId,
        setActiveChatId,
        typingConversations,
        setTypingConversations,
        isOtherUserTyping,
        setIsOtherUserTyping,
        isChatLoading,
        setIsChatLoading,
    };
};

type ChatContextType = ReturnType<typeof useChatProvider>;

export const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) throw new Error("useChat must be used inside ChatProvider");
    return context;
};
