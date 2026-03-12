
import { useState, useRef } from "react"
import { Camera, Pencil, Check, X, Eye, EyeOff, Loader2, Trash2, Sun, Moon, Monitor } from "lucide-react"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/use-auth"
import { userApi } from "@/lib/api"
import { useTheme } from "@/components/theme-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
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

/* ─── localStorage keys ─────────────────────────────────────────────────── */
export const LS_NOTIF_BANNERS = "notif-banners-enabled"
export const LS_NOTIF_SOUND = "notif-sound-enabled"

const getStoredBool = (key: string, fallback = true): boolean => {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v === "true"
}

/* ─── inline-editable field ─────────────────────────────────────────────── */
function EditableField({
    label,
    value,
    onSave,
    multiline = false,
}: {
    label: string
    value: string
    onSave: (v: string) => Promise<void>
    multiline?: boolean
}) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(value)
    const [saving, setSaving] = useState(false)

    const handleSave = async () => {
        if (draft.trim() === value) { setEditing(false); return }
        setSaving(true)
        try {
            await onSave(draft.trim())
            setEditing(false)
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => { setDraft(value); setEditing(false) }

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
                {!editing && (
                    <button
                        onClick={() => { setDraft(value); setEditing(true) }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Pencil className="size-3.5" />
                    </button>
                )}
            </div>

            {editing ? (
                <div className="flex gap-2 items-start">
                    {multiline ? (
                        <textarea
                            autoFocus
                            rows={3}
                            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                        />
                    ) : (
                        <Input
                            autoFocus
                            className="flex-1"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel() }}
                        />
                    )}
                    <div className="flex gap-1">
                        <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="rounded-md p-1.5 bg-muted text-muted-foreground hover:bg-muted/80"
                        >
                            <X className="size-3.5" />
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-md p-1.5 text-white bg-primary hover:bg-primary/90 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-sm whitespace-pre-wrap wrap-break-word">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
            )}
        </div>
    )
}

