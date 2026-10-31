"use client";

import React, { useState, useEffect } from "react";
import { DiaryEntry, RetrievalResult, ParsedQuery } from "@/types/entry";
import {
  parseNaturalQuery,
  retrieveEntries,
  generateLocalSynthesis,
} from "@/lib/retrieval";
import { formatLocalCalendarDate, deriveDisplayTitle, formatTimeFromISO } from "@/lib/date";
import {
  Archive,
  Search,
  Sparkles,
  ArrowRight,
  Clock,
  Calendar,
  PenLine,
  RotateCcw,
  Shield,
  Feather,
  Info,
  Compass,
} from "lucide-react";

interface TimeCapsulesViewProps {
  entries: DiaryEntry[];
  onOpenEntry: (entry: DiaryEntry) => void;
  onReturnToTonight: () => void;
}

const EXAMPLE_QUERIES = [
  "Do you remember when you felt this way before?",
  "What was on my mind six months ago?",
  "What did I write around this time last year?",
  "Find my earliest entry about a new beginning.",
  "Show me entries mentioning personal projects.",
];

export function TimeCapsulesView({
  entries,
  onOpenEntry,
  onReturnToTonight,
}: TimeCapsulesViewProps) {
  const [queryInput, setQueryInput] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [usedAI, setUsedAI] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("afterthought_ai_opt_in");
      if (stored === "true") {
        setAiEnabled(true);
      }
    } catch {
      // quiet fallback
    }
  }, []);

  const handleToggleAi = () => {
    const next = !aiEnabled;
    setAiEnabled(next);
    try {
      localStorage.setItem("afterthought_ai_opt_in", String(next));
    } catch {
      // quiet fallback
    }
  };

  const handleExecuteSearch = async (queryText?: string) => {
    const textToSearch = (queryText !== undefined ? queryText : queryInput).trim();
    if (!textToSearch) return;

    setIsSearching(true);
    setHasSearched(true);
    setActiveQuery(textToSearch);

    const parsed = parseNaturalQuery(textToSearch);
    setParsedQuery(parsed);

    const retrieved = retrieveEntries(textToSearch, entries);
    setResults(retrieved);

    if (aiEnabled && retrieved.length > 0) {
      try {
        const topForAI = retrieved.slice(0, 5).map((r) => ({
          entryDate: r.entry.entryDate,
          title: r.entry.title,
          excerpt: r.excerpt,
        }));

        const res = await fetch("/api/capsules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: textToSearch,
            entries: topForAI,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.synthesis) {
            setSynthesis(data.synthesis);
            setUsedAI(true);
            setIsSearching(false);
            return;
          }
        }
      } catch (err) {
        console.warn("AI synthesis fallback to local:", err);
      }
    }

    const localSynth = generateLocalSynthesis(parsed, retrieved);
    setSynthesis(localSynth);
    setUsedAI(false);
    setIsSearching(false);
  };

  const handleClear = () => {
    setQueryInput("");
    setActiveQuery(null);
    setParsedQuery(null);
    setResults([]);
    setSynthesis(null);
    setHasSearched(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12 py-4 select-none">
      {/* Editorial Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#E28A3B] font-sans">
          <Archive className="w-3.5 h-3.5" />
          <span>Conversations Across Time</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl text-[#F4EFEA] font-light tracking-[-0.01em]">
          Time Capsules
        </h1>

        <p className="font-serif italic text-base sm:text-lg text-[#8F8782] max-w-xl">
          Reconnect with an earlier version of yourself. Inquire into forgotten seasons and discover what was once on your mind.
        </p>

        {/* The Atmospheric Inquiry Form */}
        <div className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleExecuteSearch();
            }}
            className="relative"
          >
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask a question of your earlier self..."
              className="w-full bg-[#0C0B0E]/70 backdrop-blur-xl border border-[#F4EFEA]/[0.08] focus:border-[#E28A3B]/60 rounded-full pl-6 pr-32 py-4 text-sm sm:text-base text-[#F4EFEA] placeholder-[#8F8782]/40 transition-colors focus:outline-none shadow-lg"
            />

            <div className="absolute right-2 top-2 flex items-center gap-1.5">
              {queryInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-2 text-[#8F8782] hover:text-[#F4EFEA] transition-colors rounded-full"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="submit"
                disabled={isSearching || !queryInput.trim()}
                className="px-5 py-2 bg-[#F4EFEA]/[0.08] hover:bg-[#E28A3B] hover:text-[#070607] text-[#F4EFEA] font-sans text-xs rounded-full transition-all duration-300 disabled:opacity-40"
              >
                {isSearching ? "Searching..." : "Retrieve"}
              </button>
            </div>
          </form>

          {/* Example Prompts */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#8F8782] font-serif italic mr-1">Inspirations:</span>
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQueryInput(q);
                  void handleExecuteSearch(q);
                }}
                className="px-3 py-1 rounded-full text-xs font-sans bg-[#F4EFEA]/[0.03] hover:bg-[#F4EFEA]/[0.08] text-[#8F8782] hover:text-[#F4EFEA] transition-colors border border-[#F4EFEA]/[0.04]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-8 animate-fadeIn">
          {/* Synthesis Card */}
          {synthesis && (
            <div className="p-6 sm:p-8 bg-[#0C0B0E]/60 backdrop-blur-xl border border-[#F4EFEA]/[0.08] rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#E28A3B] font-sans">
                <Compass className="w-4 h-4" />
                <span>Memory Synthesis</span>
              </div>
              <p className="font-serif italic text-lg sm:text-xl text-[#F4EFEA] leading-relaxed">
                &ldquo;{synthesis}&rdquo;
              </p>
            </div>
          )}

          {/* Retrieved Actual Entries */}
          {results.length === 0 ? (
            <div className="p-12 border border-[#F4EFEA]/[0.08] bg-[#0C0B0E]/30 rounded-2xl text-center space-y-2">
              <p className="font-serif italic text-lg text-[#F4EFEA]">
                No earlier memories matched this question.
              </p>
              <p className="text-xs text-[#8F8782]">
                Try asking with different keywords or a wider time window.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-xs uppercase tracking-[0.16em] text-[#8F8782] font-sans">
                Found {results.length} related {results.length === 1 ? "moment" : "moments"} from your actual diary:
              </h2>

              <div className="grid grid-cols-1 gap-6">
                {results.map(({ entry, excerpt, matchReasons }) => {
                  const dateObj = formatLocalCalendarDate(entry.entryDate);
                  const displayTitle = deriveDisplayTitle(entry.title, entry.content);

                  return (
                    <article
                      key={entry.id}
                      className="p-6 sm:p-7 bg-[#0C0B0E]/50 hover:bg-[#0C0B0E]/80 backdrop-blur-xl border border-[#F4EFEA]/[0.07] hover:border-[#E28A3B]/40 rounded-2xl transition-all group"
                    >
                      <div className="flex items-baseline justify-between pb-3 mb-3 border-b border-[#F4EFEA]/[0.06]">
                        <span className="font-serif italic text-lg text-[#E28A3B]">
                          {dateObj.monthDay}, {dateObj.year}
                        </span>
                        <span className="text-xs font-mono text-[#8F8782]/60">
                          {matchReasons[0] || "matched query"}
                        </span>
                      </div>

                      <h3 className="font-serif text-xl text-[#F4EFEA] mb-2">
                        {displayTitle}
                      </h3>

                      <p className="font-writing text-base text-[#E5DDD3]/85 leading-relaxed italic">
                        &ldquo;{excerpt}&rdquo;
                      </p>

                      <div className="mt-4 pt-3 border-t border-[#F4EFEA]/[0.06] flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => onOpenEntry(entry)}
                          className="inline-flex items-center gap-1.5 text-[#E28A3B] hover:text-[#F4EFEA] font-serif italic text-sm transition-colors"
                        >
                          <PenLine className="w-3.5 h-3.5" />
                          <span>Visit this memory &rarr;</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
