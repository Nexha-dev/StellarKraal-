"use client";
import { useState } from "react";
import Link from "next/link";

interface HelpMenuProps {
  onShowOnboarding: () => void;
}

export default function HelpMenu({ onShowOnboarding }: HelpMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-brown-600 hover:text-brown-700 transition"
        aria-label="Help menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
          <circle cx="12" cy="17" r="0.5"/>
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-cream-50 rounded-lg shadow-lg border border-brown-200 z-20">
            <button
              onClick={() => {
                onShowOnboarding();
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-brown-700 hover:bg-brown-50 rounded-t-lg transition"
            >
              Show Getting Started Guide
            </button>
            <Link
              href="/help"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 text-brown-700 hover:bg-brown-50 rounded-b-lg transition"
            >
              Help &amp; Guides
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
