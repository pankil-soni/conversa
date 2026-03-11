import { useAuth } from "@/hooks/use-auth";
import { ChatContext, useChatProvider } from "@/hooks/use-chat";
import { useSocketListeners } from "@/hooks/use-socket";
import type { ReactNode } from "react";


export const ChatProvider = ({ children }: { children: ReactNode }) => {
    const chat = useChatProvider();
    const { user } = useAuth();

    useSocketListeners(
        chat.setTypingConversations,
        user?._id
    );

    return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
};