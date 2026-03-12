import { useState, useRef, useCallback, useEffect } from "react"
import { ArrowRight, ImagePlus, ShieldX, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { emitSendMessage, emitTyping, emitStopTyping } from "@/lib/socket"
import { userApi } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Message } from "@/hooks/use-chat"

interface Props {
    conversationId: string
    myId: string
    receiverId: string
    receiverName?: string
    isReceiverBot?: boolean
    isBlocked?: boolean
    blockedByThem?: boolean
    replyToMessage?: Message | null
    onCancelReply?: () => void
}

const STOP_TYPING_DELAY = 1500

export default function MessageInput({ conversationId, myId, receiverId, receiverName, isReceiverBot, isBlocked, blockedByThem, replyToMessage, onCancelReply }: Props) {
    const [text, setText] = useState("")
    const [uploading, setUploading] = useState(false)
    const [imageDialogOpen, setImageDialogOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [caption, setCaption] = useState("")

    const fileInputRef = useRef<HTMLInputElement>(null)
    const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isTypingRef = useRef(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const emitStopTypingNow = useCallback(() => {
        if (isTypingRef.current) {
            isTypingRef.current = false
            emitStopTyping({ conversationId, typer: myId, receiverId })
        }
    }, [conversationId, myId, receiverId])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearTimeout(stopTypingTimer.current!)
            emitStopTypingNow()
        }
    }, [emitStopTypingNow])

    // Auto-focus when the conversation changes
    useEffect(() => {
        textareaRef.current?.focus()
    }, [conversationId])

    // Auto-focus when a reply is set so the user can type right away
    useEffect(() => {
        if (replyToMessage) textareaRef.current?.focus()
    }, [replyToMessage])

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value)

        if (!isTypingRef.current) {
            isTypingRef.current = true
            emitTyping({ conversationId, typer: myId, receiverId })
        }

        clearTimeout(stopTypingTimer.current!)
        stopTypingTimer.current = setTimeout(emitStopTypingNow, STOP_TYPING_DELAY)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSendText()
        }
    }

    const handleSendText = () => {
        const trimmed = text.trim()
        if (!trimmed) return
        clearTimeout(stopTypingTimer.current!)
        emitStopTypingNow()
        emitSendMessage({ conversationId, text: trimmed, replyTo: replyToMessage?._id ?? null })
        setText("")
        onCancelReply?.()
        textareaRef.current?.focus()
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith("image/")) {
            toast.error("Only image files are supported.")
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5 MB.")
            return
        }
        setSelectedFile(file)
        setPreviewUrl(URL.createObjectURL(file))
        setImageDialogOpen(true)
        e.target.value = ""
    }

    const handleSendImage = async () => {
        if (!selectedFile) return
        setUploading(true)
        try {
            const { url, fields } = await userApi.getPresignedUrl(
                selectedFile.name,
                selectedFile.type
            ) as { url: string; fields: Record<string, string> }

            const formData = new FormData()
            Object.entries(fields).forEach(([k, v]) => formData.append(k, v))
            formData.append("file", selectedFile) // file must be last

            const uploadRes = await fetch(url, { method: "POST", body: formData })
            if (!uploadRes.ok && uploadRes.status !== 201) throw new Error("Upload failed")

            // AWS SDK v3 returns the object key as fields.key (lowercase)
            const imageUrl = `${url}${fields.key}`
            const trimmedCaption = caption.trim()
            emitSendMessage({ conversationId, imageUrl, ...(trimmedCaption && { text: trimmedCaption }), replyTo: replyToMessage?._id ?? null })
            onCancelReply?.()
            closeImageDialog()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to send image.")
        } finally {
            setUploading(false)
        }
    }

    const closeImageDialog = () => {
        setImageDialogOpen(false)
        setSelectedFile(null)
        setCaption("")
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
    }

    return (
        <>
            {(isBlocked || blockedByThem) ? (
                <div className="flex items-center justify-center gap-2 px-4 py-3 border-t bg-background text-muted-foreground text-sm">
                    <ShieldX className="size-4 shrink-0" />
                    <span>
                        {isBlocked
                            ? "You have blocked this user. Unblock to send messages."
                            : "You can't send messages to this user."}
                    </span>
                </div>
            ) : (
            <div className="border-t bg-background">
                {/* Reply strip */}
                {replyToMessage && (
                    <div className="flex items-center gap-3 px-4 pt-2.5 pb-1">
                        <div className="flex-1 min-w-0 pl-2 border-l-2 border-primary">
                            <p className="text-xs font-semibold text-primary truncate">
                                Replying to {replyToMessage.senderId === myId ? "yourself" : (receiverName || "them")}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {replyToMessage.softDeleted
                                    ? "This message was deleted"
                                    : replyToMessage.text || "🖼️ Photo"}
                            </p>
                        </div>
                        <button
                            onClick={onCancelReply}
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                            title="Cancel reply"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                )}

                <div className="flex items-end gap-2 p-3">
                {/* Image upload button */}
                {!isReceiverBot && (<><Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    title="Send image"
                >
                    <ImagePlus className="size-5" />
                </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    /></>)}

                {/* Text area */}
                <Textarea
                    ref={textareaRef}
                    placeholder="Type a message..."
                    className={cn(
                        "flex-1 min-h-10 max-h-36 resize-none text-base rounded-xl thin-scrollbar",
                    )}
                    rows={1}
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                />

                {/* Send button */}
                <Button
                    type="button"
                    size="lg"
                    className="shrink-0 hover:bg-primary/90 text-white rounded-xl"
                    onClick={handleSendText}
                    disabled={!text.trim()}
                    title="Send"
                >
                    <ArrowRight className="size-5" />
                </Button>
                </div>
            </div>
            )}

            {/* Image preview dialog */}
            <Dialog open={imageDialogOpen} onOpenChange={(open) => { if (!open) closeImageDialog() }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Send image</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center rounded-lg overflow-hidden bg-muted max-h-80">
                        {previewUrl && (
                            <img
                                src={previewUrl}
                                alt="preview"
                                className="max-h-80 object-contain"
                            />
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate text-center">{selectedFile?.name}</p>

                    {/* Caption input */}
                    <Textarea
                        placeholder="Add a caption… (optional)"
                        className={cn(
                            "resize-none text-sm min-h-10 max-h-28 thin-scrollbar",
                        )}
                        rows={1}
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                if (!uploading) handleSendImage()
                            }
                        }}
                        disabled={uploading}
                        autoFocus
                    />

                    <DialogFooter className="flex items-center gap-2">
                        <Button variant="outline" onClick={closeImageDialog} disabled={uploading}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-white"
                            onClick={handleSendImage}
                            disabled={uploading}
                        >
                            {uploading ? <Spinner className="size-4 mr-1" /> : ""}
                            {uploading ? "Sending…" : "Send"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
