import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Star, ArrowRight, ImageIcon } from "lucide-react"
import { messageApi } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface StarredMessage {
    _id: string
    conversationId: {
        _id: string
        members: Array<{
            _id: string
            name: string
            profilePic: string
            email: string
            isBot: boolean
        }>
    } | string
    senderId: string
    text?: string
    imageUrl?: string
    starredBy: string[]
    softDeleted: boolean
    createdAt: string
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    if (d.toDateString() === yesterday.toDateString()) {
        return "Yesterday"
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function initials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

/* ─── StarredMessageCard ─────────────────────────────────────────────────── */
function StarredMessageCard({
    msg,
    myId,
    onNavigate,
    onUnstar,
}: {
    msg: StarredMessage
    myId: string
    onNavigate: (conversationId: string, messageId: string) => void
    onUnstar: (messageId: string) => void
}) {
    const conv = typeof msg.conversationId === "object" ? msg.conversationId : null
    const peer = conv?.members?.find((m) => m._id !== myId) ?? null
    const isMine = msg.senderId === myId

    const conversationId = conv?._id ?? (typeof msg.conversationId === "string" ? msg.conversationId : "")

    return (
        <div className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-accent/40 transition-colors group">
            {/* Avatar */}
            <Avatar className="size-9 shrink-0 rounded-full">
                <AvatarImage src={peer?.profilePic} alt={peer?.name} />
                <AvatarFallback className="text-xs font-semibold bg-primary/20">
                    {peer ? initials(peer.name) : "?"}
                </AvatarFallback>
            </Avatar>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-medium truncate">
                        {isMine ? "You" : (peer?.name ?? "Unknown")}
                    </span>
                    {peer && !isMine && (
                        <span className="text-xs text-muted-foreground truncate">
                            · in chat with {peer.isBot ? "AI Chatbot" : peer.name}
                        </span>
                    )}
                    {isMine && peer && (
                        <span className="text-xs text-muted-foreground truncate">
                            · to {peer.isBot ? "AI Chatbot" : peer.name}
                        </span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                        {formatDate(msg.createdAt)}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {msg.imageUrl && !msg.text && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground italic">
                            <ImageIcon className="size-3.5 shrink-0" />
                            Photo
                        </span>
                    )}
                    {msg.text && (
                        <p className="text-sm text-foreground line-clamp-2 wrap-break-word">
                            {msg.imageUrl && <ImageIcon className="inline size-3.5 mr-1 shrink-0" />}
                            {msg.text}
                        </p>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className={cn("flex items-center gap-1 shrink-0")}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 text-muted-foreground hover:text-destructive"
                    title="Unstar"
                    onClick={(e) => { e.stopPropagation(); onUnstar(msg._id) }}
                >
                    <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 text-muted-foreground hover:text-primary"
                    title="Go to message"
                    onClick={() => onNavigate(conversationId, msg._id)}
                >
                    <ArrowRight className="size-3.5" />
                </Button>
            </div>
        </div>
    )
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function StarredMessages() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [messages, setMessages] = useState<StarredMessage[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        messageApi
            .getStarred<StarredMessage[]>()
            .then((data) => setMessages(data))
            .catch(() => toast.error("Failed to load starred messages."))
            .finally(() => setIsLoading(false))
    }, [])

    const handleNavigate = useCallback((conversationId: string, messageId: string) => {
        navigate(`/user/conversations/${conversationId}?highlight=${messageId}`)
    }, [navigate])

    const handleUnstar = useCallback(async (messageId: string) => {
        try {
            await messageApi.toggleStar(messageId)
            setMessages((prev) => prev.filter((m) => m._id !== messageId))
            toast.success("Message unstarred")
        } catch {
            toast.error("Failed to unstar message.")
        }
    }, [])

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
                <Star className="size-5 text-yellow-400 fill-yellow-400 shrink-0" />
                <div>
                    <h1 className="text-base font-semibold leading-tight">Starred Messages</h1>
                    <p className="text-xs text-muted-foreground">Messages you've saved for later</p>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto thin-scrollbar px-3 py-3 space-y-2">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3 p-3">
                            <Skeleton className="size-9 rounded-full shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-3 w-1/3" />
                                <Skeleton className="h-3 w-2/3" />
                            </div>
                        </div>
                    ))
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3 py-16">
                        <Star className="size-10 text-muted-foreground/30" />
                        <p className="text-sm text-center">No starred messages yet.<br />Hover a message and click ⭐ to save it.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <StarredMessageCard
                            key={msg._id}
                            msg={msg}
                            myId={user?._id ?? ""}
                            onNavigate={handleNavigate}
                            onUnstar={handleUnstar}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
