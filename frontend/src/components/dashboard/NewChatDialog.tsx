import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Pin, Loader2, Circle } from "lucide-react"
import { toast } from "sonner"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

import { userApi, conversationApi, type NonFriendsSort } from "@/lib/api"
import { useConversations } from "@/hooks/use-conversations"
import { useAuth } from "@/hooks/use-auth"
import type { User } from "@/hooks/use-auth"

/* ─── types ─────────────────────────────────────────────────────────────── */

interface NonFriendsResponse {
    users: User[]
    pinnedUser: User | null
    hasMore: boolean
    total: number
    page: number
}

/* ─── helpers ────────────────────────────────────────────────────────────── */

const LIMIT = 20

function initials(name: string) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
}

function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay)
        return () => clearTimeout(id)
    }, [value, delay])
    return debounced
}

function formatLastSeen(lastSeen: Date | string | undefined): string {
    if (!lastSeen) return "Last seen unknown"
    const diff = Date.now() - new Date(lastSeen).getTime()
    const secs  = Math.floor(diff / 1_000)
    const mins  = Math.floor(diff / 60_000)
    const hrs   = Math.floor(diff / 3_600_000)
    const days  = Math.floor(diff / 86_400_000)
    if (secs  <  60) return "Last seen just now"
    if (mins  <  60) return `Last seen ${mins}m ago`
    if (hrs   <  24) return `Last seen ${hrs}h ago`
    if (days  <   7) return `Last seen ${days}d ago`
    return `Last seen ${new Date(lastSeen).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
}

/* ─── user row ───────────────────────────────────────────────────────────── */

interface UserRowProps {
    user: User
    pinned?: boolean
    creating: boolean
    onClick: () => void
}

function UserRow({ user, pinned = false, creating, onClick }: UserRowProps) {
    return (
        <button
            onClick={onClick}
            disabled={creating}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-accent/60 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Avatar className="size-10 shrink-0">
                <AvatarImage src={user.profilePic} alt={user.name} />
                <AvatarFallback className="bg-primary/15  text-xs font-semibold">
                    {initials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{user.name}</span>
                    {pinned && (
                        <Badge variant="secondary" className="shrink-0 gap-0.5 text-[10px] h-4 px-1.5 py-0">
                            <Pin className="size-2.5" />
                            Dev
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                    {user.isOnline ? (
                        <>
                            <Circle className="size-1.5 fill-green-500 text-green-500 shrink-0" />
                            <span className="text-xs text-green-600 dark:text-green-400 truncate">Online</span>
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground truncate">
                            {formatLastSeen(user.lastSeen)}
                        </span>
                    )}
                </div>
            </div>
        </button>
    )
}

function UserRowSkeleton() {
    return (
        <div className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="size-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
    )
}

/* ─── main dialog ────────────────────────────────────────────────────────── */

interface NewChatDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { fetchConversations } = useConversations()

    const [query, setQuery]           = useState("")
    const [sort, setSort]             = useState<NonFriendsSort>("name_asc")
    const [users, setUsers]           = useState<User[]>([])
    const [pinnedUser, setPinnedUser] = useState<User | null>(null)
    const [page, setPage]             = useState(1)
    const [hasMore, setHasMore]       = useState(false)
    const [loading, setLoading]       = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [creating, setCreating]     = useState<string | null>(null) // userId being created

    const debouncedQuery = useDebounce(query, 350)
    const sentinelRef    = useRef<HTMLDivElement>(null)
    const listRef        = useRef<HTMLDivElement>(null)

    /* ── fetch first page whenever search / sort changes ─────────────────── */
    const fetchPage = useCallback(
        async (pg: number, q: string, s: NonFriendsSort, append: boolean) => {
            if (pg === 1) setLoading(true)
            else setLoadingMore(true)

            try {
                const data = await userApi.getNonFriends({
                    search: q || undefined,
                    sort: s,
                    page: pg,
                    limit: LIMIT,
                }) as NonFriendsResponse

                if (append) {
                    setUsers((prev) => [...prev, ...data.users])
                } else {
                    setUsers(data.users)
                    setPinnedUser(data.pinnedUser)
                    // scroll list back to top on fresh load
                    if (listRef.current) listRef.current.scrollTop = 0
                }
                setHasMore(data.hasMore)
                setPage(pg)
            } catch {
                toast.error("Failed to load users")
            } finally {
                setLoading(false)
                setLoadingMore(false)
            }
        },
        []
    )

    /* reset + fetch when dialog opens or search/sort changes */
    useEffect(() => {
        if (!open) return
        fetchPage(1, debouncedQuery, sort, false)
    }, [open, debouncedQuery, sort, fetchPage])

    /* clear state when dialog closes */
    useEffect(() => {
        if (!open) {
            setQuery("")
            setUsers([])
            setPinnedUser(null)
            setPage(1)
            setHasMore(false)
        }
    }, [open])

    /* ── IntersectionObserver sentinel for infinite scroll ────────────────── */
    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    fetchPage(page + 1, debouncedQuery, sort, true)
                }
            },
            { threshold: 0.1 }
        )

        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasMore, loadingMore, loading, page, debouncedQuery, sort, fetchPage])

    /* ── create conversation ──────────────────────────────────────────────── */
    const handleStartChat = async (userId: string) => {
        if (!user) return
        setCreating(userId)
        try {
            const conv = await conversationApi.create([user._id, userId]) as { _id: string }
            await fetchConversations()
            onOpenChange(false)
            navigate(`/user/conversations/${conv._id}`)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create conversation")
        } finally {
            setCreating(null)
        }
    }

    const isSearching = debouncedQuery.trim().length > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
                <DialogHeader className="px-4 pt-7 pb-3 shrink-0">
                    <DialogTitle>New Conversation</DialogTitle>
                </DialogHeader>

                {/* Controls */}
                <div className="px-4 pb-3 space-y-2 shrink-0 border-b">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            autoFocus
                            placeholder="Search by name or email…"
                            className="pl-8 h-9"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>

                    {/* Sort */}
                    <Select value={sort} onValueChange={(v) => setSort(v as NonFriendsSort)}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Sort by…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name_asc">Name - A → Z</SelectItem>
                            <SelectItem value="name_desc">Name - Z → A</SelectItem>
                            <SelectItem value="last_seen_recent">Last seen - most recent</SelectItem>
                            <SelectItem value="last_seen_oldest">Last seen - least recent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* User list */}
                <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-0.5">
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => <UserRowSkeleton key={i} />)
                    ) : (
                        <>
                            {/* Pinned user — only when no search active */}
                            {!isSearching && pinnedUser && (
                                <>
                                    <UserRow
                                        user={pinnedUser}
                                        pinned
                                        creating={creating === pinnedUser._id}
                                        onClick={() => handleStartChat(pinnedUser._id)}
                                    />
                                    {users.length > 0 && (
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            <div className="flex-1 h-px bg-border" />
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                                Other users
                                            </span>
                                            <div className="flex-1 h-px bg-border" />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Regular users */}
                            {users.map((u) => (
                                <UserRow
                                    key={u._id}
                                    user={u}
                                    creating={creating === u._id}
                                    onClick={() => handleStartChat(u._id)}
                                />
                            ))}

                            {/* Empty state */}
                            {!pinnedUser && users.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                                    <Search className="size-8 opacity-30" />
                                    <p className="text-sm">
                                        {isSearching ? "No users found" : "No new people to chat with"}
                                    </p>
                                </div>
                            )}

                            {/* Infinite scroll sentinel */}
                            <div ref={sentinelRef} className="h-1" />

                            {/* Loading more indicator */}
                            {loadingMore && (
                                <div className="flex justify-center py-3">
                                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
