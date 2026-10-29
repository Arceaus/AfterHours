"use client";

import React from "react";
import { DiaryEntry } from "@/types/entry";
import { formatLocalCalendarDate } from "@/lib/date";
import { Moon, Bookmark, Compass, PenLine } from "lucide-react";

interface RecentMemoriesProps {
  entries: DiaryEntry[];
  activeEntryId?: string | null;
  onSelectEntry: (entry: DiaryEntry) => void;
}

export function RecentMemories({
  entries,
  activeEntryId,
  onSelectEntry,
}: RecentMemoriesProps) {
  // Show the most recent 4 entries in this side panel
  const displayEntries = entries.slice(0, 5);

  return (
    <aside aria-label="Recent entries and memory" className="w-full flex flex-col">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 mb-6 border-b border-[#45373C]/40">
        <div className="flex items-center gap-2">
          <Bookmark className="w-3.5 h-3.5 text-[#D78A70]/80" />
          <h3 className="font-sans text-[11px] uppercase tracking-[0.18em] text-[#A89A98] font-medium">
            Recent Echoes
          </h3>
        </div>
        <span className="font-mono text-[10px] text-[#A89A98]/50">
          {entries.length === 0
            ? "0 entries"
            : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
        </span>
      </div>

      {/* Intentional Empty State or Real Entries */}
      {entries.length === 0 ? (
        <div className="border border-[#45373C]/40 bg-[#2B2226]/40 p-6 rounded-sm relative overflow-hidden">
          {/* Subtle warm accent line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#D78A70]/30 to-transparent" />

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-[#D78A70]">
              <Moon className="w-3.5 h-3.5" />
              <span className="font-serif italic text-sm">A quiet beginning</span>
            </div>

            <p className="font-serif text-lg text-[#F0E8DF] leading-snug font-normal">
              No entries yet. Tonight is where it begins.
            </p>

            <p className="font-sans text-xs text-[#A89A98] leading-relaxed">
              When the night settles and you finish writing, your reflections will rest here.
            </p>

            <div className="pt-3 border-t border-[#45373C]/30 flex items-start gap-2 text-[11px] text-[#A89A98]/60 italic font-serif">
              <Compass className="w-3 h-3 mt-0.5 text-[#A89A98]/40 shrink-0" />
              <span>&ldquo;A little corner of the internet that belongs only to you.&rdquo;</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayEntries.map((entry) => {
            const dateObj = formatLocalCalendarDate(entry.entryDate);
            const isActive = activeEntryId === entry.id;

            return (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className={`p-4 border transition-all rounded-sm cursor-pointer group ${
                  isActive
                    ? "border-[#D78A70] bg-[#2B2226]/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
                    : "border-[#45373C]/40 hover:border-[#D78A70]/40 bg-[#2B2226]/30 hover:bg-[#2B2226]/70"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-[#A89A98]/70 mb-1.5 font-sans">
                  <span className="font-serif italic text-[#D78A70]/90">
                    {dateObj.monthDay}, {dateObj.year}
                  </span>
                  <span className="text-[#D78A70] opacity-0 group-hover:opacity-100 transition-opacity font-serif italic flex items-center gap-1">
                    <PenLine className="w-3 h-3" />
                    <span>Open &rarr;</span>
                  </span>
                </div>

                <h4 className="font-serif text-base text-[#F0E8DF] group-hover:text-[#FAF6F0] transition-colors line-clamp-1">
                  {entry.title || "Untitled reflection"}
                </h4>

                <p className="font-sans text-xs text-[#A89A98] line-clamp-2 mt-1 leading-relaxed">
                  {entry.content || "(No words recorded)"}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Atmospheric Sanctuary Note */}
      <div className="mt-8 pt-6 border-t border-[#45373C]/30 text-xs text-[#A89A98]/60 space-y-2">
        <div className="text-[11px] font-sans uppercase tracking-[0.14em] text-[#A89A98]/50">
          The Sanctuary
        </div>
        <p className="leading-relaxed font-sans text-[12px] text-[#A89A98]/80">
          No feeds. No likes. No algorithms watching. This room holds whatever you leave behind.
        </p>
      </div>
    </aside>
  );
}
