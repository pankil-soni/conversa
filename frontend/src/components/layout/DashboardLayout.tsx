import { useEffect } from "react"
import { Outlet, useNavigate, useParams } from "react-router-dom"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import DashboardSidebar from "./DashboardSidebar"
import { useAuth } from "@/hooks/use-auth"
import { ConversationsProvider } from "@/context/conversations-provider"
import { ChatProvider } from "@/context/chat-provider"
import NotificationListener from "@/components/NotificationListener"

export default function DashboardLayout() {
    const { user, isUserLoading } = useAuth()
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()

    useEffect(() => {
        if (!isUserLoading && !user) {
            navigate("/login", { replace: true })
        }
    }, [user, isUserLoading, navigate])

    if (isUserLoading || !user) return null

    return (
        <ConversationsProvider>
            <ChatProvider>
                <NotificationListener />
                {/* height: 100svh is explicit so h-full chains inside resolve correctly */}
                <SidebarProvider defaultOpen={false} style={{ height: "100dvh", overflow: "hidden" }}>
                    <DashboardSidebar />
                    <SidebarInset className="overflow-hidden flex flex-col">
                        <SidebarTrigger className={`m-1 ${id ? "hidden" : "md:hidden"}`} />
                        {/* Page content — flex-1 + min-h-0 so overflow-y-auto works in children */}
                        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
                            <Outlet />
                        </div>
                    </SidebarInset>
                </SidebarProvider>
            </ChatProvider>
        </ConversationsProvider>
    )
}