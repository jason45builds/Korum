"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  block?: boolean;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
};

const variantMap: Record<ButtonVariant, { bg: string; color: string; border: string; hoverBg: string }> = {
  primary:   { bg: "var(--primary)",        color: "#fff",                border: "var(--primary)",     hoverBg: "var(--primary-dark)"  },
  secondary: { bg: "var(--surface-accent)", color: "var(--primary-dark)", border: "transparent",        hoverBg: "var(--primary-soft)"  },
  ghost:     { bg: "transparent",           color: "var(--text-muted)",   border: "var(--line)",        hoverBg: "var(--surface-muted)" },
  danger:    { bg: "var(--danger)",         color: "#fff",                border: "var(--danger)",      hoverBg: "#a93226"              },
};

const sizeMap = {
  sm: { padding: "0.55rem 0.9rem",  minHeight: "2.4rem",  fontSize: "0.82rem" },
  md: { padding: "0.8rem 1.25rem",  minHeight: "3rem",    fontSize: "0.92rem" },
  lg: { padding: "1rem 1.5rem",     minHeight: "3.4rem",  fontSize: "1rem"    },
};

export function Button({
  children,
  variant = "primary",
  block = false,
  loading = false,
  size = "md",
  disabled,
  style,
  ...props
}: ButtonProps) {
  const v = variantMap[variant];
  const s = sizeMap[size];
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        width: block ? "100%" : undefined,
        minHeight: s.minHeight,
        padding: s.padding,
        fontSize: s.fontSize,
        borderRadius: "999px",
        border: `1.5px solid ${v.border}`,
        background: v.bg,
        color: v.color,
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.6 : 1,
        transition: "background 150ms ease, transform 120ms ease, opacity 150ms ease",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = v.hoverBg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = v.bg;
      }}
      onMouseDown={(e) => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onTouchStart={(e) => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = v.hoverBg;
      }}
      onTouchEnd={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = v.bg;
      }}
      {...props}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            style={{
              width: "0.9em",
              height: "0.9em",
              borderRadius: "999px",
              border: "2px solid currentColor",
              borderTopColor: "transparent",
              animation: "spin 0.7s linear infinite",
              flexShrink: 0,
            }}
          />
          Working…
        </>
      ) : children}
    </button>
  );
}
