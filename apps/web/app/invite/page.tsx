"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const shareKorum = () => {
  const text = `Hey! I use Korum to manage cricket/football matches — it makes RSVP and payments super easy. Check it out 👉 https://korum.vercel.app`;
  if (navigator.share) {
    void navigator.share({ title: "Korum — Match Readiness", text, url: "https://korum.vercel.app" });
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
};

const shareViaWhatsApp = () => {
  const text = `Hey! I use Korum to manage matches — players RSVP, pay, and the squad is confirmed before kickoff. No more WhatsApp chaos 🏏\n\nJoin me on Korum 👉 https://korum.vercel.app`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
};

export default function InvitePage() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const link = "https://korum.vercel.app";

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <main>
      <div className="page">

        {/* Header */}
        <div style={{ textAlign: "center", paddingTop: 16 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🏏</div>
          <h1 className="t-h2" style={{ marginBottom: 8 }}>Invite Friends</h1>
          <p className="t-body" style={{ color: "var(--text-3)", maxWidth: 320, margin: "0 auto" }}>
            Bring your whole squad onto Korum. No more chasing RSVPs on WhatsApp.
          </p>
        </div>

        {/* Share card */}
        <div className="card card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>
            Share Korum
          </p>

          {/* Link */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, padding: "12px 14px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: 14, color: "var(--text-3)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {link}
            </div>
            <button onClick={() => void copyLink()}
              style={{ flexShrink: 0, padding: "12px 16px", border: "1.5px solid var(--blue-border)", borderRadius: "var(--r-md)", background: "var(--blue-soft)", color: "var(--blue)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>

          {/* WhatsApp primary */}
          <button
            onClick={shareViaWhatsApp}
            style={{ width: "100%", minHeight: 52, border: "none", borderRadius: "var(--r-lg)", background: "#25D366", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Share on WhatsApp
          </button>

          {/* Native share fallback */}
          {typeof navigator !== "undefined" && !!navigator.share && (
            <button onClick={shareKorum}
              style={{ width: "100%", minHeight: 48, border: "1.5px solid var(--line)", borderRadius: "var(--r-lg)", background: "var(--surface)", color: "var(--text)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              📤 More options…
            </button>
          )}
        </div>

        {/* Why invite */}
        <div className="card" style={{ overflow: "hidden" }}>
          {[
            { icon: "✅", title: "No more counting replies", sub: "Everyone RSVPs in the app, captain sees totals live" },
            { icon: "💰", title: "Payments sorted", sub: "Players pay via UPI or Razorpay — no chasing" },
            { icon: "🔒", title: "Squad locks automatically", sub: "Once full and paid, everyone's confirmed" },
            { icon: "🧠", title: "Strategy room", sub: "Post-lock coordination in the app, not WhatsApp" },
          ].map(({ icon, title, sub }, i, arr) => (
            <div key={title} style={{ display: "flex", gap: 14, padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none", alignItems: "flex-start" }}>
              <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</span>
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{title}</p>
                <p className="t-caption" style={{ marginTop: 3 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
