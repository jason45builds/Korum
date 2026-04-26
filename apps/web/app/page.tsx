"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* ─────────────────────────────────────────────────────────────────────────────
   Korum Landing Page
   Phases:
   1. Splash  (0–1.8s)  — logo animates in, brand name fades up
   2. Tagline (1.8–2.8s)— "Build the squad before kickoff" slides in
   3. CTA     (2.8s+)   — Three buttons appear + marketing content scrolls in
───────────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1600);
    const t3 = setTimeout(() => setPhase(3), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <>
      <style>{`
        /* Hide the app chrome on the landing page */
        .app-header, .bottom-nav { display: none !important; }
        main { padding: 0 !important; max-width: 100% !important; min-height: 100dvh !important; }

        /* Landing animations */
        @keyframes logoIn   { from { opacity:0; transform:scale(0.6) rotate(-8deg); } to { opacity:1; transform:scale(1) rotate(0deg); } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(20px); }         to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; }                                     to { opacity:1; } }
        @keyframes pulse    { 0%,100%{transform:scale(1);} 50%{transform:scale(1.04);} }
        @keyframes shimmer  { from{background-position:200% center;} to{background-position:-200% center;} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(32px);} to{opacity:1;transform:translateY(0);} }
        @keyframes drawLine { from{stroke-dashoffset:1000;} to{stroke-dashoffset:0;} }

        .logo-anim    { animation: logoIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both; }
        .brand-anim   { animation: fadeUp 0.6s ease both; }
        .tagline-anim { animation: fadeUp 0.7s ease both; }
        .cta-anim     { animation: fadeUp 0.6s ease both; }
        .card-anim-1  { animation: slideUp 0.6s ease 0.05s both; }
        .card-anim-2  { animation: slideUp 0.6s ease 0.15s both; }
        .card-anim-3  { animation: slideUp 0.6s ease 0.25s both; }
        .card-anim-4  { animation: slideUp 0.6s ease 0.35s both; }
        .card-anim-5  { animation: slideUp 0.6s ease 0.45s both; }
        .card-anim-6  { animation: slideUp 0.6s ease 0.55s both; }

        .shimmer-text {
          background: linear-gradient(90deg, #fff 30%, rgba(255,255,255,0.55) 50%, #fff 70%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }

        .pill-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 28px; border-radius: 999px;
          font-family: var(--font-display, 'Syne'); font-weight: 800; font-size: 16px;
          cursor: pointer; border: none; min-height: 54px;
          transition: transform 150ms, box-shadow 150ms;
          -webkit-tap-highlight-color: transparent;
          text-decoration: none;
        }
        .pill-btn:active { transform: scale(0.96); }
        .pill-btn--primary  { background: #fff; color: #2563eb; box-shadow: 0 4px 24px rgba(0,0,0,0.18); }
        .pill-btn--outline  { background: transparent; color: #fff; border: 2px solid rgba(255,255,255,0.5); }
        .pill-btn--ghost    { background: rgba(255,255,255,0.12); color: #fff; backdrop-filter: blur(8px); }
        .pill-btn--primary:hover  { box-shadow: 0 8px 32px rgba(0,0,0,0.22); transform: translateY(-1px); }
        .pill-btn--outline:hover  { border-color: #fff; background: rgba(255,255,255,0.08); }

        .feature-card {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 24px 20px;
          backdrop-filter: blur(12px);
        }

        .step-num {
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display, 'Syne'); font-weight: 900; font-size: 14px;
          color: #fff; flex-shrink: 0;
          border: 1px solid rgba(255,255,255,0.2);
        }

        .stat-box {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 16px; padding: 20px 16px; text-align: center;
          backdrop-filter: blur(8px);
        }

        .divider-line { height: 1px; background: rgba(255,255,255,0.12); margin: 0; }

        /* Scroll section (white bg) */
        .scroll-section { background: #fff; }
        .scroll-card {
          border: 1px solid #e5e9ef;
          border-radius: 20px;
          padding: 24px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(13,20,33,0.06);
        }

        @media (max-width: 480px) {
          .pill-btn { padding: 13px 22px; font-size: 15px; min-height: 50px; }
        }
      `}</style>

      <main style={{ background: "linear-gradient(145deg, #1a3a8f 0%, #2563eb 40%, #1d4ed8 70%, #1e1b4b 100%)", minHeight: "100dvh", overflow: "hidden auto" }}>

        {/* ══════════════════════════════════════════════════════════════
            PHASE 0–2 : SPLASH SCREEN
        ══════════════════════════════════════════════════════════════ */}
        <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", textAlign: "center" }}>

          {/* Logo mark */}
          <div className={phase >= 1 ? "logo-anim" : ""} style={{ opacity: phase >= 1 ? 1 : 0, marginBottom: 24 }}>
            <div style={{
              width: 88, height: 88, borderRadius: 24,
              background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 12px 48px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)",
              animation: phase >= 2 ? "pulse 3s ease-in-out infinite" : "none",
            }}>
              <span style={{ fontFamily: "var(--font-display, 'Syne')", fontWeight: 900, fontSize: 44, color: "#2563eb", lineHeight: 1 }}>K</span>
            </div>
          </div>

          {/* Brand name */}
          <div className={phase >= 1 ? "brand-anim" : ""} style={{ opacity: phase >= 1 ? 1 : 0, marginBottom: 8 }}>
            <h1 className="shimmer-text" style={{ fontFamily: "var(--font-display, 'Syne')", fontWeight: 900, fontSize: "clamp(42px, 12vw, 72px)", lineHeight: 1, letterSpacing: "-0.02em", margin: 0 }}>
              Korum
            </h1>
          </div>

          {/* Tagline */}
          <div className={phase >= 2 ? "tagline-anim" : ""} style={{ opacity: phase >= 2 ? 1 : 0, marginBottom: 48 }}>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "clamp(16px, 4.5vw, 20px)", fontWeight: 500, lineHeight: 1.4, margin: 0, maxWidth: 340 }}>
              Build the squad before kickoff.
            </p>
          </div>

          {/* CTAs */}
          {phase >= 3 && (
            <div className="cta-anim" style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 360 }}>
              <Link href="/auth" className="pill-btn pill-btn--primary">
                Create Account / Sign In
              </Link>
              <Link href="/dashboard" className="pill-btn pill-btn--outline">
                Explore as Guest
              </Link>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, margin: "8px 0 0" }}>
                No account needed to view matches
              </p>
            </div>
          )}

          {/* Scroll indicator */}
          {phase >= 3 && (
            <div className="cta-anim" style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.5 }}>
              <p style={{ color: "#fff", fontSize: 11, fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Scroll to explore</p>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            MARKETING CONTENT (scrolls below the fold)
        ══════════════════════════════════════════════════════════════ */}
        {phase >= 3 && (
          <>

            {/* ── HOW IT WORKS ── */}
            <section style={{ padding: "64px 20px", maxWidth: 520, margin: "0 auto" }}>
              <p style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", textAlign: "center", marginBottom: 16 }}>
                How it works
              </p>
              <h2 style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(26px, 7vw, 38px)", textAlign: "center", lineHeight: 1.15, marginBottom: 40 }}>
                From WhatsApp chaos to<br />confirmed squads
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { n: "1", icon: "📣", title: "Captain creates a match", sub: "Set date, venue, squad size, and cost. Takes 30 seconds." },
                  { n: "2", icon: "🔗", title: "Share one link to WhatsApp", sub: "Players tap it — no app download needed. See match info instantly." },
                  { n: "3", icon: "✅", title: "Players tap I'm In", sub: "Name, response, payment — three taps. Spot is claimed." },
                  { n: "4", icon: "💰", title: "Pay via UPI or Razorpay", sub: "Money goes to captain. No chasing. No spreadsheets." },
                  { n: "5", icon: "🔒", title: "Squad locks automatically", sub: "Once full and paid, everyone gets notified. Match is on." },
                ].map(({ n, icon, title, sub }) => (
                  <div key={n} className={`card-anim-${n}`} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "20px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 18 }}>
                    <div className="step-num">{n}</div>
                    <div>
                      <p style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, margin: "0 0 4px" }}>
                        <span style={{ marginRight: 8 }}>{icon}</span>{title}
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, margin: 0, lineHeight: 1.5 }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── WHO IT'S FOR ── */}
            <section style={{ padding: "0 20px 64px", maxWidth: 520, margin: "0 auto" }}>
              <p style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", textAlign: "center", marginBottom: 16 }}>
                Built for
              </p>
              <h2 style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(26px, 7vw, 36px)", textAlign: "center", lineHeight: 1.15, marginBottom: 32 }}>
                Every sport, every squad
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { icon: "🏏", sport: "Cricket", desc: "11-a-side confirmed" },
                  { icon: "⚽", sport: "Football", desc: "7s and 11s sorted" },
                  { icon: "🏀", sport: "Basketball", desc: "5-a-side locked" },
                  { icon: "🏐", sport: "Volleyball", desc: "Court bookings done" },
                  { icon: "🏑", sport: "Hockey", desc: "Squad ready" },
                  { icon: "🎾", sport: "Tennis", desc: "Doubles confirmed" },
                ].map(({ icon, sport, desc }) => (
                  <div key={sport} className="feature-card card-anim-1" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 28, flexShrink: 0 }}>{icon}</span>
                    <div>
                      <p style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, margin: "0 0 2px" }}>{sport}</p>
                      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, margin: 0 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── FOR CAPTAINS ── */}
            <section style={{ padding: "0 20px 64px", maxWidth: 520, margin: "0 auto" }}>
              <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 24, padding: "32px 24px" }}>
                <p style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                  Captain tools
                </p>
                <h2 style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 26, lineHeight: 1.2, marginBottom: 24 }}>
                  Everything you need to run the match
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    ["📅", "Create fixtures in 30 seconds"],
                    ["💰", "Collect payments — UPI or Razorpay"],
                    ["👥", "Track confirmed vs pending players"],
                    ["📩", "Invite players directly by phone"],
                    ["📋", "Check who's available before booking"],
                    ["🧠", "Strategy room after squad locks"],
                    ["🔒", "Auto-lock when squad fills"],
                    ["📊", "Reliability scores for every player"],
                  ].map(([icon, text]) => (
                    <div key={text as string} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{icon}</span>
                      <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, margin: 0, fontWeight: 500 }}>{text as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── FOR PLAYERS ── */}
            <section style={{ padding: "0 20px 64px", maxWidth: 520, margin: "0 auto" }}>
              <div style={{ background: "rgba(22,163,74,0.15)", border: "1px solid rgba(22,163,74,0.35)", borderRadius: 24, padding: "32px 24px" }}>
                <p style={{ color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                  Player experience
                </p>
                <h2 style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 26, lineHeight: 1.2, marginBottom: 24 }}>
                  Three taps from link to confirmed
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    ["🔗", "Open captain's link — no download needed"],
                    ["✅", "Tap I'm In and add your name"],
                    ["💸", "Pay instantly via any UPI app"],
                    ["🔒", "Get confirmed. Spot is yours."],
                    ["📣", "Get notified when match locks"],
                    ["🧠", "Access strategy room after lock"],
                  ].map(([icon, text]) => (
                    <div key={text as string} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>{icon}</span>
                      <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, margin: 0, fontWeight: 500 }}>{text as string}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── STATS ── */}
            <section style={{ padding: "0 20px 64px", maxWidth: 520, margin: "0 auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { num: "30s", label: "To create a match" },
                  { num: "3", label: "Taps to confirm as player" },
                  { num: "0", label: "Chasing messages needed" },
                  { num: "∞", label: "Sports supported" },
                ].map(({ num, label }) => (
                  <div key={label} className="stat-box">
                    <p style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 36, margin: "0 0 6px", lineHeight: 1 }}>{num}</p>
                    <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, margin: 0, fontWeight: 500 }}>{label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── FINAL CTA ── */}
            <section style={{ padding: "0 20px 80px", maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
              <h2 style={{ color: "#fff", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "clamp(28px, 7vw, 40px)", lineHeight: 1.15, marginBottom: 12 }}>
                Ready to stop chasing?
              </h2>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 16, marginBottom: 32, lineHeight: 1.5 }}>
                Join thousands of captains who run their squads on Korum.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Link href="/auth" className="pill-btn pill-btn--primary" style={{ width: "100%" }}>
                  Get Started — It&apos;s Free
                </Link>
                <Link href="/dashboard" className="pill-btn pill-btn--ghost" style={{ width: "100%" }}>
                  Explore as Guest
                </Link>
              </div>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 24 }}>
                No credit card. No download required for players.
              </p>
            </section>

          </>
        )}
      </main>
    </>
  );
}
