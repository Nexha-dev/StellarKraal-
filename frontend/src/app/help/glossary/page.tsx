import React from "react";
import { glossaryArray } from "@/lib/glossary";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Glossary - StellarKraal",
  description: "Definitions of financial terms used in the StellarKraal application.",
};

export default function GlossaryPage() {
  return (
    <div className="min-h-screen bg-sand-light text-brown-dark font-sans">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-brown-dark font-serif">Glossary</h1>
        <p className="mb-8 text-lg text-brown-light">
          Definitions of financial and protocol terms used throughout StellarKraal.
        </p>
        
        <div className="space-y-6">
          {glossaryArray.map(({ id, term, definition }) => (
            <div key={id} className="bg-white p-6 rounded-2xl shadow-sm border border-brown/10" id={id}>
              <h2 className="text-xl font-semibold mb-2">{term}</h2>
              <p className="text-brown-light">{definition}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
