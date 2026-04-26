"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/shared/Loader";

// ── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | "landing"       // Choose phone or email
  | "phone-number"  // Enter phone
  | "phone-otp"     // Enter OTP
  | "email-form"    // Email + password
  | "onboarding";   // First-time name + role after signup

// ── Animations ───────────────────────────────────────────────────────────────
const slideIn: React.CSSProperties = {
  animation: "slideUp 0.28s cubic-bezier(0.22,1,0.36,1) both",
};

// ── Main ─────────────────────────────────────────────────────────────────────
function AuthContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading, signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp, saveProfile } = useAuth();

  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const reason   = searchParams.get("reason") ?? "";

  const [screen, setScreen]   = useState<Screen>("landing");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // Phone OTP fields
  const [phone, setPhone]     = useState("");
  const [otp, setOtp]         = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Email fields
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Onboarding fields
  const [displayName, setDisplayName] = useState("");
  const [role, setRole]               = useState<"captain" | "player">("player");
  const [sport, setSport]             = useState("");

  // OTP inputs — 6 individual boxes
  const [otpDigits, setOtpDigits] = useState(["","","","","",""]);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirect);
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading) return <Loader label="Checking session…" />;
  if (isAuthenticated) return <Loader label="Redirecting…" />;

  const err = (msg: string) => { setError(msg); setLoading(false); };
  const clearErr = () => setError(null);

  // ── Phone: send OTP ─────────────────────────────────────────────────────
  const sendOtp = async () => {
    if (!phone.trim() || phone.trim().length < 10) return err("Enter a valid phone number");
    setLoading(true); clearErr();
    try {
      const formatted = phone.startsWith("+") ? phone.trim() : `+91${phone.trim().replace(/\s/g, "")}`;
      await signInWithOtp(formatted);
      setPhone(formatted);
      setOtpSent(true);
      setScreen("phone-otp");
      setTimeout(() => digitRefs.current[0]?.focus(), 120);
    } catch (e) { err(e instanceof Error ? e.message : "Failed to send OTP"); }
    finally { setLoading(false); }
  };

  // ── Phone: verify OTP ───────────────────────────────────────────────────
  const verifyCode = async () => {
    const code = otpDigits.join("");
    if (code.length < 6) return err("Enter the complete 6-digit code");
    setLoading(true); clearErr();
    try {
      await verifyOtp(phone, code);
      // After verifyOtp the auth state listener triggers — check if new user
      setIsNewUser(true);
      setScreen("onboarding");
    } catch (e) { err(e instanceof Error ? e.message : "Incorrect code. Try again."); }
    finally { setLoading(false); }
  };

  // ── Email: sign in or sign up ────────────────────────────────────────────
  const submitEmail = async () => {
    if (!email.trim() || !password.trim()) return err("Enter email and password");
    if (isSignUp && password.length < 8) return err("Password must be at least 8 characters");
    setLoading(true); clearErr();
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password);
        setIsNewUser(true);
        setScreen("onboarding");
      } else {
        await signInWithEmail(email.trim(), password);
        router.replace(redirect);
      }
    } catch (e) { err(e instanceof Error ? e.message : "Sign in failed"); }
    finally { setLoading(false); }
  };

  // ── Onboarding: save profile ─────────────────────────────────────────────
  const finishOnboarding = async () => {
    if (!displayName.trim()) return err("Enter your name");
    setLoading(true); clearErr();
    try {
      await saveProfile({ fullName: displayName.trim(), displayName: displayName.trim(), role, defaultSport: sport || null });
      router.replace(redirect);
    } catch (e) { err(e instanceof Error ? e.message : "Failed to save"); }
    finally { setLoading(false); }
  };

  // ── OTP digit boxes ──────────────────────────────────────────────────────
  const handleDigit = (i: number, val: string) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[i] = d;
    setOtpDigits(next);
    if (d && i < 5) digitRefs.current[i + 1]?.focus();
    if (i === 5 && d) {
      // Auto-verify when last digit entered
      const code = next.join("");
      if (code.length === 6) {
        setOtpDigits(next);
        setTimeout(() => void verifyCode(), 80);
      }
    }
  };
  const handleDigitKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[i] && i > 0) {
      digitRefs.current[i - 1]?.focus();
    }
  };
  const handleDigitPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length === 6) {
      setOtpDigits(text.split(""));
      setTimeout(() => void verifyCode(), 80);
    }
  };

  const SPORTS = ["Cricket","Football","Basketball","Volleyball","Hockey","Tennis","Badminton","Kabaddi"];

  // ── Reason banner ────────────────────────────────────────────────────────
  const reasonMap: Record<string, string> = {
    join:    "Sign in to claim your spot",
    pay:     "Sign in to complete payment",
    team:    "Sign in to access the team",
    captain: "Sign in to manage your match",
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <style>{`
        @keyframes slideUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        .otp-box {
          width: 44px; height: 54px; border: 2px solid var(--line); border-radius: 12px;
          text-align: center; font-size: 22px; font-family: var(--font-display); font-weight: 800;
          background: var(--surface); color: var(--text); outline: none;
          transition: border-color 150ms, box-shadow 150ms; caret-color: var(--blue);
        }
        .otp-box:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
        .otp-box:not(:placeholder-shown) { border-color: var(--green); background: var(--green-soft); }
        .auth-btn-primary {
          width: 100%; min-height: 52px; border: none; border-radius: var(--r-lg);
          background: var(--blue); color: #fff; font-family: var(--font-display);
          font-weight: 800; font-size: 16px; cursor: pointer; transition: opacity 150ms, transform 150ms;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .auth-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
        .auth-btn-primary:not(:disabled):active { transform: scale(0.97); }
        .auth-btn-secondary {
          width: 100%; min-height: 48px; border: 1.5px solid var(--line); border-radius: var(--r-lg);
          background: var(--surface); color: var(--text); font-family: var(--font-display);
          font-weight: 700; font-size: 15px; cursor: pointer; transition: border-color 150ms;
        }
        .auth-btn-secondary:hover { border-color: var(--blue); }
        .auth-input {
          width: 100%; padding: 14px 16px; border: 1.5px solid var(--line); border-radius: var(--r-md);
          font-size: 16px; font-family: inherit; background: var(--surface); color: var(--text);
          outline: none; box-sizing: border-box; transition: border-color 150ms, box-shadow 150ms;
        }
        .auth-input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        .role-chip {
          flex: 1; padding: 14px 10px; border: 2px solid var(--line); border-radius: var(--r-lg);
          background: var(--surface); font-family: var(--font-display); font-weight: 700;
          font-size: 14px; cursor: pointer; text-align: center; transition: all 150ms;
          display: flex; flex-direction: column; align-items: center; gap: 6px;
        }
        .role-chip.active { border-color: var(--blue); background: var(--blue-soft); color: var(--blue); }
      `}</style>

      {/* Back button + header */}
      <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        {screen !== "landing" && screen !== "onboarding" && (
          <button onClick={() => { setScreen("landing"); clearErr(); setOtpDigits(["","","","","",""]); }}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", borderRadius: "var(--r-md)", color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            Back
          </button>
        )}
        <div style={{ flex: 1 }} />
        {screen === "landing" && (
          <button onClick={() => router.push(redirect === "/dashboard" ? "/dashboard" : redirect)}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "var(--text-3)", padding: "8px" }}>
            Skip for now →
          </button>
        )}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 20px 40px", maxWidth: 420, width: "100%", margin: "0 auto" }}>

        {/* Reason banner */}
        {reason && reasonMap[reason] && screen === "landing" && (
          <div style={{ padding: "10px 14px", background: "var(--blue-soft)", border: "1px solid var(--blue-border)", borderRadius: "var(--r-md)", marginBottom: 20, fontSize: 13, fontWeight: 600, color: "var(--blue)", animation: "fadeIn 0.3s ease" }}>
            🔐 {reasonMap[reason]}
          </div>
        )}

        {/* ══ SCREEN: LANDING ══════════════════════════════════════════════ */}
        {screen === "landing" && (
          <div style={slideIn}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--blue)", display: "grid", placeItems: "center", boxShadow: "0 4px 16px var(--blue-glow)" }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, color: "#fff" }}>K</span>
              </div>
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em" }}>Korum</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)" }}>Match Readiness Platform</p>
              </div>
            </div>

            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(26px, 7vw, 34px)", lineHeight: 1.15, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
              Welcome back
            </h1>
            <p style={{ color: "var(--text-3)", fontSize: 15, margin: "0 0 32px", lineHeight: 1.6 }}>
              Sign in to manage your squad, track payments, and never miss a match.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Phone — primary */}
              <button className="auth-btn-primary" onClick={() => { clearErr(); setScreen("phone-number"); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.16 6.16l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92" /></svg>
                Continue with Phone
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
                <span style={{ fontSize: 12, color: "var(--text-4)", fontWeight: 600 }}>or</span>
                <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
              </div>

              {/* Email — secondary */}
              <button className="auth-btn-secondary" onClick={() => { clearErr(); setScreen("email-form"); }}>
                📧 Continue with Email
              </button>
            </div>

            <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-4)", marginTop: 24, lineHeight: 1.6 }}>
              By continuing you agree to Korum&apos;s Terms of Service and Privacy Policy.
            </p>
          </div>
        )}

        {/* ══ SCREEN: PHONE NUMBER ═════════════════════════════════════════ */}
        {screen === "phone-number" && (
          <div style={slideIn}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 26, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              Enter your number
            </h2>
            <p style={{ color: "var(--text-3)", fontSize: 14, margin: "0 0 28px" }}>
              We&apos;ll send a one-time code to verify your identity.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Phone input with +91 prefix */}
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text-2)", pointerEvents: "none" }}>
                  +91
                </div>
                <input
                  className="auth-input"
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={phone.startsWith("+91") ? phone.slice(3) : phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={e => { if (e.key === "Enter") void sendOtp(); }}
                  autoFocus
                  style={{ paddingLeft: 52 }}
                />
              </div>

              {error && <p style={{ margin: 0, color: "var(--red)", fontSize: 13, fontWeight: 600 }}>{error}</p>}

              <button className="auth-btn-primary" disabled={loading || phone.length < 10} onClick={() => void sendOtp()}>
                {loading ? <><Spinner /> Sending…</> : "Send Code →"}
              </button>
            </div>
          </div>
        )}

        {/* ══ SCREEN: PHONE OTP ════════════════════════════════════════════ */}
        {screen === "phone-otp" && (
          <div style={slideIn}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 26, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              Check your messages
            </h2>
            <p style={{ color: "var(--text-3)", fontSize: 14, margin: "0 0 28px" }}>
              We sent a 6-digit code to <strong style={{ color: "var(--text)" }}>{phone}</strong>
            </p>

            {/* 6 digit boxes */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}
              onPaste={handleDigitPaste}>
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { digitRefs.current[i] = el; }}
                  className="otp-box"
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  placeholder="·"
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleDigitKey(i, e)}
                />
              ))}
            </div>

            {error && <p style={{ margin: "0 0 12px", color: "var(--red)", fontSize: 13, fontWeight: 600, textAlign: "center" }}>{error}</p>}

            <button className="auth-btn-primary" disabled={loading || otpDigits.join("").length < 6} onClick={() => void verifyCode()}>
              {loading ? <><Spinner /> Verifying…</> : "Verify & Continue →"}
            </button>

            {/* Resend */}
            <button onClick={() => { setOtpDigits(["","","","","",""]); void sendOtp(); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--blue)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, marginTop: 20, width: "100%", textAlign: "center" }}>
              Didn&apos;t get a code? Resend
            </button>
          </div>
        )}

        {/* ══ SCREEN: EMAIL ════════════════════════════════════════════════ */}
        {screen === "email-form" && (
          <div style={slideIn}>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 26, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              {isSignUp ? "Create account" : "Sign in"}
            </h2>
            <p style={{ color: "var(--text-3)", fontSize: 14, margin: "0 0 28px" }}>
              {isSignUp ? "Join Korum to manage matches and squads." : "Welcome back. Enter your credentials."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="field">
                <label style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-2)", marginBottom: 6 }}>Email</label>
                <input className="auth-input" type="email" inputMode="email" placeholder="you@example.com"
                  value={email} autoComplete="email"
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") void submitEmail(); }} />
              </div>

              <div className="field">
                <label style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-2)", marginBottom: 6 }}>
                  Password {isSignUp && <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(min 8 chars)</span>}
                </label>
                <input className="auth-input" type="password"
                  placeholder={isSignUp ? "Create a password" : "Your password"}
                  value={password}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") void submitEmail(); }} />
              </div>

              {error && <p style={{ margin: 0, color: "var(--red)", fontSize: 13, fontWeight: 600 }}>{error}</p>}

              <button className="auth-btn-primary" disabled={loading} onClick={() => void submitEmail()}>
                {loading ? <><Spinner /> {isSignUp ? "Creating…" : "Signing in…"}</> : isSignUp ? "Create Account →" : "Sign In →"}
              </button>

              <button onClick={() => { setIsSignUp(v => !v); clearErr(); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--blue)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, textAlign: "center", padding: "4px" }}>
                {isSignUp ? "Already have an account? Sign in" : "New to Korum? Create account"}
              </button>
            </div>
          </div>
        )}

        {/* ══ SCREEN: ONBOARDING ═══════════════════════════════════════════ */}
        {screen === "onboarding" && (
          <div style={slideIn}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>👋</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 26, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              Let&apos;s set you up
            </h2>
            <p style={{ color: "var(--text-3)", fontSize: 14, margin: "0 0 28px" }}>
              Takes 10 seconds. You can change this anytime.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Name */}
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-2)", marginBottom: 6 }}>
                  Your name *
                </label>
                <input className="auth-input" type="text" placeholder="Arjun Sharma"
                  value={displayName} autoFocus
                  onChange={e => setDisplayName(e.target.value)} />
              </div>

              {/* Role */}
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-2)", marginBottom: 10 }}>
                  I mainly…
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className={`role-chip${role === "captain" ? " active" : ""}`}
                    onClick={() => setRole("captain")}>
                    <span style={{ fontSize: 28 }}>⚡</span>
                    <span>Run the team</span>
                    <span style={{ fontSize: 11, fontWeight: 400, color: role === "captain" ? "var(--blue)" : "var(--text-4)" }}>Captain / Admin</span>
                  </button>
                  <button className={`role-chip${role === "player" ? " active" : ""}`}
                    onClick={() => setRole("player")}>
                    <span style={{ fontSize: 28 }}>🏃</span>
                    <span>Just play</span>
                    <span style={{ fontSize: 11, fontWeight: 400, color: role === "player" ? "var(--blue)" : "var(--text-4)" }}>Player</span>
                  </button>
                </div>
              </div>

              {/* Sport */}
              <div>
                <label style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>
                  Favourite sport <span style={{ fontWeight: 400, color: "var(--text-4)" }}>(optional)</span>
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SPORTS.map(s => (
                    <button key={s} onClick={() => setSport(sport === s ? "" : s)}
                      style={{ padding: "8px 14px", borderRadius: "var(--r-full)", border: "1.5px solid", borderColor: sport === s ? "var(--blue)" : "var(--line)", background: sport === s ? "var(--blue-soft)" : "var(--surface)", color: sport === s ? "var(--blue)" : "var(--text-3)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 120ms" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p style={{ margin: 0, color: "var(--red)", fontSize: 13, fontWeight: 600 }}>{error}</p>}

              <button className="auth-btn-primary" disabled={loading || !displayName.trim()} onClick={() => void finishOnboarding()}>
                {loading ? <><Spinner /> Saving…</> : "Get Started →"}
              </button>

              <button onClick={() => router.replace(redirect)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-4)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, textAlign: "center" }}>
                Skip for now
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}><Loader label="Loading…" /></div>}>
      <AuthContent />
    </Suspense>
  );
}
