import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 text-center">
      {/* Illustration */}
      <div aria-hidden="true" className="mb-8">
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Lost cow illustration"
        >
          <circle cx="60" cy="60" r="56" fill="#FDF6EC" stroke="#D4A017" strokeWidth="3" />
          <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fontSize="52">
            🐄
          </text>
        </svg>
      </div>

      <h1 className="text-6xl font-bold text-brown mb-2">404</h1>
      <h2 className="text-2xl font-semibold text-brown mb-3">Page not found</h2>
      <p className="text-brown/60 max-w-sm mb-8">
        Looks like this page wandered off the pasture. Let&apos;s get you back on track.
      </p>

      {/* Navigation suggestions */}
      <nav aria-label="Suggested pages" className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="bg-brown text-cream font-semibold px-6 py-3 rounded-xl hover:bg-brown/80 transition focus:outline-none focus:ring-2 focus:ring-gold"
        >
          Go home
        </Link>
        <Link
          href="/dashboard"
          className="border border-brown/30 text-brown font-semibold px-6 py-3 rounded-xl hover:border-brown/60 transition focus:outline-none focus:ring-2 focus:ring-gold"
        >
          Dashboard
        </Link>
        <Link
          href="/help/faq"
          className="border border-brown/30 text-brown font-semibold px-6 py-3 rounded-xl hover:border-brown/60 transition focus:outline-none focus:ring-2 focus:ring-gold"
        >
          FAQ
        </Link>
      </nav>
    </main>
  );
}
