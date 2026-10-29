"use client";

import React, { useState, useMemo } from "react";
import { DiaryEntry } from "@/types/entry";
import {
  formatLocalCalendarDate,
  formatTimeFromISO,
  formatDateTimeFromISO,
  getMonthKey,
  formatMonthKey,
  deriveDisplayTitle,
} from "@/lib/date";
import { getMemoryOverview } from "@/lib/storage";
import { MemoryOverview } from "@/components/MemoryOverview";
import {
  BookOpen,
  Feather,
  PenLine,
  Trash2,
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  ArrowUpDown,
  Tag as TagIcon,
  Calendar,
} from "lucide-react";

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
  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<"entryDate" | "updatedAt">("entryDate");
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Compute memory overview statistics from current entries
  const memoryStats = useMemo(() => getMemoryOverview(entries), [entries]);

  // Extract all unique months present in entries for month filter dropdown
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    entries.forEach((e) => {
      const key = getMonthKey(e.entryDate);
      if (key) monthSet.add(key);
    });
    return Array.from(monthSet).sort().reverse();
  }, [entries]);

  // Extract all unique tags present across entries
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => {
      e.tags.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [entries]);

  // Filter and Sort Entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Text Search (title, content, tags)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => {
        const titleMatch = (e.title || "").toLowerCase().includes(q);
        const contentMatch = (e.content || "").toLowerCase().includes(q);
        const tagMatch = e.tags.some((t) => t.toLowerCase().includes(q));
        return titleMatch || contentMatch || tagMatch;
      });
    }

    // Tag Filter (AND condition: entry must contain all selected tags)
    if (selectedTags.length > 0) {
      result = result.filter((e) => {
        const entryTagsLower = e.tags.map((t) => t.toLowerCase());
        return selectedTags.every((sel) => entryTagsLower.includes(sel.toLowerCase()));
      });
    }

    // Month Filter
    if (selectedMonth !== "all") {
      result = result.filter((e) => getMonthKey(e.entryDate) === selectedMonth);
    }

    // Date Range Filters
    if (startDate) {
      result = result.filter((e) => e.entryDate >= startDate);
    }
    if (endDate) {
      result = result.filter((e) => e.entryDate <= endDate);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "updatedAt") {
        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      }
      // Default: entryDate descending, then createdAt descending
      const dateComp = (b.entryDate || "").localeCompare(a.entryDate || "");
      if (dateComp !== 0) return dateComp;
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });

    return result;
  }, [entries, searchQuery, selectedTags, selectedMonth, startDate, endDate, sortBy]);

  // Group filtered entries by Month (YYYY-MM)
  const groupedByMonth = useMemo(() => {
    const groups: { monthKey: string; monthLabel: string; entries: DiaryEntry[] }[] = [];
    const groupMap = new Map<string, DiaryEntry[]>();

    filteredEntries.forEach((entry) => {
      const key = getMonthKey(entry.entryDate) || "undated";
      const existing = groupMap.get(key) || [];
      groupMap.set(key, [...existing, entry]);
    });

    groupMap.forEach((monthEntries, monthKey) => {
      groups.push({
        monthKey,
        monthLabel: monthKey === "undated" ? "Earlier Thoughts" : formatMonthKey(monthKey),
        entries: monthEntries,
      });
    });

    return groups;
  }, [filteredEntries]);

  const toggleMonthCollapse = (monthKey: string) => {
    setCollapsedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  };

  const toggleTagFilter = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedMonth("all");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedTags.length > 0 ||
      selectedMonth !== "all" ||
      startDate ||
      endDate
  );

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col py-4 sm:py-6">
      {/* Header */}
      <header className="mb-8 pb-6 border-b border-[#45373C]/40">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border border-[#45373C] bg-[#2B2226] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-[#D78A70]" />
            </div>
            <span className="font-sans text-xs tracking-[0.16em] uppercase text-[#A89A98] font-medium">
              Memory Archive
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
        <p className="mt-1 font-sans text-sm text-[#A89A98]">
          {entries.length === 0
            ? "Your archive is quiet. No memories have been recorded yet."
            : `${entries.length} ${entries.length === 1 ? "reflection" : "reflections"} preserved in your sanctuary.`}
        </p>
      </header>

      {/* Memory Overview (Section 6) */}
      {entries.length > 0 && (
        <MemoryOverview
          stats={memoryStats}
          onSelectTag={toggleTagFilter}
          selectedTags={selectedTags}
        />
      )}

      {/* Filter and Search Controls Bar */}
      {entries.length > 0 && (
        <section aria-label="Archive Filters" className="mb-8 space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#A89A98]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords, titles, or tags..."
              className="w-full bg-[#2B2226]/40 border border-[#45373C]/50 rounded-sm py-2.5 pl-10 pr-4 text-xs font-sans text-[#F0E8DF] placeholder-[#A89A98]/40 focus:border-[#D78A70]/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A89A98] hover:text-[#F0E8DF] p-1"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Secondary Filter Row: Month, Date Range, Sort Order */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-[#A89A98]">
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Dropdown */}
              {availableMonths.length > 1 && (
                <div className="flex items-center gap-1.5 bg-[#2B2226] border border-[#45373C]/60 rounded px-2.5 py-1">
                  <Calendar className="w-3 h-3 text-[#D78A70]" />
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-[#F0E8DF] text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-[#2B2226]">All Months</option>
                    {availableMonths.map((m) => (
                      <option key={m} value={m} className="bg-[#2B2226]">
                        {formatMonthKey(m)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Range Inputs */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-[#A89A98]/60">Between:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-[#2B2226] border border-[#45373C]/50 rounded px-2 py-0.5 text-[#F0E8DF] text-xs focus:border-[#D78A70]/60 focus:outline-none"
                  title="Start date"
                />
                <span className="text-[#A89A98]/60">&rarr;</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-[#2B2226] border border-[#45373C]/50 rounded px-2 py-0.5 text-[#F0E8DF] text-xs focus:border-[#D78A70]/60 focus:outline-none"
                  title="End date"
                />
              </div>
            </div>

            {/* Sort Order Selector */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3 h-3 text-[#A89A98]/60" />
              <button
                type="button"
                onClick={() => setSortBy(sortBy === "entryDate" ? "updatedAt" : "entryDate")}
                className="hover:text-[#F0E8DF] transition-colors py-1 px-1.5 rounded hover:bg-[#2B2226]"
              >
                Sort: {sortBy === "entryDate" ? "Entry Date" : "Last Modified"}
              </button>
            </div>
          </div>

          {/* Tag Filter Chips Bar */}
          {availableTags.length > 0 && (
            <div className="pt-2 border-t border-[#45373C]/30 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-[#A89A98]/60 uppercase tracking-wider flex items-center gap-1 mr-1 font-sans">
                <TagIcon className="w-3 h-3 text-[#D78A70]/80" />
                <span>Filter by tag:</span>
              </span>
              {availableTags.map((t) => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTagFilter(t)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] ${
                      isSelected
                        ? "bg-[#D78A70] text-[#211A1D] font-medium"
                        : "bg-[#2B2226] text-[#F0E8DF]/80 hover:bg-[#342A2F] border border-[#45373C]/50"
                    }`}
                  >
                    <span>#{t}</span>
                    {isSelected && <X className="w-2.5 h-2.5 text-[#211A1D]" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active Filter Indicators & Reset Action */}
          {hasActiveFilters && (
            <div className="pt-2 flex items-center justify-between text-xs text-[#A89A98] bg-[#2B2226]/30 px-3 py-2 rounded border border-[#45373C]/30">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#D78A70]" />
                <span>
                  Showing {filteredEntries.length} of {entries.length} {entries.length === 1 ? "reflection" : "reflections"}
                </span>
              </div>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[#D78A70] hover:text-[#FAF6F0] underline text-xs transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>
      )}

      {/* Main Content: Grouped Entries or Calm Empty States */}
      {entries.length === 0 ? (
        <div className="border border-[#45373C]/40 bg-[#2B2226]/30 p-8 sm:p-10 rounded-sm text-left space-y-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[#D78A70] font-sans font-medium">
            A Clean Slate
          </div>
          <h3 className="font-serif text-2xl text-[#F0E8DF] font-normal">
            No past entries yet. Tonight is where it begins.
          </h3>
          <p className="font-sans text-sm text-[#A89A98] leading-relaxed max-w-lg">
            Every night you write, your thoughts are stored quietly on this device. You will find them here chronologically grouped by month.
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
        <div className="py-12 border border-[#45373C]/40 bg-[#2B2226]/20 rounded-sm text-center px-6 space-y-3">
          <p className="font-serif italic text-lg text-[#F0E8DF]">
            No reflections match your active filters.
          </p>
          <p className="text-xs text-[#A89A98] font-sans max-w-md mx-auto">
            Try adjusting your search terms, clearing selected tags, or widening the date range.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-[#D78A70] hover:underline"
            >
              Reset all filters
            </button>
          </div>
        </div>
      ) : (
        /* Monthly Groups (Section 2) */
        <div className="space-y-10">
          {groupedByMonth.map(({ monthKey, monthLabel, entries: monthEntries }) => {
            const isCollapsed = Boolean(collapsedMonths[monthKey]);

            return (
              <section key={monthKey} className="space-y-4">
                {/* Month Group Header */}
                <div
                  onClick={() => toggleMonthCollapse(monthKey)}
                  className="flex items-center justify-between pb-2.5 border-b border-[#45373C]/50 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif text-xl sm:text-2xl text-[#F0E8DF] group-hover:text-[#FAF6F0] transition-colors">
                      {monthLabel}
                    </h3>
                    <span className="text-[11px] font-mono text-[#A89A98]/60 bg-[#2B2226] px-2 py-0.5 rounded border border-[#45373C]/40">
                      {monthEntries.length} {monthEntries.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="p-1 text-[#A89A98] group-hover:text-[#F0E8DF] transition-colors"
                    aria-label={isCollapsed ? `Expand ${monthLabel}` : `Collapse ${monthLabel}`}
                  >
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronUp className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Entry Previews within this month */}
                {!isCollapsed && (
                  <div className="space-y-4 pt-1">
                    {monthEntries.map((entry) => {
                      const dateObj = formatLocalCalendarDate(entry.entryDate);
                      const timeStr = formatTimeFromISO(entry.createdAt);
                      const words = entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0;
                      const isDeleting = deletingId === entry.id;
                      const wasEdited = entry.updatedAt && entry.updatedAt !== entry.createdAt;

                      // Derive temporary display title without saving it into entry
                      const displayTitle = deriveDisplayTitle(entry.title, entry.content);

                      return (
                        <article
                          key={entry.id}
                          className="border border-[#45373C]/40 bg-[#2B2226]/30 hover:bg-[#2B2226]/60 p-5 sm:p-6 rounded-sm transition-all group"
                        >
                          {/* Meta Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#45373C]/30 text-xs text-[#A89A98]/70">
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

                            <div className="flex items-center gap-3">
                              {wasEdited && (
                                <span className="text-[10px] text-[#A89A98]/50 italic font-sans" title={`Edited on ${formatDateTimeFromISO(entry.updatedAt)}`}>
                                  Edited {formatDateTimeFromISO(entry.updatedAt)}
                                </span>
                              )}
                              <span className="font-mono text-[11px] text-[#A89A98]/50">
                                {words} {words === 1 ? "word" : "words"}
                              </span>
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="font-serif text-xl sm:text-2xl text-[#F0E8DF] font-normal mb-2 leading-snug">
                            {displayTitle}
                          </h4>

                          {/* Body Excerpt */}
                          <p className="font-writing text-base text-[#F0E8DF]/85 leading-[1.8] whitespace-pre-wrap line-clamp-3">
                            {entry.content || "(No words recorded)"}
                          </p>

                          {/* Tags Display on Preview */}
                          {entry.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {entry.tags.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => toggleTagFilter(tag)}
                                  className="text-[10px] font-sans text-[#A89A98] hover:text-[#F0E8DF] bg-[#211A1D] px-2 py-0.5 rounded border border-[#45373C]/40 hover:border-[#D78A70]/40 transition-colors"
                                  title={`Filter by #${tag}`}
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Footer Actions */}
                          <div className="mt-4 pt-3 border-t border-[#45373C]/30 flex items-center justify-between text-xs font-sans">
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
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
