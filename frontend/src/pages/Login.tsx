import { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Eye, EyeOff, MessageCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/hooks/use-auth"
import { authApi } from "@/lib/api"
import { toast } from "sonner"

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
        <div className="h-full flex overflow-hidden">
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
                            Connect, chat, and collaborate — all in one place.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Right form panel ──────────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
                <div className="w-full max-w-md space-y-8">

                    {/* back to home button */}
                    <Link to="/" className="flex items-center gap-1">
                        <Button variant={"outline"}>
                            <ArrowLeft className="w-3 h-3" />
                            Home
                        </Button>
                    </Link>

                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
                        <p className="text-muted-foreground text-sm">Sign in to your account to continue</p>
                    </div>

                    <Tabs defaultValue="password" className="w-full">
                        <TabsList className="w-full grid grid-cols-2 mb-6">
                            <TabsTrigger value="password">
                                Password
                            </TabsTrigger>
                            <TabsTrigger value="otp">
                                OTP Login
                            </TabsTrigger>
                        </TabsList>

                        {/* ── Password Tab ───────────────────────────── */}
                        <TabsContent value="password">
                            <form onSubmit={handlePasswordLogin} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="pw-email">Email address</Label>
                                    <Input
                                        id="pw-email"
                                        type="email"
                                        placeholder="Enter your email here"
                                        autoComplete="email"
                                        value={pwEmail}
                                        onChange={(e) => setPwEmail(e.target.value)}
                                        disabled={pwLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="pw-password">Password</Label>
                                    </div>
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
                                    className="w-full p-6 bg-primary/90 hover:bg-primary text-white"
                                    disabled={pwLoading}
                                >
                                    {pwLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                                    {pwLoading ? "Signing in…" : "Sign in"}
                                </Button>
                            </form>
                        </TabsContent>

                        {/* ── OTP Tab ─────────────────────────────────── */}
                        <TabsContent value="otp">
                            <div className="space-y-5">
                                {!otpSent ? (
                                    /* Step 1: enter email */
                                    <form onSubmit={handleSendOtp} className="space-y-5">
                                        <div className="space-y-2">
                                            <Label htmlFor="otp-email">Email address</Label>
                                            <Input
                                                id="otp-email"
                                                type="email"
                                                placeholder="Enter your email here"
                                                autoComplete="email"
                                                value={otpEmail}
                                                onChange={(e) => setOtpEmail(e.target.value)}
                                                disabled={otpLoading}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            We'll send a one-time password to your email. Valid for 5 minutes.
                                        </p>
                                        <Button
                                            type="submit"
                                            className="w-full p-6 bg-primary/90 hover:bg-primary text-white"
                                            disabled={otpLoading}
                                        >
                                            {otpLoading ? <Spinner className="w-4 h-4 mr-2" /> : ""}
                                            {otpLoading ? "Sending OTP…" : "Send OTP"}
                                        </Button>
                                    </form>
                                ) : (
                                    /* Step 2: enter OTP */
                                    <form onSubmit={handleOtpLogin} className="space-y-5">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Enter OTP</Label>
                                                <span className="text-xs text-muted-foreground">
                                                    Sent to <span className="font-medium text-foreground">{otpEmail}</span>
                                                </span>
                                            </div>
                                            <div className="flex justify-center">
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
                                            className="w-full bg-primary/90 hover:bg-primary text-white"
                                            disabled={otpLoading || otpCode.length !== 6}
                                        >
                                            {otpLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                                            {otpLoading ? "Verifying…" : "Login with OTP"}
                                        </Button>

                                        <div className="flex items-center justify-between text-sm">
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
                                                className="flex items-center gap-1  hover:opacity-80 disabled:opacity-40 transition-opacity"
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

                    <Separator />
                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link
                            to="/signup"
                            className="font-medium  hover:opacity-80 transition-opacity"
                        >
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
