"use client";

import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ open, title, description, children, onClose }: ModalProps) {
  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,28,23,0.45)",
        display: "grid",
        placeItems: "end center",
        padding: "0",
        zIndex: 50,
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      {/* Sheet slides up from bottom on mobile — centred on desktop */}
      <div
        className="panel animate-in"
        style={{
          width: "min(100%, 32rem)",
          maxHeight: "90dvh",
          overflowY: "auto",
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          display: "grid",
          gap: "1.25rem",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Handle bar — mobile affordance */}
        <div style={{
          width: "2.5rem",
          height: "4px",
          borderRadius: "999px",
          background: "var(--line)",
          margin: "0 auto -0.5rem",
        }} aria-hidden="true" />

        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <h3 className="title-md" id="modal-title">{title}</h3>
            {description && <p className="muted" style={{ marginTop: "0.25rem", fontSize: "0.88rem" }}>{description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal">
            ✕
          </Button>
        </div>

        {children}
      </div>
    </div>
  );
}
