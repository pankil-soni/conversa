import { AuthContext, useAuthProvider } from "@/hooks/use-auth";
import type { ReactNode } from "react";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const value = useAuthProvider();
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};