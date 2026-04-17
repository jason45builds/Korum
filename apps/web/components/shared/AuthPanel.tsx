"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

type Mode = "email" | "phone";
type Step = "credentials" | "otp";

export function AuthPanel({
  title = "Sign in to Korum",
  description = "Enter your email and password to continue.",
}: {
  title?: string;
  description?: string;
}) {
  const { signInWithEmail, signUpWithEmail, signInWithOtp, verifyOtp } = useAuth();

  const [mode, setMode] = useState<Mode>("email");
  const [step, setStep] = useState<Step>("credentials");

  // Email fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Phone fields
  const [phone, setPhone] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "otp") setTimeout(() => otpRef.current?.focus(), 80);
  }, [step]);

  const handleEmailSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage({ text: "Enter your email and password.", error: true });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password, fullName.trim() || undefined);
        setMessage({ text: "Account created! You are now signed in.", error: false });
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Sign in failed.", error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      setMessage({ text: "Enter your phone number.", error: true });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await signInWithOtp(phone.trim(), phoneName.trim() || undefined);
      setStep("otp");
      setMessage({ text: "Code sent! Check your messages.", error: false });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not send code.", error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setMessage({ text: "Enter the 6-digit code.", error: true });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await verifyOtp(phone.trim(), otp.trim());
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Incorrect code.", error: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title={title} description={description} eyebrow="Authentication">

      {/* Mode tabs */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.4rem",
        padding: "0.3rem",
        background: "var(--surface-muted)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--line)",
      }}>
        {(["email", "phone"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setStep("credentials"); setMessage(null); }}
            style={{
              padding: "0.6rem",
              borderRadius: "calc(var(--radius-md) - 4px)",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "0.85rem",
              transition: "all 150ms ease",
              background: mode === m ? "var(--surface)" : "transparent",
              color: mode === m ? "var(--primary)" : "var(--text-faint)",
              boxShadow: mode === m ? "var(--shadow-sm)" : "none",
            }}
          >
            {m === "email" ? "📧 Email" : "📱 Phone OTP"}
          </button>
        ))}
      </div>

      {/* Email/Password form */}
      {mode === "email" && (
        <div className="form-grid">
          {isSignUp && (
            <label className="label">
              Your name <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span>
              <input
                className="input"
                type="text"
                placeholder="Arjun Sharma"
                value={fullName}
                autoComplete="name"
                onChange={(e) => setFullName(e.target.value)}
              />
            </label>
          )}
          <label className="label">
            Email address
            <input
              className="input"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleEmailSubmit(); }}
            />
          </label>
          <label className="label">
            Password
            <input
              className="input"
              type="password"
              placeholder={isSignUp ? "Create a password" : "Your password"}
              value={password}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleEmailSubmit(); }}
            />
          </label>

          <Button onClick={() => void handleEmailSubmit()} loading={loading} block>
            {isSignUp ? "Create Account" : "Sign In"}
          </Button>

          <button
            onClick={() => { setIsSignUp((v) => !v); setMessage(null); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--primary)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "0.88rem",
              textAlign: "center",
              padding: "0.25rem",
            }}
          >
            {isSignUp ? "Already have an account? Sign in" : "No account? Create one"}
          </button>

          {message && (
            <p className={`message-strip${message.error ? " error" : " success"}`} role={message.error ? "alert" : "status"}>
              {message.text}
            </p>
          )}
        </div>
      )}

      {/* Phone OTP form */}
      {mode === "phone" && step === "credentials" && (
        <div className="form-grid">
          <label className="label">
            Phone number
            <input
              className="input"
              type="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={phone}
              autoComplete="tel"
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSendOtp(); }}
            />
          </label>
          <label className="label">
            Your name <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span>
            <input
              className="input"
              type="text"
              placeholder="Arjun Sharma"
              value={phoneName}
              onChange={(e) => setPhoneName(e.target.value)}
            />
          </label>
          <Button onClick={() => void handleSendOtp()} loading={loading} block>
            Send Code
          </Button>
          {message && (
            <p className={`message-strip${message.error ? " error" : " success"}`} role={message.error ? "alert" : "status"}>
              {message.text}
            </p>
          )}
        </div>
      )}

      {mode === "phone" && step === "otp" && (
        <div className="form-grid">
          <label className="label">
            6-digit code
            <input
              className="input"
              ref={otpRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="• • • • • •"
              maxLength={6}
              value={otp}
              autoComplete="one-time-code"
              style={{ letterSpacing: "0.3em", fontSize: "1.2rem", textAlign: "center" }}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") void handleVerifyOtp(); }}
            />
          </label>
          <Button onClick={() => void handleVerifyOtp()} loading={loading} block>
            Verify Code
          </Button>
          <Button variant="ghost" onClick={() => { setStep("credentials"); setOtp(""); setMessage(null); }} block>
            ← Use a different number
          </Button>
          {message && (
            <p className={`message-strip${message.error ? " error" : " success"}`} role={message.error ? "alert" : "status"}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
