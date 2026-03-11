import { useState, useCallback, createContext, useContext } from "react";
import { conversationApi } from "../lib/api";
import type { User } from "./use-auth";

export type unreadCount = {
    userId: string;
    count: number;
}

export type Conversation = {
    _id: string;
    members: User[];
    latestmessage: string;
    unreadCounts: unreadCount[];
    createdAt: string;
    updatedAt: string;
    isPinned: boolean;
};

export const useConversationsProvider = () => {
    const [conversationsList, setConversationsList] = useState<Conversation[]>([]);
    const [originalChatList, setOriginalChatList] = useState<Conversation[]>([]);
    const [aiChatbotConversationId, setAIChatbotConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchConversations = useCallback(async () => {
        setIsLoading(true);

        try {
            const data = await conversationApi.list<Conversation[]>();
            setConversationsList(data);
            setOriginalChatList(data);

            // find the chatbot conversation and set the chatbot id
            const chatbotConversation = data.find((c) => c.members.some((m) => m.isBot));
            if (chatbotConversation) {
                setAIChatbotConversationId(chatbotConversation?._id || null);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        conversationsList,
        setConversationsList,
        originalChatList,
        fetchConversations,
        isLoading,
        aiChatbotConversationId,
    };
};

type ConversationsContextType = ReturnType<typeof useConversationsProvider>;

export const ConversationsContext = createContext<ConversationsContextType | null>(null);

export const useConversations = () => {
    const context = useContext(ConversationsContext);
    if (!context) throw new Error("useConvresations must be used inside ChatProvider");
    return context;
};