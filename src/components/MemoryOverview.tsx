"use client";

import React, { useState } from "react";
import { MemoryOverviewStats } from "@/types/entry";
import { formatLocalCalendarDate } from "@/lib/date";
import { Sparkles, Calendar, Tag, ChevronDown, ChevronUp } from "lucide-react";

interface MemoryOverviewProps {
  stats: MemoryOverviewStats;
  onSelectTag?: (tag: string) => void;
  selectedTags?: string[];
}

export function MemoryOverview({
  stats,
  onSelectTag,
  selectedTags = [],
}: MemoryOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (stats.totalEntries === 0) {
    return null; // Empty state is handled gracefully by the archive list
  }

  const earliestFormatted = stats.earliestEntryDate
    ? formatLocalCalendarDate(stats.earliestEntryDate).fullDate
    : null;
  const latestFormatted = stats.latestEntryDate
    ? formatLocalCalendarDate(stats.latestEntryDate).fullDate
    : null;

  return (
    <section
      aria-label="Memory Overview"
      className="mb-8 border border-[#45373C]/40 bg-[#2B2226]/40 rounded-sm overflow-hidden"
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#45373C]/30 bg-[#2B2226]/60">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#D78A70]" />
          <h3 className="font-sans text-[11px] uppercase tracking-[0.16em] text-[#A89A98] font-medium">
            Archive Overview
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[#A89A98] hover:text-[#F0E8DF] text-xs flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] rounded px-1"
          aria-expanded={isExpanded}
        >
          <span className="text-[11px]">{isExpanded ? "Hide overview" : "Show overview"}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#A89A98]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#A89A98]" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Subtle metrics grid (editorial, NOT corporate analytics) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {/* Total Entries */}
            <div className="space-y-1">
              <span className="text-[11px] font-sans uppercase tracking-[0.12em] text-[#A89A98]/60">
                Preserved
              </span>
              <p className="font-serif text-2xl text-[#F0E8DF]">
                {stats.totalEntries} {stats.totalEntries === 1 ? "reflection" : "reflections"}
              </p>
              <p className="text-xs text-[#A89A98] font-sans">
                Across {stats.distinctDatesCount} distinct {stats.distinctDatesCount === 1 ? "evening" : "evenings"}
              </p>
            </div>

            {/* Time Span */}
            <div className="space-y-1 sm:col-span-2">
              <span className="text-[11px] font-sans uppercase tracking-[0.12em] text-[#A89A98]/60 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#D78A70]/70" />
                <span>Recorded Timeline</span>
              </span>
              <div className="font-serif text-base text-[#F0E8DF]/90 pt-0.5 space-y-0.5">
                {earliestFormatted === latestFormatted ? (
                  <p>Recorded on {earliestFormatted}</p>
                ) : (
                  <>
                    <p className="text-sm">
                      <span className="text-[#A89A98] font-sans text-xs">First: </span>
                      {earliestFormatted}
                    </p>
                    <p className="text-sm">
                      <span className="text-[#A89A98] font-sans text-xs">Latest: </span>
                      {latestFormatted}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Frequently explored tags */}
          {stats.topTags.length > 0 && (
            <div className="pt-4 border-t border-[#45373C]/30 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-sans uppercase tracking-[0.14em] text-[#A89A98]/60">
                <Tag className="w-3 h-3 text-[#D78A70]" />
                <span>Recurring Themes</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {stats.topTags.map(({ tag, count }) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onSelectTag?.(tag)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] ${
                        isSelected
                          ? "bg-[#D78A70] text-[#211A1D] font-medium"
                          : "bg-[#211A1D] hover:bg-[#342A2F] text-[#F0E8DF] border border-[#45373C]/60"
                      }`}
                    >
                      <span>#{tag}</span>
                      <span
                        className={`text-[10px] font-mono ${
                          isSelected ? "text-[#211A1D]/75" : "text-[#A89A98]/70"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

