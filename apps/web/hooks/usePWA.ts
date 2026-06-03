"use client";

import { useEffect } from "react";

export function usePWA() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.log("[Korum SW] registered, scope:", reg.scope);

        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
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
      // Cast to ArrayBuffer to satisfy the strict Uint8Array<ArrayBuffer> requirement
      applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
    });

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
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output  = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
