"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size    = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  block?: boolean;
  loading?: boolean;
  size?: Size;
};

const V: Record<Variant, { bg: string; color: string; border: string }> = {
  primary:   { bg: "var(--blue)",    color: "#fff",              border: "var(--blue)"    },
  secondary: { bg: "transparent",    color: "var(--blue)",       border: "var(--blue)"    },
  ghost:     { bg: "transparent",    color: "var(--text-3)",     border: "var(--line)"    },
  danger:    { bg: "var(--red)",      color: "#fff",              border: "var(--red)"     },
  success:   { bg: "var(--green)",    color: "#fff",              border: "var(--green)"   },
};

const SZ: Record<Size, { p: string; h: string; fs: string; r: string }> = {
  sm: { p: "0.5rem 0.95rem",  h: "36px", fs: "0.82rem", r: "var(--r-sm)" },
  md: { p: "0.75rem 1.25rem", h: "48px", fs: "0.92rem", r: "var(--r-md)" },
  lg: { p: "0.95rem 1.5rem",  h: "56px", fs: "1rem",    r: "var(--r-lg)" },
};

export function Button({
  children, variant = "primary", block = false,
  loading = false, size = "md", disabled, style, ...props
}: ButtonProps) {
  const v = V[variant];
  const s = SZ[size];
  const off = disabled || loading;

  return (
    <button
      disabled={off}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: "0.45rem", width: block ? "100%" : undefined,
        minHeight: s.h, padding: s.p, fontSize: s.fs, borderRadius: s.r,
        border: `1.5px solid ${v.border}`, background: v.bg, color: v.color,
        fontFamily: "var(--font-display, 'Syne')", fontWeight: 700,
        letterSpacing: "0.01em", whiteSpace: "nowrap",
        cursor: off ? "not-allowed" : "pointer",
        opacity: off ? 0.5 : 1,
        transition: "opacity 130ms, transform 100ms",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        ...style,
      }}
      onMouseDown={(e) => { if (!off) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"; }}
      onMouseUp={(e)   => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      onTouchStart={(e)=> { if (!off) (e.currentTarget as HTMLButtonElement).style.opacity = "0.8"; }}
      onTouchEnd={(e)  => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      {...props}
    >
      {loading ? (
        <>
          <span aria-hidden="true" style={{ width: "0.9em", height: "0.9em", borderRadius: "999px", border: "2px solid currentColor", borderTopColor: "transparent", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
          Working…
        </>
      ) : children}
    </button>
  );
}
