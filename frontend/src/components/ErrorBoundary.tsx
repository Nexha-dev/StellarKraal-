"use client";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Shown above the generic message — e.g. "Dashboard" */
  section?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const section = this.props.section ? `${this.props.section} — ` : "";

    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
        <p className="text-2xl mb-2">⚠️</p>
        <h2 className="text-xl font-semibold text-brown mb-2">
          {section}Something went wrong
        </h2>
        <p className="text-brown/60 mb-6 text-sm">
          An unexpected error occurred. Please reload or report the issue.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-gold text-brown font-semibold px-4 py-2 rounded-lg hover:bg-gold/80 transition"
          >
            Reload
          </button>
          <a
            href="/help/faq"
            className="border border-brown/30 text-brown px-4 py-2 rounded-lg hover:bg-brown/5 transition text-sm"
          >
            Visit FAQ
          </a>
          <a
            href="https://github.com/teslims2/StellarKraal-/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-brown/30 text-brown px-4 py-2 rounded-lg hover:bg-brown/5 transition text-sm"
          >
            Report issue
          </a>
        </div>
      </div>
    );
  }
}
