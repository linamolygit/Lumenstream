"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
  Shield,
  Check,
  Sparkles,
  Link2,
  Play,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4;

function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function strengthLabel(password: string) {
  const c = passwordChecks(password);
  const score = Object.values(c).filter(Boolean).length;
  if (!password) return { label: "", score: 0, color: "bg-neutral-200" };
  if (score <= 2) return { label: "Weak", score, color: "bg-red-500" };
  if (score === 3 || score === 4) return { label: "Medium", score, color: "bg-amber-500" };
  return { label: "Strong", score, color: "bg-emerald-500" };
}

const interests = [
  { id: "watch", label: "Watch streams", icon: Play },
  { id: "scrape", label: "Scrape & add videos", icon: Sparkles },
  { id: "share", label: "Share stream links", icon: Link2 },
];

export default function SignUpPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { theme, setTheme } = useTheme();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["watch"]);

  // Step 3
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const checks = passwordChecks(password);
  const strength = strengthLabel(password);

  const canStep1 =
    name.trim().length > 1 &&
    email.includes("@") &&
    password.length >= 8 &&
    password === confirm &&
    checks.length &&
    checks.upper &&
    checks.lower &&
    checks.number;

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onCodeChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const onCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleCreateAccount = async () => {
    setError("");
    if (!canStep1) {
      setError("Please fill all fields correctly.");
      return;
    }
    setStep(2);
  };

  const handlePreferences = () => {
    setStep(3);
  };

  const handleVerify = async () => {
    setError("");
    const otp = code.join("");
    if (otp.length < 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      setStep(4);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const goDashboard = () => router.push("/dashboard");

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#eef2ff] via-[#f5f3ff] to-[#ede9fe] dark:from-[#0a0a0f] dark:via-[#12121a] dark:to-[#1a1025]">
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-600/20" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl dark:bg-indigo-600/20" />

      {/* Theme */}
      <div className="absolute right-6 top-6 z-20">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/60 px-3 py-2 text-xs font-medium backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
        >
          <Sun className="h-3.5 w-3.5" />
          Light
          <span
            className={cn(
              "relative h-5 w-9 rounded-full",
              theme === "dark" ? "bg-violet-500" : "bg-neutral-300"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
                theme === "dark" ? "left-4" : "left-0.5"
              )}
            />
          </span>
          Dark
          <Moon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center gap-8 px-4 py-16 lg:flex-row lg:items-stretch">
        {/* LEFT card */}
        <div className="w-full max-w-md">
          <div className="rounded-[28px] border border-white/60 bg-white/70 p-8 shadow-[0_20px_60px_rgba(80,60,180,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 sm:p-9">
            {/* Brand */}
            <div className="mb-6 flex items-center gap-2">
              {step > 1 && step < 4 && (
                <button
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="mr-1 rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-bold text-white">
                L
              </div>
              <span className="font-semibold text-neutral-900 dark:text-white">LumenStream</span>
            </div>

            {/* Progress */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
                Step {step} of 4
              </p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-2 w-2 rounded-full transition",
                      i <= step ? "bg-violet-600" : "bg-neutral-200 dark:bg-white/15"
                    )}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {/* STEP 1 */}
              {step === 1 && (
                <motion.div
                  key="s1"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                >
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    Create Your{" "}
                    <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                      LumenStream
                    </span>{" "}
                    Account
                  </h1>
                  <p className="mt-1 text-sm text-neutral-500">
                    Start streaming and sharing clean links in minutes.
                  </p>

                  <div className="mt-6 space-y-3">
                    <Field
                      icon={<User className="h-4 w-4" />}
                      label="Full Name"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={setName}
                    />
                    <Field
                      icon={<Mail className="h-4 w-4" />}
                      label="Email Address"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={setEmail}
                    />
                    <Field
                      icon={<Lock className="h-4 w-4" />}
                      label="Password"
                      type={showPass ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={setPassword}
                      right={
                        <button type="button" onClick={() => setShowPass(!showPass)}>
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                    <Field
                      icon={<Lock className="h-4 w-4" />}
                      label="Confirm Password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirm}
                      onChange={setConfirm}
                      right={
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)}>
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />

                    {/* Password strength panel */}
                    {password && (
                      <div className="rounded-2xl border border-black/5 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 font-medium text-neutral-600 dark:text-neutral-300">
                            <Shield className="h-3.5 w-3.5" /> Password Strength
                          </span>
                          <span
                            className={cn(
                              "font-semibold",
                              strength.label === "Strong" && "text-emerald-600",
                              strength.label === "Medium" && "text-amber-600",
                              strength.label === "Weak" && "text-red-600"
                            )}
                          >
                            {strength.label}
                          </span>
                        </div>
                        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
                          <div
                            className={cn("h-full transition-all", strength.color)}
                            style={{ width: `${(strength.score / 5) * 100}%` }}
                          />
                        </div>
                        <ul className="space-y-1 text-xs text-neutral-500">
                          {(
                            [
                              ["length", "Minimum 8 characters"],
                              ["upper", "One uppercase letter"],
                              ["lower", "One lowercase letter"],
                              ["number", "One number"],
                              ["special", "One special character"],
                            ] as const
                          ).map(([key, label]) => (
                            <li key={key} className="flex items-center gap-2">
                              <Check
                                className={cn(
                                  "h-3.5 w-3.5",
                                  checks[key] ? "text-emerald-500" : "text-neutral-300"
                                )}
                              />
                              {label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <button
                      onClick={handleCreateAccount}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25"
                    >
                      Create Account <ArrowRight className="h-4 w-4" />
                    </button>

                    <p className="text-center text-xs text-neutral-400">
                      By creating an account, you agree to our Terms & Privacy Policy.
                    </p>
                    <p className="text-center text-sm text-neutral-500">
                      Already have an account?{" "}
                      <Link href="/sign-in" className="font-semibold text-violet-600">
                        Sign In
                      </Link>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <motion.div
                  key="s2"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                >
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    Tell Us How You&apos;ll Use It
                  </h1>
                  <p className="mt-1 text-sm text-neutral-500">
                    Help us personalize your LumenStream experience.
                  </p>

                  <div className="mt-6 space-y-3">
                    {interests.map(({ id, label, icon: Icon }) => {
                      const active = selectedInterests.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleInterest(id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm transition",
                            active
                              ? "border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200"
                              : "border-black/5 bg-white/80 dark:border-white/10 dark:bg-white/5"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{label}</span>
                          {active && <Check className="ml-auto h-4 w-4 text-violet-600" />}
                        </button>
                      );
                    })}

                    <div className="rounded-2xl border border-violet-200/60 bg-violet-50/80 p-4 text-xs text-violet-800 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200">
                      <strong>Why we ask?</strong> This helps us highlight the right tools — player,
                      scraper, or stream-link sharing — on your dashboard.
                    </div>

                    <button
                      onClick={handlePreferences}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white"
                    >
                      Continue to Step 3 <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="text-center text-xs text-neutral-400">This will only take a few seconds.</p>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <motion.div
                  key="s3"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="text-center"
                >
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    Verify Your Account
                  </h1>
                  <p className="mt-1 text-sm text-neutral-500">
                    We&apos;ve sent a 6-digit code to{" "}
                    <span className="font-medium text-violet-600">{email}</span>
                  </p>

                  <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-500/20">
                    <Mail className="h-7 w-7 text-violet-600" />
                  </div>

                  <p className="mt-6 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    Enter the 6-digit code
                  </p>

                  <div className="mt-3 flex justify-center gap-2">
                    {code.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          inputsRef.current[i] = el;
                        }}
                        value={d}
                        onChange={(e) => onCodeChange(i, e.target.value)}
                        onKeyDown={(e) => onCodeKeyDown(i, e)}
                        maxLength={1}
                        className="h-12 w-10 rounded-xl border border-black/10 bg-white text-center text-lg font-semibold outline-none ring-violet-500/40 focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    ))}
                  </div>

                  {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

                  <button
                    onClick={handleVerify}
                    disabled={loading}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading ? "Creating account..." : "Verify & Continue"}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    className="mt-3 text-sm text-violet-600 hover:underline"
                    onClick={() => setError("Resend will work after OTP API is connected.")}
                  >
                    Didn&apos;t receive the code? Resend Code
                  </button>

                  <div className="mt-6 flex items-center gap-2 rounded-2xl border border-black/5 bg-white/70 p-3 text-left text-xs text-neutral-500 dark:border-white/10 dark:bg-white/5">
                    <Shield className="h-4 w-4 text-violet-500" />
                    Your account is secure. We never share your data.
                  </div>
                </motion.div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <motion.div
                  key="s4"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    You&apos;re All Set! 🎉
                  </h1>
                  <p className="mt-1 text-sm text-neutral-500">
                    Your LumenStream account is ready.
                  </p>

                  <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
                    <Check className="h-10 w-10 text-white" strokeWidth={3} />
                  </div>

                  <div className="mt-8 space-y-2 text-left">
                    {[
                      ["Account Created Successfully", "Your account is secured."],
                      ["Preferences Saved", "Your dashboard is personalized."],
                      ["You're Ready to Go", "Start adding and streaming videos."],
                    ].map(([t, d]) => (
                      <div
                        key={t}
                        className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white/80 p-3 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/20">
                          <Check className="h-3.5 w-3.5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t}</p>
                          <p className="text-xs text-neutral-500">{d}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={goDashboard}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white"
                  >
                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT preview — LumenStream only */}
        <div className="hidden w-full max-w-lg lg:block">
          <div className="h-full rounded-[28px] border border-white/60 bg-white/50 p-6 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 font-bold text-white">
                L
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">LumenStream</p>
                <p className="text-xs text-neutral-500">Clean streams. Simple sharing.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { t: "Scrape any URL", d: "Single or listing pages" },
                { t: "Proxy streams", d: "Cloudflare pipeline" },
                { t: "Copy stream links", d: "For blogs & apps" },
                { t: "Your dashboard", d: "Track scraped videos" },
              ].map((x) => (
                <div
                  key={x.t}
                  className="rounded-2xl border border-white/70 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5"
                >
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">{x.t}</p>
                  <p className="mt-1 text-xs text-neutral-500">{x.d}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white">
              <p className="text-sm font-semibold">Join creators & streamers</p>
              <p className="mt-1 text-xs text-white/80">
                Build your library, generate clean links, and share without clutter.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom trust */}
      <div className="relative z-10 flex flex-wrap justify-center gap-6 pb-8 text-center text-xs text-neutral-400">
        <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Private & Secure</span>
        <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Multi-site scrape</span>
        <span className="flex items-center gap-1"><Play className="h-3.5 w-3.5" /> Clean player</span>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  right,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-black/5 bg-white/80 py-3 pl-10 pr-10 text-sm outline-none ring-violet-500/30 focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        {right && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400">{right}</span>
        )}
      </div>
    </div>
  );
}
