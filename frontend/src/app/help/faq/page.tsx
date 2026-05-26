"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { FAQ_CATEGORIES } from "@/lib/faqData";

export default function FaqPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      ),
    })).filter(
      (cat) =>
        (!activeCategory || cat.id === activeCategory) && cat.items.length > 0
    );
  }, [query, activeCategory]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/" className="text-brown/60 hover:text-brown text-sm">← Home</Link>
      </div>
      <h1 className="text-3xl font-bold text-brown mb-2">Frequently Asked Questions</h1>
      <p className="text-brown/60 mb-6 text-sm">
        Can't find an answer?{" "}
        <a
          href="https://github.com/teslims2/StellarKraal-/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-brown"
        >
          Open a GitHub issue
        </a>
        .
      </p>

      {/* Search */}
      <input
        type="search"
        placeholder="Search questions…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border border-brown/30 rounded-xl px-4 py-2.5 mb-6 focus:outline-none focus:ring-2 focus:ring-brown/30"
        aria-label="Search FAQ"
      />

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-8" role="tablist">
        <button
          role="tab"
          aria-selected={activeCategory === null}
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
            activeCategory === null
              ? "bg-brown text-cream"
              : "bg-brown/10 text-brown hover:bg-brown/20"
          }`}
        >
          All
        </button>
        {FAQ_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={activeCategory === cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              activeCategory === cat.id
                ? "bg-brown text-cream"
                : "bg-brown/10 text-brown hover:bg-brown/20"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="text-brown/60 text-center py-12">No results for "{query}".</p>
      ) : (
        filtered.map((cat) => (
          <section key={cat.id} className="mb-10">
            <h2 className="text-lg font-semibold text-brown mb-4 border-b border-brown/10 pb-2">
              {cat.label}
            </h2>
            <dl className="space-y-4">
              {cat.items.map((item) => (
                <div key={item.q} className="bg-white rounded-xl p-4 shadow-sm">
                  <dt className="font-medium text-brown mb-1">{item.q}</dt>
                  <dd className="text-brown/70 text-sm leading-relaxed">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))
      )}
    </main>
  );
}
