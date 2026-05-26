"use client";
import Link from "next/link";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  const issueUrl = `https://github.com/teslims2/StellarKraal-/issues/new?title=${encodeURIComponent(
    "500 Error: " + (error.message || "Unknown error")
  )}&body=${encodeURIComponent(
    `**Error digest:** ${error.digest ?? "N/A"}\n\n**Steps to reproduce:**\n\n`
  )}`;

  return (
    <html lang="en">
      <body className="bg-cream text-brown min-h-screen flex flex-col items-center justify-center px-4 text-center">
        {/* Illustration */}
        <div aria-hidden="true" className="mb-8">
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="60" cy="60" r="56" fill="#FDF6EC" stroke="#D4A017" strokeWidth="3" />
            <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fontSize="52">
              ⚠️
            </text>
          </svg>
        </div>

        <h1 className="text-6xl font-bold text-brown mb-2">500</h1>
        <h2 className="text-2xl font-semibold text-brown mb-3">Something went wrong</h2>
        <p className="text-brown/60 max-w-sm mb-2">
          An unexpected error occurred on our end. You can try again or report the issue.
        </p>
        {error.digest && (
          <p className="text-xs text-brown/40 mb-8 font-mono">Error ID: {error.digest}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="bg-brown text-cream font-semibold px-6 py-3 rounded-xl hover:bg-brown/80 transition focus:outline-none focus:ring-2 focus:ring-gold"
          >
            Try again
          </button>
          <a
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-brown/30 text-brown font-semibold px-6 py-3 rounded-xl hover:border-brown/60 transition focus:outline-none focus:ring-2 focus:ring-gold"
          >
            Report issue
          </a>
          <Link
            href="/"
            className="border border-brown/30 text-brown font-semibold px-6 py-3 rounded-xl hover:border-brown/60 transition focus:outline-none focus:ring-2 focus:ring-gold"
          >
            Go home
          </Link>
        </div>
      </body>
    </html>
  );
}
