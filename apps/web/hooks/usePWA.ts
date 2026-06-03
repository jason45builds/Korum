"use client";

import { useEffect } from "react";

/**
 * Registers the Korum service worker and sets up push notification subscription.
 * Call this once in the root layout (client component wrapper).
 */
export function usePWA() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.log("[Korum SW] registered, scope:", reg.scope);

        // Listen for updates — prompt user to refresh when new version available
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              // New content is available — dispatch event for the UI to handle
              window.dispatchEvent(new CustomEvent("korum:sw-update"));
            }
          });
        });
      } catch (e) {
        console.warn("[Korum SW] registration failed:", e);
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }
  }, []);
}

/**
 * Request push notification permission and subscribe.
 * Returns the PushSubscription or null.
 */
export async function requestPushPermission(): Promise<PushSubscription | null> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const reg = await navigator.serviceWorker.ready;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    console.warn("[Korum Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
    return null;
  }

  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    // Send subscription to our backend
    await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(sub),
    });

    return sub;
  } catch (e) {
    console.warn("[Korum Push] subscription failed:", e);
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
