import { useEffect, useRef, useCallback, useState, useMemo } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/hooks/use-auth"
import { useChat, type Message } from "@/hooks/use-chat"
import { useConversations } from "@/hooks/use-conversations"
import { conversationApi, messageApi, userApi } from "@/lib/api"
import socket, { emitJoinChat, emitLeaveChat, emitDeleteMessage } from "@/lib/socket"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import ConversationDetailHeader from "@/components/dashboard/ConversationDetailHeader"
import SingleMessage from "@/components/dashboard/SingleMessage"
import MessageInput from "@/components/dashboard/MessageInput"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import type { Conversation } from "@/hooks/use-conversations"
import type { User } from "@/hooks/use-auth"

/* ─── CSS typing indicator ─────────────────────────────────────────────── */
function TypingIndicator() {
    return (
        <div className="flex items-end gap-2 max-w-[75%] mr-auto">
            <div className="px-4 py-3 bg-muted rounded-2xl rounded-bl-sm">
                <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ─── streaming bot bubble ──────────────────────────────────────────────── */
function StreamingBotBubble({ text }: { text: string }) {
    return (
        <div className="flex items-end gap-2 max-w-[85%] mr-auto">
            <div className="px-3.5 py-2 text-sm shadow-sm bg-muted text-foreground rounded-2xl rounded-bl-sm">
                <div className="text-sm leading-relaxed prose prose-sm max-w-none
                        prose-p:my-1 prose-p:leading-relaxed
                        prose-headings:font-semibold prose-headings:my-1
                        prose-h1:text-base prose-h2:text-sm prose-h3:text-sm
                        prose-ul:my-1 prose-ul:pl-4
                        prose-ol:my-1 prose-ol:pl-4
                        prose-li:my-0
                        prose-pre:bg-black/10 prose-pre:rounded prose-pre:px-2 prose-pre:py-1 prose-pre:text-xs prose-pre:my-1
                        prose-code:bg-black/10 prose-code:rounded prose-code:px-1 prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                        prose-blockquote:border-l-2 prose-blockquote:pl-2 prose-blockquote:my-1 prose-blockquote:text-muted-foreground
                        prose-strong:font-semibold
                        prose-a: prose-a:underline
                        dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {text}
                    </ReactMarkdown>
                </div>
                <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-muted-foreground/60 align-middle animate-pulse rounded-sm" />
            </div>
        </div>
    )
}

/* ─── message list skeleton ─────────────────────────────────────────────── */
function MessagesSkeleton() {
    return (
        <div className="flex flex-col gap-3 p-4">
            {[60, 40, 75, 35, 55].map((w, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
                    <Skeleton className={`h-9 rounded-2xl`} style={{ width: `${w}%` }} />
                </div>
            ))}
        </div>
    )
}

/* ─── date divider ──────────────────────────────────────────────────────── */
function DateDivider({ date }: { date: string }) {
    const label = (() => {
        const d = new Date(date)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        if (d.toDateString() === today.toDateString()) return "Today"
        if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
        return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    })()
    return (
        <div className="flex items-center gap-3 py-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium px-2">{label}</span>
            <div className="flex-1 h-px bg-border" />
        </div>
    )
}

/* ─── main page ─────────────────────────────────────────────────────────── */
export default function ConversationDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user } = useAuth()
    const {
        receiver, setReceiver,
        messageList, setMessageList,
        setActiveChatId,
        typingConversations,
        isOtherUserTyping, setIsOtherUserTyping,
        isChatLoading, setIsChatLoading,
    } = useChat()
    const { setConversationsList } = useConversations()
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const isInitialLoadRef = useRef(true)
    // Tracks whether the first scroll (to bottom or to highlight) has been done
    const hasInitiallyScrolledRef = useRef(false)
    // Tracks the last known message count to detect genuine additions vs. in-place updates
    const prevMessageCountRef = useRef(0)
    // Buffer messages-seen events that arrive before the message list is populated
    const pendingSeenRef = useRef<{ seenBy: string; seenAt: string }[]>([])

    // Streaming bot response state
    const [streamingBot, setStreamingBot] = useState<{ conversationId: string; tempId: string; text: string } | null>(null)

    // Highlighted message (jump-to from starred messages)
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)

    // Block status
    const [fetchedBlockStatus, setBlockStatus] = useState<{ iBlockedThem: boolean; theyBlockedMe: boolean }>({ iBlockedThem: false, theyBlockedMe: false })
    // When receiver is absent or a bot, always treat block status as cleared so we
    // don't have to call setState synchronously inside the effect (which triggers
    // cascading renders and violates react-hooks/set-state-in-effect).
    const blockStatus = useMemo(
        () => (!receiver || receiver.isBot ? { iBlockedThem: false, theyBlockedMe: false } : fetchedBlockStatus),
        [receiver, fetchedBlockStatus]
    )

    // ── fetch block status whenever the receiver changes ─────────────────
    useEffect(() => {
        if (!receiver || receiver.isBot) return
        userApi.getBlockStatus(receiver._id)
            .then((status) => setBlockStatus(status))
            .catch(() => {/* silent — non-critical */})
    }, [receiver?._id]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── block / unblock handlers ──────────────────────────────────────────
    const handleBlock = useCallback(async () => {
        if (!receiver) return
        try {
            await userApi.blockUser(receiver._id)
            setBlockStatus((prev) => ({ ...prev, iBlockedThem: true }))
            toast.success(`${receiver.name} has been blocked`)
        } catch {
            toast.error("Failed to block user")
        }
    }, [receiver])

    const handleUnblock = useCallback(async () => {
        if (!receiver) return
        try {
            await userApi.unblockUser(receiver._id)
            setBlockStatus((prev) => ({ ...prev, iBlockedThem: false }))
            toast.success(`${receiver.name} has been unblocked`)
        } catch {
            toast.error("Failed to unblock user")
        }
    }, [receiver])

    // ── socket: message-blocked ───────────────────────────────────────────
    useEffect(() => {
        const onBlocked = ({ conversationId: cid }: { conversationId: string }) => {
            if (cid !== id) return
            toast.error("Message not delivered — you can't send messages to this user.")
        }
        socket.on("message-blocked", onBlocked)
        return () => { socket.off("message-blocked", onBlocked) }
    }, [id])

    // ── select mode state ─────────────────────────────────────────────────
    const [selectMode, setSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

    const enterSelectMode = useCallback(() => {
        setSelectedIds(new Set())
        setSelectMode(true)
    }, [])

    const exitSelectMode = useCallback(() => {
        setSelectMode(false)
        setSelectedIds(new Set())
    }, [])

    const handleToggleSelect = useCallback((msgId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(msgId)) next.delete(msgId)
            else next.add(msgId)
            return next
        })
    }, [])

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        // Use rAF so the scroll runs after the browser has painted the new layout,
        // preventing the "last message half-visible" issue.
        requestAnimationFrame(() => {
            const el = scrollAreaRef.current
            if (!el) return
            if (behavior === "instant") {
                el.scrollTop = el.scrollHeight
            } else {
                el.scrollTo({ top: el.scrollHeight, behavior })
            }
        })
    }, [])

    // ── load conversation + messages ────────────────────────────────────
    useEffect(() => {
        if (!id || !user) return

        setIsChatLoading(true)
        setMessageList([])
        setActiveChatId(id)
        pendingSeenRef.current = []
        isInitialLoadRef.current = true
        hasInitiallyScrolledRef.current = false
        prevMessageCountRef.current = 0

        Promise.all([
            conversationApi.get<Conversation>(id),
            messageApi.list(id) as Promise<Message[]>,
        ])
            .then(([conv, msgs]) => {
                const other = conv.members.find((m: User) => m._id !== user._id)
                setReceiver(other ?? null)
                // Apply any messages-seen events that arrived before the list was ready
                const pending = pendingSeenRef.current
                const mergedMsgs = pending.length === 0 ? msgs : msgs.map((m) => {
                    const applicable = pending.filter(
                        (p) => !m.seenBy?.some((s) => s.user === p.seenBy)
                    )
                    if (applicable.length === 0) return m
                    return {
                        ...m,
                        seenBy: [
                            ...(m.seenBy ?? []),
                            ...applicable.map((p) => ({ user: p.seenBy, seenAt: p.seenAt })),
                        ],
                    }
                })
                setMessageList(mergedMsgs)
                // reset unread count in sidebar list
                setConversationsList((prev) =>
                    prev.map((c) =>
                        c._id === id
                            ? {
                                ...c,
                                unreadCounts: c.unreadCounts.map((u) =>
                                    u.userId === user._id ? { ...u, count: 0 } : u
                                ),
                            }
                            : c
                    )
                )
            })
            .catch(() => {
                toast.error("Failed to load conversation.")
                navigate("/user/conversations", { replace: true })
            })
            .finally(() => setIsChatLoading(false))
    }, [id, user]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── scroll/highlight when opened from starred messages ─────────────────
    useEffect(() => {
        const targetId = searchParams.get("highlight")
        if (!targetId || messageList.length === 0) return
        // Give the DOM a moment to render, then scroll
        requestAnimationFrame(() => {
            const el = document.querySelector(`[data-message-id="${targetId}"]`) as HTMLElement | null
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" })
                setHighlightedMessageId(targetId)
                // Remove highlight after animation completes
                setTimeout(() => setHighlightedMessageId(null), 2200)
            }
        })
    }, [searchParams, messageList])

    // ── always scroll to bottom when messages change ─────────────────────
    useEffect(() => {
        if (messageList.length === 0) return

        const prevCount = prevMessageCountRef.current
        const currentCount = messageList.length
        prevMessageCountRef.current = currentCount

        // In-place update (seenBy, softDeleted, starredBy, etc.) — don't scroll
        if (currentCount === prevCount) return

        if (!hasInitiallyScrolledRef.current) {
            // First batch: skip auto-scroll if we're jumping to a highlighted message
            hasInitiallyScrolledRef.current = true
            isInitialLoadRef.current = false
            if (!searchParams.get("highlight")) {
                scrollToBottom("instant")
            }
            return
        }
        // A new message was added — scroll to bottom
        scrollToBottom("smooth")
    }, [messageList, scrollToBottom]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── join / leave socket room ─────────────────────────────────────────
    useEffect(() => {
        if (!id) return
        emitJoinChat(id)
        return () => {
            emitLeaveChat(id)
            setActiveChatId("")
            setReceiver(null)
        }
    }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

    // ── socket: receive-message ─────────────────────────────────────────
    useEffect(() => {
        const onMessage = (msg: Message) => {
            if (msg.conversationId !== id) return
            setMessageList((prev) => [...prev, msg])
            // update sidebar latest message and bump to top
            setConversationsList((prev) => {
                const idx = prev.findIndex((c) => c._id === id)
                if (idx === -1) return prev
                const updated = prev.map((c, i) =>
                    i === idx
                        ? { ...c, latestmessage: msg.text ?? "sent an image", updatedAt: msg.createdAt }
                        : c
                )
                // Keep pinned conversations first, then sort the rest by updatedAt
                return [
                    ...updated.filter((c) => c.isPinned),
                    ...updated.filter((c) => !c.isPinned).sort(
                        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    ),
                ]
            })
            // scroll is handled by the messageList effect
        }
        socket.on("receive-message", onMessage)
        return () => { socket.off("receive-message", onMessage) }
    }, [id, scrollToBottom, setConversationsList, setMessageList])

    // ── socket: bot streaming (bot-chunk / bot-done) ──────────────────────
    useEffect(() => {
        const onBotChunk = ({ conversationId: cid, tempId, chunk }: { conversationId: string; tempId: string; chunk: string }) => {
            if (cid !== id) return
            setStreamingBot((prev) =>
                prev?.tempId === tempId
                    ? { ...prev, text: prev.text + chunk }
                    : { conversationId: cid, tempId, text: chunk }
            )
            scrollToBottom()
        }

        const onBotDone = ({ conversationId: cid, message }: { conversationId: string; tempId: string; message: Message }) => {
            if (cid !== id) return
            setStreamingBot(null)
            setMessageList((prev) => [...prev, message])
        }

        const onBotError = ({ conversationId: cid, userMessageId }: { conversationId: string; userMessageId: string | null }) => {
            if (cid !== id) return
            setStreamingBot(null)
            if (userMessageId) {
                setMessageList((prev) => prev.filter((m) => m._id !== userMessageId))
            }
            toast.error("AI is currently unavailable. Please try again later.")
        }

        socket.on("bot-chunk", onBotChunk)
        socket.on("bot-done", onBotDone)
        socket.on("bot-error", onBotError)
        return () => {
            socket.off("bot-chunk", onBotChunk)
            socket.off("bot-done", onBotDone)
            socket.off("bot-error", onBotError)
        }
    }, [id, scrollToBottom, setMessageList])

    // ── socket: messages-seen (receiver opened the chat) ─────────────────
    useEffect(() => {
        const onSeen = ({ conversationId, seenBy, seenAt }: { conversationId: string; seenBy: string; seenAt: string }) => {
            if (conversationId !== id) return
            // Buffer this update; setMessageList functional form handles both
            // the populated and the still-loading case.
            pendingSeenRef.current = [
                ...pendingSeenRef.current.filter((p) => p.seenBy !== seenBy),
                { seenBy, seenAt },
            ]
            setMessageList((prev) =>
                prev.map((m) => {
                    // already has a seenBy entry for this user — skip
                    if (m.seenBy?.some((s) => s.user === seenBy)) return m
                    return { ...m, seenBy: [...(m.seenBy ?? []), { user: seenBy, seenAt }] }
                })
            )
        }
        socket.on("messages-seen", onSeen)
        return () => { socket.off("messages-seen", onSeen) }
    }, [id, setMessageList])

    // ── socket: receiver online/offline status ───────────────────────────
    useEffect(() => {
        const onOnline = ({ userId }: { userId: string }) => {
            setReceiver((prev) => prev?._id === userId ? { ...prev, isOnline: true } : prev)
        }
        const onOffline = ({ userId }: { userId: string }) => {
            setReceiver((prev) =>
                prev?._id === userId ? { ...prev, isOnline: false, lastSeen: new Date() } : prev
            )
        }
        socket.on("user-online", onOnline)
        socket.on("user-offline", onOffline)
        return () => {
            socket.off("user-online", onOnline)
            socket.off("user-offline", onOffline)
        }
    }, [setReceiver])

    // ── socket: message-deleted (soft-delete for everyone OR me-only) ─────────
    useEffect(() => {
        const onDeleted = (data: { messageId: string; conversationId: string; softDeleted: boolean; latestmessage?: string }) => {
            if (data.conversationId !== id) return
            if (data.softDeleted) {
                setMessageList((prev) =>
                    prev.map((m) =>
                        m._id === data.messageId
                            ? { ...m, softDeleted: true, text: undefined, imageUrl: undefined }
                            : m
                    )
                )
            }
            // Update the sidebar conversation preview with the new latest message text
            if (data.latestmessage !== undefined) {
                setConversationsList((prev) =>
                    prev.map((c) =>
                        c._id === data.conversationId
                            ? { ...c, latestmessage: data.latestmessage! }
                            : c
                    )
                )
            }
        }
        socket.on("message-deleted", onDeleted)
        return () => { socket.off("message-deleted", onDeleted) }
    }, [id, setMessageList, setConversationsList])

    // ── sync typing indicator ────────────────────────────────────────────
    useEffect(() => {
        if (!id) return
        const typing = !!typingConversations[id]
        setIsOtherUserTyping(typing)
    }, [typingConversations, id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Scroll after the typing indicator is actually rendered
    useEffect(() => {
        if (isOtherUserTyping) scrollToBottom()
    }, [isOtherUserTyping, scrollToBottom])

    // ── delete handler ───────────────────────────────────────────────────
    const handleDelete = useCallback(
        async (messageId: string, scope: "me" | "everyone") => {
            if (!user || !id) return
            try {
                await messageApi.delete(messageId, scope)
                if (scope === "me") {
                    // Hard-delete for self: remove from local list immediately
                    const newList = messageList.filter((m) => m._id !== messageId)
                    setMessageList(newList)
                    // Update the sidebar preview for this user only
                    const latestMsg = newList[newList.length - 1]
                    const newPreview = latestMsg
                        ? (latestMsg.softDeleted ? "This message was deleted" : (latestMsg.text || "sent an image"))
                        : ""
                    setConversationsList((prev) =>
                        prev.map((c) => c._id === id ? { ...c, latestmessage: newPreview } : c)
                    )
                } else {
                    // Soft-delete for everyone: emit socket so other participant sees tombstone
                    emitDeleteMessage({ messageId, conversationId: id, scope })
                    // Update our own view immediately (we won't receive our own socket echo)
                    const newList = messageList.map((m) =>
                        m._id === messageId
                            ? { ...m, softDeleted: true, text: undefined, imageUrl: undefined }
                            : m
                    )
                    setMessageList(newList)
                    // Update sidebar preview immediately for the sender
                    const latestMsg = newList[newList.length - 1]
                    const newPreview = latestMsg
                        ? (latestMsg.softDeleted ? "This message was deleted" : (latestMsg.text || "sent an image"))
                        : ""
                    setConversationsList((prev) =>
                        prev.map((c) => c._id === id ? { ...c, latestmessage: newPreview } : c)
                    )
                }
            } catch {
                toast.error("Failed to delete message.")
            }
        },
        [user, id, messageList, setMessageList, setConversationsList]
    )

    // ── star handler ──────────────────────────────────────────────────────
    const handleStar = useCallback(
        async (messageId: string) => {
            try {
                const { isStarred, starredBy } = await messageApi.toggleStar(messageId)
                setMessageList((prev) =>
                    prev.map((m) => m._id === messageId ? { ...m, starredBy } : m)
                )
                toast.success(isStarred ? "Message starred" : "Message unstarred")
            } catch {
                toast.error("Failed to update star.")
            }
        },
        [setMessageList]
    )

    // ── clear chat handler ────────────────────────────────────────────────
    const handleClearChat = useCallback(async () => {
        if (!id) return
        try {
            await messageApi.clearChat(id)
            setMessageList([])
        } catch {
            toast.error("Failed to clear chat.")
        }
    }, [id, setMessageList])

    // ── bulk delete selected handler ─────────────────────────────────
    const handleBulkDelete = useCallback(async () => {
        if (selectedIds.size === 0) return
        const ids = Array.from(selectedIds)
        try {
            await messageApi.bulkDelete(ids)
            setMessageList((prev) => prev.filter((m) => !ids.includes(m._id)))
            exitSelectMode()
        } catch {
            toast.error("Failed to delete selected messages.")
        }
    }, [selectedIds, exitSelectMode, setMessageList])

    // ── group messages by date for dividers ─────────────────────────────
    const grouped: Array<Message | string> = []
    let lastDate = ""
    for (const msg of messageList) {
        const d = new Date(msg.createdAt).toDateString()
        if (d !== lastDate) {
            grouped.push(msg.createdAt) // date divider sentinel
            lastDate = d
        }
        grouped.push(msg)
    }

    if (!id) return null

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <ConversationDetailHeader
                receiver={receiver}
                onClearChat={handleClearChat}
                onSelectMode={enterSelectMode}
                isBlockedByMe={blockStatus.iBlockedThem}
                onBlock={handleBlock}
                onUnblock={handleUnblock}
            />

            {/* Messages */}
            <div
                ref={scrollAreaRef}
                className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5"
            >
                {isChatLoading ? (
                    <MessagesSkeleton />
                ) : messageList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <p className="text-sm">No messages yet. Say hi! 👋</p>
                    </div>
                ) : (
                    grouped.map((item, idx) => {
                        if (typeof item === "string") {
                            return <DateDivider key={`div-${idx}`} date={item} />
                        }
                        const msg = item as Message
                        const isMine = msg.senderId === user?._id
                        return (
                            <SingleMessage
                                key={msg._id}
                                message={msg}
                                isMine={isMine}
                                isBot={receiver?.isBot && !isMine}
                                receiverId={receiver?._id ?? ""}
                                myId={user?._id ?? ""}
                                onDelete={handleDelete}
                                onStar={handleStar}
                                selectMode={selectMode}
                                selected={selectedIds.has(msg._id)}
                                onToggleSelect={handleToggleSelect}
                                highlighted={highlightedMessageId === msg._id}
                            />
                        )
                    })
                )}

                {/* Typing indicator — hidden once bot starts streaming */}
                {isOtherUserTyping && !(streamingBot?.conversationId === id) && <TypingIndicator />}

                {/* Streaming bot response bubble */}
                {streamingBot?.conversationId === id && <StreamingBotBubble text={streamingBot.text} />}


            </div>

            {/* Input — hidden in select mode; replaced by bulk-action bar */}
            {user && !selectMode && (
                <MessageInput
                    conversationId={id}
                    myId={user._id}
                    receiverId={receiver?._id ?? ""}
                    isReceiverBot={receiver?.isBot ?? false}
                    isBlocked={blockStatus.iBlockedThem}
                    blockedByThem={blockStatus.theyBlockedMe}
                />
            )}

            {/* Bulk-delete action bar */}
            {selectMode && (
                <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-t bg-background">
                    <Button variant="outline" size="sm" onClick={exitSelectMode} className="gap-1.5">
                        Cancel
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {selectedIds.size} selected
                    </span>
                    <Button
                        variant="destructive"
                        size="sm"
                        disabled={selectedIds.size === 0}
                        onClick={() => setBulkDeleteOpen(true)}
                        className="gap-1.5"
                    >
                        <Trash2 className="size-4" />
                        Delete
                    </Button>
                </div>
            )}

            {/* Bulk-delete confirmation dialog */}
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedIds.size} message{selectedIds.size !== 1 ? "s" : ""}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The selected {selectedIds.size !== 1 ? "messages" : "message"} will be removed from your view. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => { setBulkDeleteOpen(false); handleBulkDelete() }}
                        >
                            Delete for me
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
