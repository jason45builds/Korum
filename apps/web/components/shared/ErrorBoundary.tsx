"use client";

import React from "react";
import Link from "next/link";

type State = { hasError: boolean; error: Error | null };

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** If true, shows a minimal inline error rather than a full-page fallback */
  inline?: boolean;
  /** Section label for the error message e.g. "match details" */
  section?: string;
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console; in production this would go to Sentry / PostHog
    console.error("[Korum ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    if (this.props.inline) {
      return (
        <div style={{ padding: "12px 16px", background: "var(--red-soft)", border: "1px solid var(--red-border)", borderRadius: "var(--r-md)", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div>
            <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--red)" }}>
              Could not load {this.props.section ?? "this section"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 12, padding: "4px 0" }}>
              Try again →
            </button>
          </div>
        </div>
      );
    }

    return (
      <main>
        <div className="page" style={{ alignItems: "center", textAlign: "center", paddingTop: 64 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>😅</div>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 8, maxWidth: 280, margin: "0 auto 8px" }}>
            {this.props.section
              ? `We couldn't load ${this.props.section}.`
              : "An unexpected error occurred."}
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <p style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "monospace", margin: "8px auto", maxWidth: 320, wordBreak: "break-word" }}>
              {this.state.error.message}
            </p>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 24, justifyContent: "center" }}>
            <button
              className="btn btn--primary"
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}>
              Reload page
            </button>
            <Link href="/dashboard">
              <button className="btn btn--ghost">Go home</button>
            </Link>
          </div>
        </div>
      </main>
    );
  }
}
