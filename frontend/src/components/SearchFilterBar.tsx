"use client";
import { useSearchFilter } from "@/hooks/useSearchFilter";

interface Props {
  statusOptions: string[];
  typeOptions: string[];
  searchPlaceholder?: string;
}

/**
 * Reusable search + filter bar with debounced search, multi-select filter panel,
 * active filter chips, and a clear-all button.
 */
export default function SearchFilterBar({
  statusOptions,
  typeOptions,
  searchPlaceholder = "Search…",
}: Props) {
  const {
    filters,
    setQuery,
    toggleStatus,
    toggleType,
    removeStatus,
    removeType,
    clearAll,
    hasActiveFilters,
  } = useSearchFilter();

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="search"
          aria-label="Search"
          placeholder={searchPlaceholder}
          value={filters.query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border border-brown/30 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold"
        />
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-sm text-brown/60 hover:text-brown px-3 py-2 rounded-lg border border-brown/20 hover:border-brown/40 transition"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="flex flex-wrap gap-4">
        {statusOptions.length > 0 && (
          <fieldset>
            <legend className="text-xs font-semibold text-brown/60 uppercase tracking-wide mb-1">
              Status
            </legend>
            <div className="flex flex-wrap gap-1">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  aria-pressed={filters.statuses.includes(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    filters.statuses.includes(s)
                      ? "bg-brown text-cream border-brown"
                      : "bg-white text-brown border-brown/30 hover:border-brown/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {typeOptions.length > 0 && (
          <fieldset>
            <legend className="text-xs font-semibold text-brown/60 uppercase tracking-wide mb-1">
              Type
            </legend>
            <div className="flex flex-wrap gap-1">
              {typeOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  aria-pressed={filters.types.includes(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    filters.types.includes(t)
                      ? "bg-gold text-brown border-gold"
                      : "bg-white text-brown border-brown/30 hover:border-brown/60"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2" aria-label="Active filters">
          {filters.query && (
            <Chip label={`"${filters.query}"`} onRemove={() => setQuery("")} />
          )}
          {filters.statuses.map((s) => (
            <Chip key={s} label={s} onRemove={() => removeStatus(s)} />
          ))}
          {filters.types.map((t) => (
            <Chip key={t} label={t} onRemove={() => removeType(t)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 bg-gold/20 text-brown text-xs font-medium px-2 py-1 rounded-full">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="hover:text-brown/60 transition"
      >
        ×
      </button>
    </span>
  );
}
