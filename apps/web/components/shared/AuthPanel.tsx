"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

export function AuthPanel({
  title = "Sign in to Korum",
  description = "Enter your phone number — we'll send a one-time code.",
}: {
  title?: string;
  description?: string;
}) {
  const { signInWithOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"request" | "verify">("request");
  const [message, setMessage] = useState<{ text: string; type: "info" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  // Auto-focus OTP field when step changes
  useEffect(() => {
    if (step === "verify") {
      setTimeout(() => otpRef.current?.focus(), 100);
    }
  }, [step]);

  const requestOtp = async () => {
    if (!phone.trim()) {
      setMessage({ text: "Please enter your phone number.", type: "error" });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      await signInWithOtp(phone.trim(), fullName.trim() || undefined);
      setStep("verify");
      setMessage({ text: "Code sent! Check your messages.", type: "info" });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Could not send code.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const completeSignIn = async () => {
    if (!otp.trim()) {
      setMessage({ text: "Please enter the 6-digit code.", type: "error" });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      await verifyOtp(phone.trim(), otp.trim());
      setMessage({ text: "Signed in!", type: "info" });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Incorrect code.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("request");
    setOtp("");
    setMessage(null);
  };

  return (
    <Card title={title} description={description} eyebrow="Authentication">
      <div className="form-grid">
        {step === "request" ? (
          <>
            <label className="label" htmlFor="auth-phone">
              Phone number
              <input
                id="auth-phone"
                className="input"
                type="tel"
                inputMode="tel"
                placeholder="+91 98765 43210"
                value={phone}
                autoComplete="tel"
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void requestOtp(); }}
              />
            </label>
            <label className="label" htmlFor="auth-name">
              Your name <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(optional)</span>
              <input
                id="auth-name"
                className="input"
                type="text"
                placeholder="Arjun Sharma"
                value={fullName}
                autoComplete="name"
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void requestOtp(); }}
              />
            </label>
            <Button onClick={() => void requestOtp()} loading={loading} block>
              Send Code
            </Button>
          </>
        ) : (
          <>
            <label className="label" htmlFor="auth-otp">
              6-digit code
              <input
                id="auth-otp"
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
                onKeyDown={(e) => { if (e.key === "Enter") void completeSignIn(); }}
              />
            </label>
            <Button onClick={() => void completeSignIn()} loading={loading} block>
              Verify Code
            </Button>
            <Button variant="ghost" onClick={handleBack} block>
              ← Use a different number
            </Button>
          </>
        )}

        {message && (
          <p
            className={`message-strip${message.type === "error" ? " error" : ""}`}
            role={message.type === "error" ? "alert" : "status"}
          >
            {message.text}
          </p>
        )}
      </div>
    </Card>
  );
}
