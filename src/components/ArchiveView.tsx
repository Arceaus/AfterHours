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
  Image as ImageIcon,
  SlidersHorizontal,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortBy, setSortBy] = useState<"entryDate" | "updatedAt">("entryDate");
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const memoryStats = useMemo(() => getMemoryOverview(entries), [entries]);

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    entries.forEach((e) => {
      const key = getMonthKey(e.entryDate);
      if (key) monthSet.add(key);
    });
    return Array.from(monthSet).sort().reverse();
  }, [entries]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => {
      e.tags.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => {
        const titleMatch = (e.title || "").toLowerCase().includes(q);
        const contentMatch = (e.content || "").toLowerCase().includes(q);
        const tagMatch = e.tags.some((t) => t.toLowerCase().includes(q));
        return titleMatch || contentMatch || tagMatch;
      });
    }

    if (selectedTags.length > 0) {
      result = result.filter((e) => {
        const entryTagsLower = e.tags.map((t) => t.toLowerCase());
        return selectedTags.every((sel) => entryTagsLower.includes(sel.toLowerCase()));
      });
    }

    if (selectedMonth !== "all") {
      result = result.filter((e) => getMonthKey(e.entryDate) === selectedMonth);
    }

    if (startDate) {
      result = result.filter((e) => e.entryDate >= startDate);
    }
    if (endDate) {
      result = result.filter((e) => e.entryDate <= endDate);
    }

    result.sort((a, b) => {
      if (sortBy === "entryDate") {
        const dateCmp = b.entryDate.localeCompare(a.entryDate);
        if (dateCmp !== 0) return dateCmp;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      } else {
        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      }
    });

    return result;
  }, [entries, searchQuery, selectedTags, selectedMonth, startDate, endDate, sortBy]);

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    filteredEntries.forEach((entry) => {
      const key = getMonthKey(entry.entryDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    });

    const groups: { monthKey: string; monthLabel: string; entries: DiaryEntry[] }[] = [];
    Array.from(map.keys()).forEach((key) => {
      groups.push({
        monthKey: key,
        monthLabel: formatMonthKey(key),
        entries: map.get(key)!,
      });
    });

    return groups;
  }, [filteredEntries]);

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleMonthCollapse = (monthKey: string) => {
    setCollapsedMonths((prev) => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setSelectedMonth("all");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedTags.length > 0 ||
    selectedMonth !== "all" ||
    Boolean(startDate) ||
    Boolean(endDate);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12 select-none">
      {/* Editorial Header */}
      <header className="space-y-4 pt-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D78A70] font-sans">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Chronology of Reflection</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl text-[#F7F3EE] font-light tracking-[-0.01em]">
          Whispers of Earlier Nights
        </h1>

        <p className="font-serif italic text-base sm:text-lg text-[#9E948D] max-w-xl">
          Every thought you have ever given form to is preserved here, waiting patiently to be revisited.
        </p>

        {/* Minimal Floating Search & Filter Bar */}
        <div className="pt-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9E948D] absolute left-4 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search through titles, phrases, or memories..."
              className="w-full bg-[#1A1517]/70 backdrop-blur-xl border border-[#FAF6F0]/[0.08] focus:border-[#D78A70]/60 rounded-full pl-11 pr-10 py-3 text-xs sm:text-sm text-[#F7F3EE] placeholder-[#9E948D]/40 transition-colors focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-3.5 text-[#9E948D] hover:text-[#F7F3EE]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`p-3 rounded-full border transition-all flex items-center gap-2 text-xs font-sans ${
              hasActiveFilters || showFilterDrawer
                ? "bg-[#D78A70] text-[#120F10] border-[#D78A70] font-medium"
                : "bg-[#1A1517]/70 text-[#9E948D] hover:text-[#F7F3EE] border-[#FAF6F0]/[0.08]"
            }`}
            title="Filter memories"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>
      </header>

      {/* Expandable Filter Controls Drawer */}
      {showFilterDrawer && (
        <section className="p-6 bg-[#1A1517]/60 backdrop-blur-xl border border-[#FAF6F0]/[0.08] rounded-2xl space-y-4 animate-scaleUp">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
            <div>
              <label className="block text-[#9E948D] mb-1.5 font-serif italic">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-[#120F10] border border-[#FAF6F0]/[0.08] rounded-lg px-3 py-2 text-[#F7F3EE] focus:outline-none"
              >
                <option value="all">All recorded months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthKey(m)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#9E948D] mb-1.5 font-serif italic">Sort</label>
              <button
                type="button"
                onClick={() => setSortBy(sortBy === "entryDate" ? "updatedAt" : "entryDate")}
                className="w-full bg-[#120F10] border border-[#FAF6F0]/[0.08] rounded-lg px-3 py-2 text-[#F7F3EE] text-left flex items-center justify-between"
              >
                <span>{sortBy === "entryDate" ? "Entry Date" : "Last Modified"}</span>
                <ArrowUpDown className="w-3.5 h-3.5 text-[#9E948D]" />
              </button>
            </div>

            <div>
              <label className="block text-[#9E948D] mb-1.5 font-serif italic">Date range</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-[#120F10] border border-[#FAF6F0]/[0.08] rounded-lg px-2 py-2 text-[#F7F3EE] text-[11px]"
                />
                <span className="text-[#9E948D]">&rarr;</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[#120F10] border border-[#FAF6F0]/[0.08] rounded-lg px-2 py-2 text-[#F7F3EE] text-[11px]"
                />
              </div>
            </div>
          </div>

          {availableTags.length > 0 && (
            <div className="pt-4 border-t border-[#FAF6F0]/[0.06] flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-[#9E948D] font-serif italic mr-2">Tags:</span>
              {availableTags.map((t) => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTagFilter(t)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                      isSelected
                        ? "bg-[#D78A70] text-[#120F10] font-medium"
                        : "bg-[#FAF6F0]/[0.04] text-[#FAF6F0]/80 hover:bg-[#FAF6F0]/[0.08]"
                    }`}
                  >
                    #{t}
                  </button>
                );
              })}
            </div>
          )}

          {hasActiveFilters && (
            <div className="pt-2 flex items-center justify-between text-xs text-[#9E948D]">
              <span>
                Showing {filteredEntries.length} of {entries.length} reflections
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[#D78A70] hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>
      )}

      {/* Main Content: Chronological Editorial Sections */}
      {entries.length === 0 ? (
        <div className="p-12 sm:p-16 border border-[#FAF6F0]/[0.08] bg-[#1A1517]/40 backdrop-blur-xl rounded-3xl text-center space-y-4">
          <p className="font-serif italic text-2xl text-[#F7F3EE]">
            The pages are completely clear.
          </p>
          <p className="text-sm text-[#9E948D] max-w-md mx-auto leading-relaxed">
            Whenever you record thoughts on the Tonight screen, they will rest here in your personal chronology.
          </p>
          <div className="pt-4">
            <button
              type="button"
              onClick={onReturnToTonight}
              className="px-6 py-2.5 bg-[#FAF6F0]/[0.08] hover:bg-[#D78A70] hover:text-[#120F10] text-[#F7F3EE] rounded-full text-xs font-sans transition-all"
            >
              Begin tonight
            </button>
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <p className="font-serif italic text-xl text-[#F7F3EE]">
            No reflections match your active filters.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-[#D78A70] hover:underline font-sans"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-16">
          {groupedByMonth.map(({ monthKey, monthLabel, entries: monthEntries }) => {
            const isCollapsed = Boolean(collapsedMonths[monthKey]);

            return (
              <section key={monthKey} className="space-y-6">
                {/* Large Typographic Month Header */}
                <div
                  onClick={() => toggleMonthCollapse(monthKey)}
                  className="flex items-center justify-between pb-3 border-b border-[#FAF6F0]/[0.08] cursor-pointer group"
                >
                  <div className="flex items-baseline gap-4">
                    <h2 className="font-serif text-3xl sm:text-4xl text-[#F7F3EE] group-hover:text-[#FAF6F0] font-light tracking-wide transition-colors">
                      {monthLabel}
                    </h2>
                    <span className="text-xs font-mono text-[#9E948D]/70">
                      {monthEntries.length} {monthEntries.length === 1 ? "reflection" : "reflections"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="p-1.5 text-[#9E948D] group-hover:text-[#F7F3EE] transition-colors"
                    aria-label={isCollapsed ? `Expand ${monthLabel}` : `Collapse ${monthLabel}`}
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {/* Asymmetric Editorial Memory Cards */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 gap-6 pt-2">
                    {monthEntries.map((entry) => {
                      const dateObj = formatLocalCalendarDate(entry.entryDate);
                      const timeStr = formatTimeFromISO(entry.createdAt);
                      const words = entry.content.trim() ? entry.content.trim().split(/\s+/).length : 0;
                      const isDeleting = deletingId === entry.id;
                      const wasEdited = entry.updatedAt && entry.updatedAt !== entry.createdAt;
                      const displayTitle = deriveDisplayTitle(entry.title, entry.content);

                      return (
                        <article
                          key={entry.id}
                          className="relative p-6 sm:p-8 bg-[#1A1517]/50 hover:bg-[#1A1517]/80 backdrop-blur-xl border border-[#FAF6F0]/[0.07] hover:border-[#D78A70]/40 rounded-2xl transition-all duration-300 group shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 mb-4 border-b border-[#FAF6F0]/[0.06]">
                            <div className="flex items-baseline gap-3">
                              <span className="font-serif text-3xl sm:text-4xl text-[#D78A70] font-light">
                                {dateObj.monthDay.split(" ")[1] || "—"}
                              </span>
                              <span className="font-serif italic text-base text-[#F7F3EE]">
                                {dateObj.weekday}
                              </span>
                              {timeStr && (
                                <span className="text-xs text-[#9E948D]/60 font-mono">
                                  {timeStr}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-[#9E948D]/60 font-sans">
                              {entry.attachments?.length > 0 && (
                                <span className="flex items-center gap-1 text-[#D78A70]">
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  <span>{entry.attachments.length}</span>
                                </span>
                              )}
                              <span>{words} words</span>
                            </div>
                          </div>

                          <h3 className="font-serif text-xl sm:text-2xl text-[#F7F3EE] font-normal mb-3 leading-snug">
                            {displayTitle}
                          </h3>

                          <p className="font-writing text-base sm:text-[17px] text-[#E5DDD3]/85 leading-relaxed whitespace-pre-wrap line-clamp-3">
                            {entry.content || "(No words recorded)"}
                          </p>

                          {entry.tags.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {entry.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[11px] font-sans text-[#9E948D] bg-[#FAF6F0]/[0.04] px-2.5 py-0.5 rounded-full"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-6 pt-4 border-t border-[#FAF6F0]/[0.06] flex items-center justify-between text-xs font-sans">
                            <button
                              type="button"
                              onClick={() => onOpenEntry(entry)}
                              className="inline-flex items-center gap-1.5 text-[#D78A70] hover:text-[#FAF6F0] font-serif italic text-sm transition-colors"
                            >
                              <PenLine className="w-3.5 h-3.5" />
                              <span>Revisit reflection &rarr;</span>
                            </button>

                            <div>
                              {isDeleting ? (
                                <div className="flex items-center gap-2 bg-[#120F10] px-3 py-1 rounded-full border border-red-900/40">
                                  <span className="text-red-300 text-[11px]">Delete?</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteEntry(entry.id);
                                      setDeletingId(null);
                                    }}
                                    className="text-red-400 hover:text-red-300 font-semibold"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingId(null)}
                                    className="text-[#9E948D] hover:text-[#F7F3EE]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingId(entry.id)}
                                  className="p-1.5 text-[#9E948D]/40 hover:text-red-400 transition-colors"
                                  title="Delete entry"
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
