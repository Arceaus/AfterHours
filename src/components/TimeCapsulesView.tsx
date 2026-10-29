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
} from "lucide-react";

interface TimeCapsulesViewProps {
  entries: DiaryEntry[];
  onOpenEntry: (entry: DiaryEntry) => void;
  onReturnToTonight: () => void;
}

const EXAMPLE_QUERIES = [
  "What was on my mind six months ago?",
  "Find my earliest entry about college.",
  "What did I write around this time last year?",
  "Show me entries mentioning my future.",
  "What was I thinking about last month?",
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

  // Restore AI preference from localStorage
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

  const executeRetrieval = async (question: string) => {
    if (!question.trim()) return;

    setIsSearching(true);
    setActiveQuery(question);
    setHasSearched(true);

    const parsed = parseNaturalQuery(question);
    setParsedQuery(parsed);

    // 1. Local Grounded Retrieval (Always the source of truth)
    const retrieved = retrieveEntries(question, entries);
    setResults(retrieved);

    const localSummary = generateLocalSynthesis(parsed, retrieved);
    setSynthesis(localSummary);
    setUsedAI(false);

    // 2. Optional AI Synthesis (Only if user opted in and entries exist)
    if (aiEnabled && retrieved.length > 0) {
      try {
        const res = await fetch("/api/capsule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            excerpts: retrieved.map((r) => ({
              id: r.entry.id,
              entryDate: r.entry.entryDate,
              title: r.entry.title,
              excerpt: r.excerpt,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.usedAI && data.answer) {
            setSynthesis(data.answer);
            setUsedAI(true);
          }
        }
      } catch {
        // Quiet fallback to local synthesis
      }
    }

    setIsSearching(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeRetrieval(queryInput);
  };

  const handleSelectExample = (ex: string) => {
    setQueryInput(ex);
    executeRetrieval(ex);
  };

  const handleResetSearch = () => {
    setQueryInput("");
    setActiveQuery(null);
    setParsedQuery(null);
    setResults([]);
    setSynthesis(null);
    setHasSearched(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col py-4 sm:py-6">
      {/* Header */}
      <header className="mb-8 pb-6 border-b border-[#45373C]/40">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border border-[#45373C] bg-[#2B2226] flex items-center justify-center">
              <Archive className="w-4 h-4 text-[#D78A70]" />
            </div>
            <span className="font-sans text-xs tracking-[0.16em] uppercase text-[#A89A98] font-medium">
              Time Capsules
            </span>
          </div>

          <button
            type="button"
            onClick={onReturnToTonight}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[#45373C] hover:border-[#D78A70] bg-[#2B2226] text-[#F0E8DF] text-xs font-sans tracking-wide rounded-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
          >
            <Feather className="w-3.5 h-3.5 text-[#D78A70]" />
            <span>Write tonight&apos;s entry</span>
          </button>
        </div>

        {/* Page Introduction (Section 4) */}
        <h2 className="font-serif text-3xl sm:text-4xl text-[#F0E8DF] font-normal tracking-tight">
          Talk to your past self.
        </h2>
        <p className="mt-2 font-sans text-sm sm:text-base text-[#A89A98] leading-relaxed">
          Ask a question. Revisit a moment. See what you once wrote.
        </p>
      </header>

      {/* Main Interaction: Question Form & Examples */}
      <section aria-label="Question Input" className="mb-10 space-y-4">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="What would you like to remember?"
            className="w-full bg-[#2B2226]/50 border border-[#45373C]/60 focus:border-[#D78A70] rounded-sm py-3.5 pl-4 pr-12 text-sm sm:text-base font-sans text-[#F0E8DF] placeholder-[#A89A98]/40 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
          />
          <button
            type="submit"
            disabled={!queryInput.trim() || isSearching}
            className="absolute right-2.5 p-2 bg-[#2B2226] hover:bg-[#342A2F] text-[#D78A70] disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
            title="Search memories"
            aria-label="Search memories"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Example Questions Bar */}
        <div className="space-y-2">
          <span className="text-[11px] font-sans uppercase tracking-wider text-[#A89A98]/60 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#D78A70]/70" />
            <span>Try asking:</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => handleSelectExample(ex)}
                className="text-xs font-sans text-[#A89A98] hover:text-[#F0E8DF] bg-[#2B2226]/40 hover:bg-[#2B2226] border border-[#45373C]/40 hover:border-[#D78A70]/40 px-3 py-1.5 rounded-sm transition-all text-left"
              >
                &ldquo;{ex}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Privacy & Optional AI Opt-In Banner (Section 5) */}
        <div className="pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#2B2226]/30 border border-[#45373C]/40 rounded-sm text-xs font-sans text-[#A89A98]">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#D78A70]/80 shrink-0" />
              <span>
                Local-first retrieval by default. No diary entries leave your device.
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={handleToggleAi}
                className="rounded border-[#45373C] text-[#D78A70] focus:ring-[#D78A70] focus:ring-offset-0 bg-[#211A1D]"
              />
              <span className="text-[11px] text-[#F0E8DF]/90">
                Enable AI Reflection (Optional)
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Results View or Empty States */}
      {entries.length === 0 ? (
        /* Diary Empty State */
        <div className="border border-[#45373C]/40 bg-[#2B2226]/30 p-8 sm:p-10 rounded-sm text-left space-y-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[#D78A70] font-sans font-medium">
            The Sanctuary is Quiet
          </div>
          <h3 className="font-serif text-2xl text-[#F0E8DF] font-normal">
            No memories to retrieve yet.
          </h3>
          <p className="font-sans text-sm text-[#A89A98] leading-relaxed max-w-lg">
            Your Time Capsules are waiting for your first thoughts. As you write entries on the Tonight canvas, they will gather here to be rediscovered.
          </p>
          <div className="pt-3">
            <button
              type="button"
              onClick={onReturnToTonight}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2B2226] border border-[#D78A70] text-[#F0E8DF] text-xs font-sans rounded-sm hover:bg-[#342A2F] transition-colors"
            >
              <Feather className="w-3.5 h-3.5 text-[#D78A70]" />
              <span>Write your first entry</span>
            </button>
          </div>
        </div>
      ) : hasSearched ? (
        <section aria-label="Retrieval Results" className="space-y-6">
          {/* Active Query Status & Reset Button */}
          <div className="flex items-center justify-between pb-3 border-b border-[#45373C]/40 text-xs text-[#A89A98]">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-[#A89A98]/60 font-sans">
                Inquiry:
              </span>
              <span className="font-serif italic text-sm text-[#F0E8DF]">
                &ldquo;{activeQuery}&rdquo;
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetSearch}
              className="flex items-center gap-1.5 text-xs text-[#A89A98] hover:text-[#F0E8DF] transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-[#D78A70]" />
              <span>Ask another question</span>
            </button>
          </div>

          {/* Parsed Date Constraints Badge */}
          {parsedQuery?.dateExplanation && (
            <div className="flex items-center gap-2 p-2.5 bg-[#2B2226]/40 border border-[#D78A70]/30 rounded text-xs text-[#A89A98]">
              <Calendar className="w-3.5 h-3.5 text-[#D78A70]" />
              <span>
                Targeting period: <strong className="text-[#F0E8DF]">{parsedQuery.dateExplanation}</strong>
              </span>
            </div>
          )}

          {/* Grounded Reflection Synthesis (Section 4 & 5) */}
          {synthesis && (
            <div className="p-5 sm:p-6 bg-[#2B2226]/50 border border-[#45373C]/50 rounded-sm space-y-2 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-sans text-[#D78A70]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="font-medium uppercase tracking-wider text-[10px]">
                    {usedAI ? "AI Reflection (Grounded in Entries)" : "Memory Synthesis"}
                  </span>
                </div>
                <span className="text-[10px] text-[#A89A98]/60 font-mono">
                  {results.length} {results.length === 1 ? "source memory" : "source memories"}
                </span>
              </div>

              <p className="font-serif text-base sm:text-lg text-[#F0E8DF] leading-relaxed pt-1">
                {synthesis}
              </p>
            </div>
          )}

          {/* Retrieved Evidence / Memory Cards */}
          {results.length > 0 ? (
            <div className="space-y-4 pt-2">
              <div className="text-xs uppercase tracking-[0.14em] text-[#A89A98]/60 font-sans">
                Evidence from your diary ({results.length}):
              </div>

              {results.map((res) => {
                const dateObj = formatLocalCalendarDate(res.entry.entryDate);
                const timeStr = formatTimeFromISO(res.entry.createdAt);
                const displayTitle = deriveDisplayTitle(res.entry.title, res.entry.content);

                return (
                  <article
                    key={res.entry.id}
                    className="p-5 sm:p-6 border border-[#45373C]/40 bg-[#2B2226]/30 hover:bg-[#2B2226]/60 rounded-sm transition-all group space-y-3"
                  >
                    {/* Header: Date, Time & Match Reasons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#45373C]/30 text-xs text-[#A89A98]/70">
                      <div className="flex items-center gap-3">
                        <span className="font-serif italic text-base text-[#D78A70]">
                          {dateObj.fullDate}
                        </span>
                        {timeStr && (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-[#A89A98]/50" />
                            <span>{timeStr}</span>
                          </span>
                        )}
                      </div>

                      {/* Match Reasons Badges (Section 4) */}
                      <div className="flex flex-wrap gap-1.5">
                        {res.matchReasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-sans text-[#D78A70] bg-[#D78A70]/10 px-2 py-0.5 rounded border border-[#D78A70]/20"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Entry Title */}
                    <h4 className="font-serif text-xl sm:text-2xl text-[#F0E8DF] font-normal leading-snug">
                      {displayTitle}
                    </h4>

                    {/* Grounded Excerpt */}
                    <p className="font-writing text-base text-[#F0E8DF]/90 leading-[1.8] whitespace-pre-wrap">
                      &ldquo;{res.excerpt}&rdquo;
                    </p>

                    {/* Tags */}
                    {res.entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {res.entry.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[10px] font-sans text-[#A89A98] bg-[#211A1D] px-2 py-0.5 rounded border border-[#45373C]/40"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action to Open Original Entry (Section 6) */}
                    <div className="pt-3 border-t border-[#45373C]/30 flex items-center justify-between text-xs font-sans">
                      <button
                        type="button"
                        onClick={() => onOpenEntry(res.entry)}
                        className="inline-flex items-center gap-1.5 text-[#D78A70] hover:text-[#FAF6F0] font-medium transition-colors"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        <span>Open original entry &rarr;</span>
                      </button>

                      <span className="text-[11px] text-[#A89A98]/50 font-mono">
                        ID: {res.entry.id.substring(0, 8)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* No Matches Found State (Section 4) */
            <div className="py-10 px-6 border border-[#45373C]/40 bg-[#2B2226]/20 rounded-sm text-center space-y-3">
              <p className="font-serif italic text-lg text-[#F0E8DF]">
                Nothing recorded matching this inquiry.
              </p>
              <p className="text-xs text-[#A89A98] font-sans max-w-md mx-auto leading-relaxed">
                We searched your entry titles, writing, tags, and date periods, but found no direct references. Your thoughts around this time may have been centered on other reflections.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="text-xs text-[#D78A70] hover:underline"
                >
                  Try another question
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        /* Idle Welcome Guidance */
        <div className="py-12 border-t border-[#45373C]/30 text-xs text-[#A89A98]/70 space-y-4">
          <div className="flex items-center gap-2 text-[#D78A70]">
            <Info className="w-4 h-4" />
            <span className="font-medium uppercase tracking-wider text-[11px] font-sans">
              How Time Capsules Works
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-1 text-left">
            <div className="space-y-1.5">
              <h5 className="font-serif text-sm text-[#F0E8DF]">Temporal Queries</h5>
              <p className="leading-relaxed">
                Ask about specific periods like <em>&ldquo;six months ago&rdquo;</em>, <em>&ldquo;last year&rdquo;</em>, or <em>&ldquo;during October&rdquo;</em>.
              </p>
            </div>
            <div className="space-y-1.5">
              <h5 className="font-serif text-sm text-[#F0E8DF]">First Mentions</h5>
              <p className="leading-relaxed">
                Discover milestones: <em>&ldquo;When did I first mention college?&rdquo;</em> or <em>&ldquo;my earliest entry about work&rdquo;</em>.
              </p>
            </div>
            <div className="space-y-1.5">
              <h5 className="font-serif text-sm text-[#F0E8DF]">Privacy First</h5>
              <p className="leading-relaxed">
                Everything is searched locally from your device storage. No entries are shared unless you choose to enable AI reflection.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
