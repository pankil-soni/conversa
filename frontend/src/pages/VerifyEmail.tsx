import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { RotateCcw, MailCheck, LogOut, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/hooks/use-auth"
import { authApi } from "@/lib/api"
import { toast } from "sonner"

export default function VerifyEmail() {
    const navigate = useNavigate()
    const { user, setUser, logout } = useAuth()

    const [otpCode, setOtpCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [countdown, setCountdown] = useState(0)
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Redirect if not logged in or already verified
    useEffect(() => {
        if (!user) {
            navigate("/login", { replace: true })
        } else if (user.isEmailVerified) {
            navigate("/user/conversations", { replace: true })
        }
    }, [user, navigate])

    // Auto-send OTP on mount
    useEffect(() => {
        if (user && !user.isEmailVerified) {
            handleSendOtp(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Countdown ticker
    useEffect(() => {
        if (countdown > 0) {
            countdownRef.current = setInterval(() => {
                setCountdown((c) => {
                    if (c <= 1) {
                        clearInterval(countdownRef.current!)
                        return 0
                    }
                    return c - 1
                })
            }, 1000)
        }
        return () => clearInterval(countdownRef.current!)
    }, [countdown])

    const handleSendOtp = async (silent = false) => {
        setSending(true)
        try {
            await authApi.sendVerificationOtp()
            setOtpSent(true)
            setCountdown(60)
            if (!silent) toast.success("Verification OTP sent! Check your inbox.")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to send OTP. Try again.")
        } finally {
            setSending(false)
        }
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        if (otpCode.length !== 6) {
            toast.error("Please enter the complete 6-digit OTP.")
            return
        }
        setLoading(true)
        try {
            await authApi.verifyEmail(otpCode)
            // Update local user state so the rest of the app knows the email is verified
            if (user) setUser({ ...user, isEmailVerified: true })
            toast.success("Email verified successfully! Welcome to Conversa.")
            navigate("/user/conversations", { replace: true })
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Invalid OTP. Try again.")
            setOtpCode("")
        } finally {
            setLoading(false)
        }
    }

    const handleResend = async () => {
        if (countdown > 0) return
        setOtpCode("")
        await handleSendOtp()
    }

    const handleLogout = () => {
        logout()
        navigate("/login", { replace: true })
    }

    // Mask email for display: show first 2 chars + *** + @domain
    const maskedEmail = user?.email
        ? (() => {
              const [name, domain] = user.email.split("@")
              return `${name.slice(0, 2)}***@${domain}`
          })()
        : ""

    return (
        <div className="h-full overflow-hidden flex flex-col lg:flex-row">
            {/* ── Left decorative panel ─────────────────────────────── */}
            <div className="hidden lg:flex lg:w-[45%] relative flex-col items-center justify-center overflow-hidden bg-primary dark:bg-primary/80">
                {/* abstract blobs */}
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-black/20 blur-3xl" />
                <div className="absolute top-1/2 -right-16 w-56 h-56 rounded-full bg-white/5 blur-2xl" />

                <div className="relative z-10 text-white max-w-sm text-center px-8 space-y-6">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mx-auto shadow-xl">
                        <MessageCircle className="w-8 h-8 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight">Conversa</h1>
                        <p className="text-white/70 text-lg leading-relaxed">
                            One last step — verify your email to get started.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Right form panel ──────────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
                <div className="w-full max-w-md space-y-8">

                    {/* Header */}
                    <div className="text-center space-y-3">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto">
                            <MailCheck className="w-7 h-7 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold tracking-tight">Verify your email</h2>
                            <p className="text-muted-foreground text-sm">
                                {otpSent
                                    ? <>We sent a 6-digit code to <span className="font-medium text-foreground">{maskedEmail}</span></>
                                    : "Sending verification code to your email…"}
                            </p>
                        </div>
                    </div>

                    {/* OTP Form */}
                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex justify-center">
                                <InputOTP
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={setOtpCode}
                                    disabled={loading || sending || !otpSent}
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                            {!otpSent && sending && (
                                <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                    <Spinner className="w-4 h-4" /> Sending code…
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-primary/90 hover:bg-primary text-white"
                            disabled={loading || otpCode.length !== 6 || !otpSent}
                        >
                            {loading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                            {loading ? "Verifying…" : "Verify Email"}
                        </Button>

                        {/* Resend */}
                        <div className="flex items-center justify-center">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={countdown > 0 || sending || loading}
                                className="flex items-center gap-1 text-sm text-primary hover:opacity-80 disabled:opacity-40 transition-opacity"
                            >
                                <RotateCcw className="w-3 h-3" />
                                {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                            </button>
                        </div>
                    </form>

                    {/* Logout */}
                    <div className="pt-2 border-t">
                        <p className="text-center text-sm text-muted-foreground mb-3">
                            Wrong account?
                        </p>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Log out
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
