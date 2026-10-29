"use client";

import React, { useState } from "react";
import { DiaryEntry } from "@/types/entry";
import { formatLocalCalendarDate, formatTimeFromISO } from "@/lib/date";
import { BookOpen, Feather, PenLine, Trash2, Search, Clock, Calendar } from "lucide-react";

interface ArchiveViewProps {
  entries: DiaryEntry[];
  onOpenEntry: (entry: DiaryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onReturnToTonight: () => void;
}

export function ArchiveView({
  entries,
  onOpenEntry,
  onDeleteEntry,
  onReturnToTonight,
}: ArchiveViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredEntries = entries.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (e.title || "").toLowerCase().includes(q);
    const contentMatch = (e.content || "").toLowerCase().includes(q);
    const dateMatch = (e.entryDate || "").toLowerCase().includes(q);
    return titleMatch || contentMatch || dateMatch;
  });

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col py-6">
      {/* Header */}
      <header className="mb-10 pb-6 border-b border-[#45373C]/40">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border border-[#45373C] bg-[#2B2226] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#D78A70]" />
            </div>
            <span className="font-sans text-xs tracking-[0.16em] uppercase text-[#A89A98] font-medium">
              Private Archives
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

        <h2 className="font-serif text-3xl sm:text-4xl text-[#F0E8DF] font-normal tracking-tight">
          Past Entries
        </h2>
        <p className="mt-2 font-sans text-sm text-[#A89A98]">
          {entries.length === 0
            ? "Your archive is quiet. No memories have been recorded yet."
            : `${entries.length} ${entries.length === 1 ? "reflection" : "reflections"} preserved in your sanctuary.`}
        </p>

        {/* Subtle search if there are entries */}
        {entries.length > 0 && (
          <div className="mt-6 relative">
            <Search className="w-4 h-4 text-[#A89A98]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search through past reflections..."
              className="w-full bg-[#2B2226]/40 border border-[#45373C]/50 rounded-sm py-2 pl-10 pr-4 text-xs font-sans text-[#F0E8DF] placeholder-[#A89A98]/40 focus:border-[#D78A70]/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
            />
          </div>
        )}
      </header>

      {/* Entry List or Empty State */}
      {entries.length === 0 ? (
        <div className="border border-[#45373C]/40 bg-[#2B2226]/30 p-8 sm:p-10 rounded-sm text-left space-y-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[#D78A70] font-sans font-medium">
            A Clean Slate
          </div>
          <h3 className="font-serif text-2xl text-[#F0E8DF] font-normal">
            No past entries yet. Tonight is where it begins.
          </h3>
          <p className="font-sans text-sm text-[#A89A98] leading-relaxed max-w-lg">
            Every night you write, your thoughts are stored quietly on this device. You will find them here in chronological order, safely preserved.
          </p>
          <div className="pt-4">
            <button
              type="button"
              onClick={onReturnToTonight}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2B2226] border border-[#D78A70] text-[#F0E8DF] text-xs font-sans rounded-sm hover:bg-[#342A2F] transition-colors"
            >
              <Feather className="w-3.5 h-3.5 text-[#D78A70]" />
              <span>Begin writing now</span>
            </button>
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="py-12 text-center text-sm text-[#A89A98]">
          No entries found matching &ldquo;{searchQuery}&rdquo;.
        </div>
      ) : (
        <div className="space-y-6">
          {filteredEntries.map((entry) => {
            const dateObj = formatLocalCalendarDate(entry.entryDate);
            const timeStr = formatTimeFromISO(entry.createdAt);
            const words = entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0;
            const isDeleting = deletingId === entry.id;

            return (
              <article
                key={entry.id}
                className="border border-[#45373C]/40 bg-[#2B2226]/30 hover:bg-[#2B2226]/60 p-6 sm:p-7 rounded-sm transition-all group"
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#45373C]/30 text-xs text-[#A89A98]/70">
                  <div className="flex items-center gap-3">
                    <span className="font-serif italic text-base text-[#D78A70]">
                      {dateObj.fullDate}
                    </span>
                    {timeStr && (
                      <span className="flex items-center gap-1 text-[11px] font-mono">
                        <Clock className="w-3 h-3 text-[#A89A98]/50" />
                        <span>{timeStr}</span>
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-[11px] text-[#A89A98]/50">
                    {words} {words === 1 ? "word" : "words"}
                  </span>
                </div>

                {/* Entry Title */}
                <h3 className="font-serif text-xl sm:text-2xl text-[#F0E8DF] font-normal mb-3">
                  {entry.title || "Untitled reflection"}
                </h3>

                {/* Content Snippet */}
                <p className="font-writing text-base sm:text-[17px] text-[#F0E8DF]/85 leading-[1.8] whitespace-pre-wrap line-clamp-4">
                  {entry.content || "(No words recorded)"}
                </p>

                {/* Footer Actions */}
                <div className="mt-6 pt-4 border-t border-[#45373C]/30 flex items-center justify-between text-xs font-sans">
                  <button
                    type="button"
                    onClick={() => onOpenEntry(entry)}
                    className="inline-flex items-center gap-1.5 text-[#D78A70] hover:text-[#FAF6F0] font-medium transition-colors"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                    <span>Open in editor &rarr;</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {isDeleting ? (
                      <div className="flex items-center gap-2 bg-[#211A1D] px-2 py-1 border border-red-900/50 rounded">
                        <span className="text-[11px] text-red-300">Delete this entry?</span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteEntry(entry.id);
                            setDeletingId(null);
                          }}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold px-1.5 py-0.5 rounded"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="text-xs text-[#A89A98] hover:text-[#F0E8DF] px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingId(entry.id)}
                        className="text-[#A89A98]/50 hover:text-red-400 p-1 transition-colors rounded"
                        title="Delete entry"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
