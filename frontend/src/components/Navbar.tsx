"use client";
import { useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/borrow", label: "Borrow" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-cream border-b border-brown/10 px-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between h-14">
        {/* Logo / brand */}
        <Link
          href="/"
          className="font-bold text-brown text-lg min-h-[44px] flex items-center"
        >
          🐄 StellarKraal
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="text-brown font-medium hover:text-gold transition min-h-[44px] min-w-[44px] flex items-center"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Hamburger button — mobile only */}
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="md:hidden flex flex-col justify-center items-center gap-1.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-brown/10 transition"
        >
          <span
            className={`block w-6 h-0.5 bg-brown transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`block w-6 h-0.5 bg-brown transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
          />
          <span
            className={`block w-6 h-0.5 bg-brown transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <ul className="md:hidden flex flex-col border-t border-brown/10 py-2">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="block px-4 text-brown font-medium hover:bg-brown/10 transition min-h-[44px] flex items-center"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
