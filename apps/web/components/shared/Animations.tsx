"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Confetti burst for key celebration moments:
 * - Squad locked 🔒
 * - Payment confirmed ✅
 * - Team joined 🎉
 * - Match created 🏏
 *
 * Pure CSS + JS, no external dependency.
 */

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  shape: "rect" | "circle" | "strip";
  opacity: number;
};

const COLORS = [
  "#2563EB", "#16A34A", "#D97706", "#DC2626",
  "#7C3AED", "#0891B2", "#BE185D", "#65A30D",
  "#F59E0B", "#10B981",
];

function makeParticle(id: number, cx: number, cy: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = 4 + Math.random() * 6;
  return {
    id, x: cx, y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 12,
    shape: (["rect","circle","strip"] as const)[Math.floor(Math.random() * 3)],
    opacity: 1,
  };
}

interface ConfettiProps {
  active: boolean;
  count?: number;
  /** Origin as percentage of viewport: default center-top [50, 40] */
  origin?: [number, number];
}

export function Confetti({ active, count = 60, origin = [50, 40] }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;

    const cx = (origin[0] / 100) * window.innerWidth;
    const cy = (origin[1] / 100) * window.innerHeight;
    let ps = Array.from({ length: count }, (_, i) => makeParticle(i, cx, cy));
    setParticles(ps);

    const tick = () => {
      ps = ps.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.22, // gravity
        vx: p.vx * 0.99, // air resistance
        rotation: p.rotation + p.rotSpeed,
        opacity: p.y > window.innerHeight * 0.85 ? Math.max(0, p.opacity - 0.06) : p.opacity,
      })).filter(p => p.opacity > 0);
      setParticles([...ps]);
      if (ps.length > 0) rafRef.current = requestAnimationFrame(tick);
      else startedRef.current = false;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active]);

  if (!active && particles.length === 0) return null;

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: p.x,
          top: p.y,
          width: p.shape === "strip" ? p.size * 0.4 : p.size,
          height: p.shape === "strip" ? p.size * 2 : p.size,
          borderRadius: p.shape === "circle" ? "50%" : p.shape === "strip" ? 2 : 2,
          background: p.color,
          opacity: p.opacity,
          transform: `translate(-50%,-50%) rotate(${p.rotation}deg)`,
          willChange: "transform, opacity",
        }} />
      ))}
    </div>
  );
}

/**
 * Success pulse — green ring that expands and fades.
 * Use on buttons after confirmation.
 */
export function SuccessPulse({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div style={{
      position: "absolute",
      inset: -4,
      borderRadius: "inherit",
      border: "2px solid var(--green)",
      animation: "pulse-ring 600ms ease-out forwards",
      pointerEvents: "none",
    }}>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/**
 * Count-up animation — for numbers that change (confirmed players, payment amount)
 */
export function CountUp({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef  = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to   = value;
    if (from === to) return;

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    requestAnimationFrame(tick);
  }, [value, duration]);

  return <>{display}</>;
}

/**
 * Haptic feedback — triggers device vibration on key actions.
 * Graceful no-op on unsupported browsers.
 */
export function haptic(pattern: "light" | "medium" | "success" | "error" = "light") {
  if (!("vibrate" in navigator)) return;
  const patterns = {
    light:   [30],
    medium:  [60],
    success: [40, 30, 80],
    error:   [100, 50, 100],
  };
  navigator.vibrate(patterns[pattern]);
}