/* ─── password field with show/hide ────────────────────────────────────── */
function PasswordInput({
    id,
    label,
    value,
    onChange,
    placeholder,
}: {
    id: string
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
}) {
    const [show, setShow] = useState(false)
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <div className="relative">
                <Input
                    id={id}
                    type={show ? "text" : "password"}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="pr-10"
                />
                <button
                    type="button"
                    onClick={() => setShow((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            </div>
        </div>
    )
}

/* ─── main page ─────────────────────────────────────────────────────────── */
const UserProfile = () => {
    const { user, setUser, logout } = useAuth()
    const { theme, setTheme } = useTheme()
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [avatarUploading, setAvatarUploading] = useState(false)

    // password-change form
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirm] = useState("")
    const [pwSaving, setPwSaving] = useState(false)

    // notification preferences
    const [bannersEnabled, setBannersEnabled] = useState(() => getStoredBool(LS_NOTIF_BANNERS))
    const [soundEnabled, setSoundEnabled] = useState(() => getStoredBool(LS_NOTIF_SOUND))
    const [emailNotifsEnabled, setEmailNotifsEnabled] = useState(
        () => user?.emailNotificationsEnabled ?? true
    )
    const [emailNotifsLoading, setEmailNotifsLoading] = useState(false)

    // delete account dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState("")
    const [deleting, setDeleting] = useState(false)

    if (!user) return null

    const initials = user.name
        ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
        : "?"

    const hasCustomPhoto = user.profilePic && !user.profilePic.includes("ui-avatars.com")

    /* ── profile-pic remove ─────────────────────────────────────────────── */
    const handleRemoveAvatar = async () => {
        const defaultUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&bold=true`
        setAvatarUploading(true)
        try {
            await userApi.updateProfile({ profilePic: defaultUrl })
            setUser({ ...user, profilePic: defaultUrl })
            toast.success("Profile photo removed")
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to remove photo")
        } finally {
            setAvatarUploading(false)
        }
    }

    /* ── profile-pic upload ─────────────────────────────────────────────── */
    const handleAvatarChange = async (file: File) => {
        if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return }
        setAvatarUploading(true)
        try {
            const { url, fields } = await userApi.getPresignedUrl(file.name, file.type) as { url: string; fields: Record<string, string> }

            const form = new FormData()
            Object.entries(fields).forEach(([k, v]) => form.append(k, v))
            form.append("file", file)

            const upload = await fetch(url, { method: "POST", body: form })
            if (!upload.ok) throw new Error("Upload failed")

            // The S3 presigned-post returns the object URL in a <Location> XML tag
            const xml = await upload.text()
            const loc = xml.match(/<Location>(.*?)<\/Location>/)?.[1]
            if (!loc) throw new Error("Could not parse upload location")

            const imageUrl = decodeURIComponent(loc)

            // persist to DB
            await userApi.updateProfile({ profilePic: imageUrl })
            setUser({ ...user, profilePic: imageUrl })
            toast.success("Profile photo updated")
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Upload failed")
        } finally {
            setAvatarUploading(false)
        }
    }

    /* ── name / about save ──────────────────────────────────────────────── */
    const handleSaveName = async (name: string) => {
        await userApi.updateProfile({ name })
        setUser({ ...user, name })
        toast.success("Name updated")
    }

    const handleSaveAbout = async (about: string) => {
        await userApi.updateProfile({ about })
        setUser({ ...user, about })
        toast.success("About updated")
    }

    /* ── password change ────────────────────────────────────────────────── */
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!oldPassword || !newPassword || !confirmPassword) {
            toast.error("Please fill all password fields"); return
        }
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match"); return
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters"); return
        }
        setPwSaving(true)
        try {
            await userApi.updateProfile({ oldpassword: oldPassword, newpassword: newPassword })
            toast.success("Password changed successfully")
            setOldPassword(""); setNewPassword(""); setConfirm("")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to change password")
        } finally {
            setPwSaving(false)
        }
    }

    /* ── notification toggles ───────────────────────────────────────────── */
    const toggleBanners = (val: boolean) => {
        setBannersEnabled(val)
        localStorage.setItem(LS_NOTIF_BANNERS, String(val))
    }

    const toggleSound = (val: boolean) => {
        setSoundEnabled(val)
        localStorage.setItem(LS_NOTIF_SOUND, String(val))
    }

    const toggleEmailNotifs = async (val: boolean) => {
        setEmailNotifsEnabled(val)
        setEmailNotifsLoading(true)
        try {
            await userApi.updateProfile({ emailNotificationsEnabled: val })
            setUser({ ...user, emailNotificationsEnabled: val })
        } catch (err) {
            // Revert on failure
            setEmailNotifsEnabled(!val)
            toast.error(err instanceof Error ? err.message : "Failed to update email notifications")
        } finally {
            setEmailNotifsLoading(false)
        }
    }

    /* ── logout ─────────────────────────────────────────────────────────── */
    const handleLogout = () => {
        logout()
        navigate("/login")
    }

    /* ── delete account ─────────────────────────────────────────────────── */
    const handleDeleteAccount = async () => {
        setDeleting(true)
        try {
            await userApi.deleteAccount()
            toast.success("Account deleted")
            logout()
            navigate("/login")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to delete account")
        } finally {
            setDeleting(false)
            setDeleteDialogOpen(false)
        }
    }

    return (
        <>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-xl mx-auto space-y-6">

                {/* ── Profile card ──────────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>Your public information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Avatar */}
                        <div className="flex justify-center">
                            <div className="relative group">
                                <Avatar className="size-24 text-lg">
                                    <AvatarImage src={user.profilePic} alt={user.name} />
                                    <AvatarFallback className="bg-primary/20  font-semibold text-xl">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {avatarUploading
                                        ? <Loader2 className="size-6 text-white animate-spin" />
                                        : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={avatarUploading}
                                                    className="p-1 hover:scale-110 transition-transform"
                                                    title="Upload photo"
                                                >
                                                    <Camera className="size-5 text-white" />
                                                </button>
                                                {hasCustomPhoto && (
                                                    <button
                                                        onClick={handleRemoveAvatar}
                                                        disabled={avatarUploading}
                                                        className="p-1 hover:scale-110 transition-transform"
                                                        title="Remove photo"
                                                    >
                                                        <Trash2 className="size-5 text-white" />
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    }
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarChange(f); e.target.value = "" }}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Name & About */}
                        <EditableField label="Name" value={user.name} onSave={handleSaveName} />
                        <EditableField label="About" value={user.about ?? ""} onSave={handleSaveAbout} multiline />
                    </CardContent>
                </Card>

                {/* ── Change Password card ───────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>Update your account password</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <PasswordInput
                                id="old-pw"
                                label="Current Password"
                                value={oldPassword}
                                onChange={setOldPassword}
                                placeholder="Enter current password"
                            />
                            <PasswordInput
                                id="new-pw"
                                label="New Password"
                                value={newPassword}
                                onChange={setNewPassword}
                                placeholder="Enter new password"
                            />
                            <PasswordInput
                                id="confirm-pw"
                                label="Confirm New Password"
                                value={confirmPassword}
                                onChange={setConfirm}
                                placeholder="Confirm new password"
                            />
                            <Button type="submit" disabled={pwSaving} className="w-full">
                                {pwSaving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Saving…</> : "Change Password"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* ── Appearance card ───────────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>
                            Choose your preferred color theme. You can also press{" "}
                            <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono font-medium text-muted-foreground">D</kbd>{" "}
                            anywhere (outside a text field) to quickly toggle between light and dark.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                            {([
                                { value: "light", label: "Light", Icon: Sun },
                                { value: "dark",  label: "Dark",  Icon: Moon },
                                { value: "system", label: "System", Icon: Monitor },
                            ] as const).map(({ value, label, Icon }) => (
                                <button
                                    key={value}
                                    onClick={() => setTheme(value)}
                                    className={[
                                        "flex flex-col items-center gap-2 rounded-lg border-2 px-3 py-4 text-sm font-medium transition-colors",
                                        theme === value
                                            ? "border-primary bg-primary/10 text-primary"
                                            : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50 hover:text-foreground",
                                    ].join(" ")}
                                >
                                    <Icon className="size-5" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* ── Notification Settings card ─────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Notification Settings</CardTitle>
                        <CardDescription>Control how you receive notifications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="notif-banners" className="text-sm font-medium">Notification Banners</Label>
                                <p className="text-xs text-muted-foreground">Show toast notifications for new messages</p>
                            </div>
                            <Switch
                                id="notif-banners"
                                checked={bannersEnabled}
                                onCheckedChange={toggleBanners}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="notif-sound" className="text-sm font-medium">Notification Sound</Label>
                                <p className="text-xs text-muted-foreground">Play a sound when a new message arrives</p>
                            </div>
                            <Switch
                                id="notif-sound"
                                checked={soundEnabled}
                                onCheckedChange={toggleSound}
                            />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="notif-email" className="text-sm font-medium">Email Notifications</Label>
                                <p className="text-xs text-muted-foreground">Receive an email when you get a message while offline</p>
                            </div>
                            <Switch
                                id="notif-email"
                                checked={emailNotifsEnabled}
                                disabled={emailNotifsLoading}
                                onCheckedChange={toggleEmailNotifs}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* ── Account Actions card ──────────────────────────────── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Account</CardTitle>
                        <CardDescription>Manage your session and account</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-center gap-2"
                            onClick={handleLogout}
                        >
                            Log Out
                        </Button>
                        <Button
                            variant="destructive"
                            className="w-full justify-center gap-2"
                            onClick={() => { setDeleteConfirmText(""); setDeleteDialogOpen(true) }}
                        >
                            Delete My Account
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>

        {/* ── Delete Account confirmation dialog ─────────────────────── */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete account?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>
                                This action <strong>cannot be undone</strong>. Your profile will be anonymised —
                                your name, email, and bio will be cleared, but your messages and conversations
                                will remain visible to other participants.
                            </p>
                            <p>Type <strong>DELETE</strong> below to confirm:</p>
                            <Input
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                className="font-mono"
                            />
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={deleteConfirmText !== "DELETE" || deleting}
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {deleting ? <><Loader2 className="size-4 mr-2 animate-spin" />Deleting…</> : "Delete Account"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    )
}

export default UserProfile