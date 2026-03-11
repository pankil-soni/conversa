import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Copy, Trash2, Check, CheckCheck, CheckCircle2, Circle, Star } from "lucide-react"
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
import { cn } from "@/lib/utils"
import type { Message } from "@/hooks/use-chat"

interface Props {
    message: Message
    isMine: boolean
    isBot?: boolean
    receiverId: string
    myId: string
    onDelete: (messageId: string, scope: "me" | "everyone") => void
    onStar: (messageId: string) => void
    // select-mode props
    selectMode?: boolean
    selected?: boolean
    onToggleSelect?: (id: string) => void
    // highlight / jump-to
    highlighted?: boolean
}

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function SingleMessage({ message, isMine, isBot, receiverId, myId, onDelete, onStar, selectMode, selected, onToggleSelect, highlighted }: Props) {
    const [hovered, setHovered] = useState(false)
    const [copied, setCopied] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)

    const isStarred = message.starredBy?.includes(myId)

    const handleCopy = () => {
        if (message.text) {
            navigator.clipboard.writeText(message.text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        }
    }

    const handleRowClick = () => {
        if (selectMode) onToggleSelect?.(message._id)
    }

    return (
        <>
            <div
                data-message-id={message._id}
                className={cn(
                    "group flex items-end gap-2",
                    isMine ? "ml-auto flex-row-reverse max-w-[75%]" : isBot ? "mr-auto max-w-[85%]" : "mr-auto max-w-[75%]",
                    selectMode && "cursor-pointer",
                    selectMode && selected && (isMine ? "pr-2" : "pl-2"),
                    highlighted && "animate-highlight rounded-xl"
                )}
                onMouseEnter={() => { if (!selectMode) setHovered(true) }}
                onMouseLeave={() => { if (!selectMode) setHovered(false) }}
                onClick={handleRowClick}
            >
                {/* Checkbox indicator in select mode */}
                {selectMode && (
                    <div className="flex items-center shrink-0">
                        {selected
                            ? <CheckCircle2 className="size-5 text-primary" />
                            : <Circle className="size-5 text-muted-foreground" />}
                    </div>
                )}
                {/* Bubble */}
                <div
                    className={cn(
                        "relative px-3.5 py-2 text-sm shadow-sm transition-shadow",
                        isMine
                            ? "bg-primary text-white rounded-2xl rounded-br-sm"
                            : "bg-muted text-foreground rounded-2xl rounded-bl-sm"
                    )}
                >
                {/* Tombstone for soft-deleted messages */}
                    {message.softDeleted ? (
                        <p className="text-xs italic opacity-60 leading-relaxed select-none">
                            This message was deleted
                        </p>
                    ) : (
                        <>
                    {message.imageUrl && (
                        <img
                            src={message.imageUrl}
                            alt="attachment"
                            className="max-w-60 max-h-80 rounded-lg mb-1 object-cover"
                        />
                    )}
                    {message.text && (
                        isBot && !isMine ? (
                            <div className="text-sm leading-relaxed break-all prose prose-sm max-w-none
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
                                    {message.text}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <p className="leading-relaxed whitespace-pre-wrap break-all">{message.text}</p>
                        )
                    )}
                        </>
                    )}
                    <span
                        className={cn(
                            "flex items-center justify-end gap-1 text-[10px] mt-0.5 leading-none",
                            isMine ? "text-white/60" : "text-muted-foreground"
                        )}
                    >
                        {formatTime(message.createdAt)}
                        {isMine && (() => {
                            const seen = message.seenBy?.some((s) => s.user === receiverId)
                            return seen
                                ? <CheckCheck className="size-3 text-sky-300 shrink-0" />
                                : <Check className="size-3 shrink-0" />
                        })()}
                    </span>
                </div>

                {/* Hover action buttons — hidden in select mode or for tombstones (no copy; only hide if mine) */}
                {!selectMode && (
                <div
                    className={cn(
                        "flex items-center gap-1 transition-opacity duration-150",
                        hovered ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                >
                    {/* Star button — always available */}
                    {!message.softDeleted && (
                        <button
                            onClick={() => onStar(message._id)}
                            title={isStarred ? "Unstar" : "Star"}
                            className={cn(
                                "flex items-center justify-center size-7 rounded-full bg-muted hover:bg-accent transition-colors",
                                isStarred && "text-yellow-400"
                            )}
                        >
                            <Star className={cn("size-3.5", isStarred && "fill-yellow-400")} />
                        </button>
                    )}
                    {message.text && !message.softDeleted && (
                        <button
                            onClick={handleCopy}
                            title="Copy"
                            className="flex items-center justify-center size-7 rounded-full bg-muted hover:bg-accent transition-colors"
                        >
                            {copied
                                ? <Check className="size-3.5 text-green-500" />
                                : <Copy className="size-3.5" />
                            }
                        </button>
                    )}
                    {/* Show delete button for: own messages always; received messages always; tombstones only if isMine */}
                    {(!message.softDeleted || isMine) && (
                        <button
                            onClick={() => setDeleteOpen(true)}
                            title="Delete"
                            className="flex items-center justify-center size-7 rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                            <Trash2 className="size-3.5 text-muted-foreground group-hover:text-inherit" />
                        </button>
                    )}
                </div>
                )}
            </div>

            {/* Delete Dialog */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete message</AlertDialogTitle>
                        <AlertDialogDescription>
                            {message.softDeleted
                                ? "This message is already deleted for everyone. Remove it from your view?"
                                : "Choose how you want to delete this message."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-col gap-2">
                        {/* Delete for everyone: only own non-tombstone messages */}
                        {isMine && !message.softDeleted && (
                            <AlertDialogAction
                                className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => { setDeleteOpen(false); onDelete(message._id, "everyone") }}
                            >
                                Delete for everyone
                            </AlertDialogAction>
                        )}
                        {/* Delete for me: own messages + received messages + own tombstones */}
                        <AlertDialogAction
                            className="w-full"
                            onClick={() => { setDeleteOpen(false); onDelete(message._id, "me") }}
                        >
                            Delete for me
                        </AlertDialogAction>
                        <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
