import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"
import socket from "@/lib/socket"
import { useChat } from "@/hooks/use-chat"
import { useConversations, type Conversation } from "@/hooks/use-conversations"
import type { User } from "@/hooks/use-auth"
import type { Message } from "@/hooks/use-chat"
import notificationSound from "@/assets/newmessage.wav"
import { LS_NOTIF_BANNERS, LS_NOTIF_SOUND } from "@/pages/UserProfile"

interface NotificationPayload {
    message: Message
    sender: User
    conversation: Conversation
}

function initials(name: string) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

export default function NotificationListener() {
    const navigate = useNavigate()
    const { activeChatId } = useChat()
    const { setConversationsList } = useConversations()

    // Keep a ref so the socket handler always sees the latest activeChatId
    const activeChatIdRef = useRef(activeChatId)
    useEffect(() => {
        activeChatIdRef.current = activeChatId
    }, [activeChatId])

    useEffect(() => {
        const audio = new Audio(notificationSound)
        audio.preload = "auto"

        const onNotification = (data: NotificationPayload) => {
            const { message, sender } = data
            const convId = message.conversationId

            // ── update conversationsList: bump to top + increment unread ───────────────
            setConversationsList((prev) => {
                const idx = prev.findIndex((c) => c._id === convId)

                if (idx === -1) {
                    // Brand-new conversation — the receiver hasn't seen it yet.
                    // The backend already incremented unreadCounts in memory before
                    // emitting, so use the conversation payload as-is.
                    const newConv: Conversation = {
                        ...data.conversation,
                        latestmessage: message.text ?? "sent an image",
                        updatedAt: new Date().toISOString(),
                    }
                    return [newConv, ...prev]
                }

                const updated = prev.map((c, i) => {
                    if (i !== idx) return c
                    return {
                        ...c,
                        latestmessage: message.text ?? "sent an image",
                        updatedAt: new Date().toISOString(),
                        unreadCounts: c.unreadCounts.map((u) =>
                            u.userId !== sender._id
                                ? { ...u, count: u.count + 1 }
                                : u
                        ),
                    }
                })

                // Keep pinned conversations first, then sort the rest by updatedAt
                return [
                    ...updated.filter((c) => c.isPinned),
                    ...updated.filter((c) => !c.isPinned).sort(
                        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    ),
                ]
            })

            // ── skip toast + sound if the user is already viewing this chat ──
            if (activeChatIdRef.current === convId) return

            // ── play sound (if enabled) ────────────────────────────────────────
            const soundEnabled = localStorage.getItem(LS_NOTIF_SOUND) !== "false"
            if (soundEnabled) {
                audio.currentTime = 0
                audio.play().catch(() => {
                    // autoplay blocked — silently ignore
                })
            }

            // ── show toast notification (if enabled) ──────────────────────────
            const bannersEnabled = localStorage.getItem(LS_NOTIF_BANNERS) !== "false"
            if (!bannersEnabled) return

            toast.custom(
                (t) => (
                    <div className="flex items-center gap-3 bg-background border rounded-xl shadow-lg px-4 py-3 w-85 max-w-[95vw]">
                        <Avatar className="size-10 shrink-0">
                            <AvatarImage src={sender.profilePic} alt={sender.name} />
                            <AvatarFallback className="bg-primary/15  text-xs font-semibold">
                                {sender.isBot ? <Bot className="size-4" /> : initials(sender.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-tight truncate">{sender.name}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {message.text ?? "sent an image"}
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant="default"
                            className="shrink-0 h-8 px-3 text-xs"
                            onClick={() => {
                                toast.dismiss(t)
                                navigate(`/user/conversations/${convId}`)
                            }}
                        >
                            Open
                        </Button>
                    </div>
                ),
                {
                    position: "top-right",
                    duration: 5000,
                }
            )
        }

        socket.on("new-message-notification", onNotification)
        return () => {
            socket.off("new-message-notification", onNotification)
        }
    }, [navigate, setConversationsList])

    return null
}
