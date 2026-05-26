import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Maintenance mode page.
 * Shown when NEXT_PUBLIC_MAINTENANCE_MODE=true is set.
 * The middleware (middleware.ts) redirects all routes here when enabled.
 */
export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
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
            🔧
          </text>
        </svg>
      </div>

      <h1 className="text-4xl font-bold text-brown mb-3">Under Maintenance</h1>
      <p className="text-brown/60 max-w-sm mb-6">
        StellarKraal is currently undergoing scheduled maintenance. We&apos;ll be back shortly.
      </p>
      <p className="text-xs text-brown/40">
        If you need urgent assistance, contact{" "}
        <a
          href="mailto:support@stellarkraal.io"
          className="underline hover:text-brown transition"
        >
          support@stellarkraal.io
        </a>
      </p>
    </main>
  );
}
