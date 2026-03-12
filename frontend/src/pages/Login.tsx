import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Eye, EyeOff, RotateCcw, MessageCircle, Zap, Shield, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/hooks/use-auth"
import { authApi } from "@/lib/api"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"

// Floating feature cards shown on large screens
const spotlights = [
    {
        title: "Lightning fast",
        desc: "Messages delivered instantly via WebSocket connections.",
        icon: Zap,
        side: "left" as const,
        top: "20%",
    },
    {
        title: "Private & secure",
        desc: "Your conversations stay between you and the people you trust.",
        icon: Shield,
        side: "left" as const,
        top: "52%",
    },
    {
        title: "Personal AI Chatbot",
        desc: "Chat with your own AI assistant, powered by Gemini.",
        icon: Bot,
        side: "right" as const,
        top: "20%",
    },
    {
        title: "Passwordless login",
        desc: "Sign in instantly with a one-time code sent to your inbox.",
        icon: MessageCircle,
        side: "right" as const,
        top: "52%",
    },
]

export default function Login() {
    const navigate = useNavigate()
    const { login, loginWithOtp, user } = useAuth()

    // ── password tab ──────────────────────────────────────────────────
    const [pwEmail, setPwEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPass, setShowPass] = useState(false)
    const [pwLoading, setPwLoading] = useState(false)

    // ── otp tab ───────────────────────────────────────────────────────
    const [otpEmail, setOtpEmail] = useState("")
    const [otpCode, setOtpCode] = useState("")
    const [otpSent, setOtpSent] = useState(false)
    const [otpCountdown, setOtpCountdown] = useState(0)
    const [otpLoading, setOtpLoading] = useState(false)
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Redirect if already logged in
    useEffect(() => {
        if (user) navigate("/user/conversations", { replace: true })
    }, [user, navigate])

    // OTP countdown ticker
    useEffect(() => {
        if (otpCountdown > 0) {
            countdownRef.current = setInterval(() => {
                setOtpCountdown((c) => {
                    if (c <= 1) {
                        clearInterval(countdownRef.current!)
                        return 0
                    }
                    return c - 1
                })
            }, 1000)
        }
        return () => clearInterval(countdownRef.current!)
    }, [otpCountdown])

    // ── handlers ──────────────────────────────────────────────────────
    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!pwEmail || !password) {
            toast.error("Please fill in all fields.")
            return
        }
        setPwLoading(true)
        try {
            await login(pwEmail.trim(), password)
            navigate("/user/conversations", { replace: true })
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Login failed. Try again.")
        } finally {
            setPwLoading(false)
        }
    }

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!otpEmail) {
            toast.error("Please enter your email address.")
            return
        }
        setOtpLoading(true)
        try {
            await authApi.sendOtp(otpEmail.trim())
            setOtpSent(true)
            setOtpCountdown(60)
            toast.success("OTP sent! Check your inbox.")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to send OTP.")
        } finally {
            setOtpLoading(false)
        }
    }

    const handleOtpLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (otpCode.length !== 6) {
            toast.error("Please enter the complete 6-digit OTP.")
            return
        }
        setOtpLoading(true)
        try {
            await loginWithOtp(otpEmail.trim(), otpCode)
            navigate("/user/conversations", { replace: true })
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Invalid OTP. Try again.")
        } finally {
            setOtpLoading(false)
        }
    }

    const handleResendOtp = async () => {
        if (otpCountdown > 0) return
        setOtpCode("")
        setOtpLoading(true)
        try {
            await authApi.sendOtp(otpEmail.trim())
            setOtpCountdown(60)
            toast.success("OTP resent! Check your inbox.")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to resend OTP.")
        } finally {
            setOtpLoading(false)
        }
    }

    return (
        <div className="relative h-full overflow-hidden bg-background">
            {/* ── Spotlight cards – visible on large screens only ─────── */}
            {spotlights.map((s) => {
                const Icon = s.icon
                return (
                    <div
                        key={s.title}
                        className="pointer-events-none absolute hidden xl:flex flex-col gap-2 w-56 p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 dark:shadow-black/20"
                        style={{
                            [s.side]: "calc(50% - 340px - 240px)",
                            top: s.top,
                            transform: "translateX(0)",
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                <Icon className="h-4 w-4 text-primary" />
                            </span>
                            <p className="text-sm font-semibold">{s.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                )
            })}

            {/* ── Scrollable center column ────────────────────────────── */}
            <div className="relative z-10 h-full overflow-y-auto flex flex-col items-center justify-center px-4 py-10">
                <div className="w-full max-w-100 flex flex-col gap-6">

                    {/* Brand */}
                    <div className="flex flex-col items-center gap-3 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
                            <MessageCircle className="h-7 w-7 text-primary" strokeWidth={1.8} />
                        </div>
                        <div>
                            <h1 className="text-5xl font-bold tracking-tight leading-none text-foreground">
                                Conversa
                            </h1>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                Chat with anyone, anywhere, instantly.
                            </p>
                        </div>
                    </div>

                    {/* Form card */}
                    <Card className="rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5 dark:shadow-black/25 p-6">
                        <div className="mb-5">
                            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Sign in to your account to continue</p>
                        </div>

                        <Tabs defaultValue="password" className="w-full">
                            <TabsList className="w-full grid grid-cols-2 mb-5">
                                <TabsTrigger value="password">Password</TabsTrigger>
                                <TabsTrigger value="otp">OTP Login</TabsTrigger>
                            </TabsList>

                            {/* ── Password Tab ───────────────────────── */}
                            <TabsContent value="password">
                                <form onSubmit={handlePasswordLogin} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pw-email">Email address</Label>
                                        <Input
                                            id="pw-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            autoComplete="email"
                                            value={pwEmail}
                                            onChange={(e) => setPwEmail(e.target.value)}
                                            disabled={pwLoading}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="pw-password">Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="pw-password"
                                                type={showPass ? "text" : "password"}
                                                placeholder="••••••••"
                                                autoComplete="current-password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                disabled={pwLoading}
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowPass((v) => !v)}
                                                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-primary/90 hover:bg-primary"
                                        disabled={pwLoading}
                                    >
                                        {pwLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                                        {pwLoading ? "Signing in…" : "Sign in"}
                                    </Button>
                                </form>
                            </TabsContent>

                            {/* ── OTP Tab ─────────────────────────────── */}
                            <TabsContent value="otp">
                                <div className="space-y-4">
                                    {!otpSent ? (
                                        <form onSubmit={handleSendOtp} className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="otp-email">Email address</Label>
                                                <Input
                                                    id="otp-email"
                                                    type="email"
                                                    placeholder="you@example.com"
                                                    autoComplete="email"
                                                    value={otpEmail}
                                                    onChange={(e) => setOtpEmail(e.target.value)}
                                                    disabled={otpLoading}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                We'll send a one-time password to your email. Valid for 5 minutes.
                                            </p>
                                            <Button
                                                type="submit"
                                                className="w-full bg-primary/90 hover:bg-primary"
                                                disabled={otpLoading}
                                            >
                                                {otpLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                                                {otpLoading ? "Sending OTP…" : "Send OTP"}
                                            </Button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleOtpLogin} className="space-y-4">
                                            <div className="space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <Label>Enter OTP</Label>
                                                    <span className="text-xs text-muted-foreground">
                                                        Sent to{" "}
                                                        <span className="font-medium text-foreground">{otpEmail}</span>
                                                    </span>
                                                </div>
                                                <div className="flex justify-center pt-1">
                                                    <InputOTP
                                                        maxLength={6}
                                                        value={otpCode}
                                                        onChange={setOtpCode}
                                                        disabled={otpLoading}
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
                                            </div>
                                            <Button
                                                type="submit"
                                                className="w-full bg-primary/90 hover:bg-primary"
                                                disabled={otpLoading || otpCode.length !== 6}
                                            >
                                                {otpLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                                                {otpLoading ? "Verifying…" : "Login with OTP"}
                                            </Button>
                                            <div className="flex items-center justify-between text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => { setOtpSent(false); setOtpCode("") }}
                                                    className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                                >
                                                    ← Change email
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleResendOtp}
                                                    disabled={otpCountdown > 0 || otpLoading}
                                                    className="flex items-center gap-1 hover:opacity-80 disabled:opacity-40 transition-opacity"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend OTP"}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </Card>

                    {/* Footer links */}
                    <div className="flex flex-col items-center gap-3">
                        <p className="text-center text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <Link to="/signup" className="font-medium text-primary hover:opacity-80 transition-opacity">
                                Create one
                            </Link>
                        </p>
                        <Link to="/">
                            <Button variant="link" size="sm" className="text-muted-foreground text-xs h-8">
                                <ArrowLeft className="w-3 h-3 mr-1" />
                                Back to home
                            </Button>
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    )
}
