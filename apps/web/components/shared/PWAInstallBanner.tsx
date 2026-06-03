"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * PWA Install Banner — shows after 30 seconds of engagement or on second visit.
 * Dismissed state is persisted to localStorage.
 * On iOS (no beforeinstallprompt), shows manual instructions.
 */
export function PWAInstallBanner() {
  const [prompt, setPrompt]       = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow]           = useState(false);
  const [isIOS, setIsIOS]         = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }
    // Dismissed permanently
    if (localStorage.getItem("korum:pwa-dismissed")) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    // Android / Chrome — intercept install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      // Show after 30s engagement
      setTimeout(() => setShow(true), 30_000);
      track("pwa_install_prompted");
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS — show manual instructions after 45s on second+ visit
    if (ios) {
      const visits = parseInt(localStorage.getItem("korum:visits") ?? "0") + 1;
      localStorage.setItem("korum:visits", String(visits));
      if (visits >= 2) setTimeout(() => setShow(true), 45_000);
    }

    // SW update available
    const updateHandler = () => setUpdateAvailable(true);
    window.addEventListener("korum:sw-update", updateHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("korum:sw-update", updateHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      track("pwa_installed");
      setShow(false);
    } else {
      track("push_permission_denied");
    }
    setPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("korum:pwa-dismissed", "1");
  };

  const handleUpdate = () => {
    window.location.reload();
  };

  if (isInstalled) return null;

  // SW update banner — highest priority
  if (updateAvailable) {
    return (
      <div style={{ position: "fixed", bottom: 72, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 448, background: "var(--blue)", color: "#fff", borderRadius: "var(--r-lg)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, zIndex: 200, boxShadow: "0 8px 32px rgba(37,99,235,0.4)", animation: "up 300ms ease both" }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>🆕</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14 }}>Update available</p>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>Reload for the latest version</p>
        </div>
        <button onClick={handleUpdate}
          style={{ padding: "8px 14px", border: "1.5px solid rgba(255,255,255,0.5)", borderRadius: "var(--r-full)", background: "rgba(255,255,255,0.15)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
          Reload
        </button>
      </div>
    );
  }

  if (!show) return null;

  // iOS manual instructions
  if (isIOS) {
    return (
      <div style={{ position: "fixed", bottom: 72, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 448, background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: "var(--r-xl)", padding: "16px", zIndex: 200, boxShadow: "0 8px 40px rgba(0,0,0,0.15)", animation: "up 300ms ease both" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--blue)", display: "grid", placeItems: "center" }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 20, color: "#fff" }}>K</span>
            </div>
            <div>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>Add to Home Screen</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)" }}>Open Korum like an app</p>
            </div>
          </div>
          <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--text-4)", padding: 4, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { icon: "1️⃣", text: 'Tap the Share icon at the bottom of Safari' },
            { icon: "2️⃣", text: 'Scroll down and tap "Add to Home Screen"' },
            { icon: "3️⃣", text: 'Tap "Add" — Korum opens like a native app' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-2)" }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Android / Chrome
  return (
    <div style={{ position: "fixed", bottom: 72, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 448, background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: "var(--r-xl)", padding: "16px", zIndex: 200, boxShadow: "0 8px 40px rgba(0,0,0,0.15)", animation: "up 300ms ease both" }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--blue)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 24, color: "#fff" }}>K</span>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>Add Korum to Home Screen</p>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>Instant access · Works offline · No App Store needed</p>
      </div>
      <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--text-4)", padding: 4, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
      <button onClick={() => void handleInstall()}
        style={{ flex: 1, padding: "12px", border: "none", borderRadius: "var(--r-lg)", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
        📲 Install App
      </button>
      <button onClick={dismiss}
        style={{ flex: 1, padding: "12px", border: "1.5px solid var(--line)", borderRadius: "var(--r-lg)", background: "transparent", color: "var(--text-3)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        Not now
      </button>
    </div>
  </div>
  );
}
