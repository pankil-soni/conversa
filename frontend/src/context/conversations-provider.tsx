
import { ConversationsContext, useConversationsProvider } from "@/hooks/use-conversations";
import type { ReactNode } from "react";

export const ConversationsProvider = ({ children }: { children: ReactNode }) => {
    const value = useConversationsProvider();
    return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>;
};