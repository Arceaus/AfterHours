"use client";

import React, { useState, useMemo } from "react";
import { DiaryEntry } from "@/types/entry";
import {
  formatLocalCalendarDate,
  formatMonthYear,
  getDaysInMonth,
  getFirstDayOfWeek,
  getLocalCalendarDate,
  isToday,
  deriveDisplayTitle,
  formatTimeFromISO,
} from "@/lib/date";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Feather,
  PenLine,
  Trash2,
  Clock,
  RotateCcw,
} from "lucide-react";

interface CalendarViewProps {
  entries: DiaryEntry[];
  onOpenEntry: (entry: DiaryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onWriteForDate: (dateStr: string) => void;
}

export function CalendarView({
  entries,
  onOpenEntry,
  onDeleteEntry,
  onWriteForDate,
}: CalendarViewProps) {
  // Current calendar viewing state (month: 0-11)
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(getLocalCalendarDate());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Map entries by their local calendar date (YYYY-MM-DD)
  const entriesByDate = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    entries.forEach((e) => {
      if (e.entryDate) {
        const existing = map.get(e.entryDate) || [];
        map.set(e.entryDate, [...existing, e]);
      }
    });
    return map;
  }, [entries]);

  // Calendar calculations
  const totalDays = getDaysInMonth(viewYear, viewMonth);
  const firstDayIndex = getFirstDayOfWeek(viewYear, viewMonth); // 0 = Sunday
  const daysInPrevMonth = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  );

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const returnToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(getLocalCalendarDate());
  };

  // Entries for the currently selected date
  const selectedEntries = entriesByDate.get(selectedDate) || [];
  const selectedDateFormatted = formatLocalCalendarDate(selectedDate);

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate calendar cells (previous month trailing days, current month days, next month leading days)
  const calendarCells = useMemo(() => {
    const cells: {
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      hasEntries: boolean;
      entryCount: number;
    }[] = [];

    // Preceding days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEntries = entriesByDate.get(dateStr) || [];
      cells.push({
        day,
        dateStr,
        isCurrentMonth: false,
        hasEntries: dayEntries.length > 0,
        entryCount: dayEntries.length,
      });
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEntries = entriesByDate.get(dateStr) || [];
      cells.push({
        day,
        dateStr,
        isCurrentMonth: true,
        hasEntries: dayEntries.length > 0,
        entryCount: dayEntries.length,
      });
    }

    // Trailing days to round to complete grid rows
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEntries = entriesByDate.get(dateStr) || [];
      cells.push({
        day,
        dateStr,
        isCurrentMonth: false,
        hasEntries: dayEntries.length > 0,
        entryCount: dayEntries.length,
      });
    }

    return cells;
  }, [viewYear, viewMonth, totalDays, firstDayIndex, daysInPrevMonth, entriesByDate]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col py-4 sm:py-6">
      {/* Header */}
      <header className="mb-8 pb-5 border-b border-[#45373C]/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <CalendarIcon className="w-4 h-4 text-[#D78A70]" />
            <span className="font-sans text-xs tracking-[0.16em] uppercase text-[#A89A98] font-medium">
              Temporal Rhythm
            </span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-[#F0E8DF] font-normal tracking-tight">
            Calendar
          </h2>
          <p className="text-xs text-[#A89A98] mt-1 font-sans">
            Every night holds a quiet space. Explore the days you chose to remember.
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={returnToToday}
            className="px-2.5 py-1.5 border border-[#45373C] hover:border-[#D78A70]/60 bg-[#2B2226] text-[#F0E8DF] text-xs font-sans rounded-sm transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
            title="Return to current month"
          >
            <RotateCcw className="w-3 h-3 text-[#D78A70]" />
            <span>This Month</span>
          </button>

          <div className="flex items-center border border-[#45373C] rounded-sm bg-[#2B2226]">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 text-[#A89A98] hover:text-[#F0E8DF] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] rounded-l-sm"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-serif text-sm sm:text-base text-[#F0E8DF] min-w-[140px] text-center select-none">
              {formatMonthYear(viewYear, viewMonth)}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 text-[#A89A98] hover:text-[#F0E8DF] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] rounded-r-sm"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid & Selected Day Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Calendar Grid (7 cols) */}
        <div className="lg:col-span-7 bg-[#2B2226]/30 border border-[#45373C]/40 rounded-sm p-4 sm:p-5">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2 text-center">
            {weekdayNames.map((w) => (
              <span
                key={w}
                className="font-sans text-[11px] uppercase tracking-wider text-[#A89A98]/60 py-1"
              >
                {w}
              </span>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label="Monthly Calendar">
            {calendarCells.map((cell) => {
              const isSelected = selectedDate === cell.dateStr;
              const isCurrentDay = isToday(cell.dateStr);

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${cell.dateStr}${cell.hasEntries ? ` (${cell.entryCount} entries)` : ""}`}
                  className={`min-h-[48px] sm:min-h-[56px] p-1.5 rounded-sm flex flex-col justify-between transition-all relative text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] ${
                    isSelected
                      ? "bg-[#3A2D33] border border-[#D78A70] shadow-[0_0_10px_rgba(215,138,112,0.1)]"
                      : isCurrentDay
                      ? "border border-[#45373C] bg-[#2B2226]/80 hover:bg-[#342A2F]"
                      : "border border-transparent hover:bg-[#2B2226]/50 hover:border-[#45373C]/40"
                  } ${!cell.isCurrentMonth ? "opacity-30" : "opacity-100"}`}
                >
                  {/* Day Number and Today Indicator */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono ${
                        isSelected
                          ? "text-[#F0E8DF] font-semibold"
                          : isCurrentDay
                          ? "text-[#D78A70] font-medium"
                          : "text-[#A89A98]"
                      }`}
                    >
                      {cell.day}
                    </span>

                    {isCurrentDay && (
                      <span
                        className="text-[9px] uppercase tracking-wider font-sans text-[#D78A70] font-medium px-1 rounded bg-[#D78A70]/10"
                        title="Today"
                      >
                        Today
                      </span>
                    )}
                  </div>

                  {/* Entry Marker Dot */}
                  <div className="flex items-center gap-1 mt-auto">
                    {cell.hasEntries && (
                      <div className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-[#D78A70]" : "bg-[#D78A70]/80"
                          }`}
                        />
                        {cell.entryCount > 1 && (
                          <span className="text-[9px] font-mono text-[#D78A70]/80">
                            &times;{cell.entryCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend / Quiet Guidance */}
          <div className="mt-4 pt-3 border-t border-[#45373C]/30 flex flex-wrap items-center justify-between text-[11px] text-[#A89A98]/60 font-sans gap-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70]" />
                <span>Memory recorded</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 border border-[#45373C] rounded-sm" />
                <span>Today</span>
              </span>
            </div>
            <span className="italic font-serif">Click any date to inspect</span>
          </div>
        </div>

        {/* Selected Date Inspector (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="border border-[#45373C]/40 bg-[#2B2226]/40 p-5 sm:p-6 rounded-sm">
            {/* Selected Date Header */}
            <div className="pb-4 mb-4 border-b border-[#45373C]/30 flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-sans uppercase tracking-[0.16em] text-[#D78A70] font-medium">
                  {isToday(selectedDate) ? "Today · Selected Date" : "Selected Date"}
                </span>
                <h3 className="font-serif text-2xl text-[#F0E8DF] mt-1">
                  {selectedDateFormatted.fullDate}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onWriteForDate(selectedDate)}
                className="shrink-0 p-2 text-[#A89A98] hover:text-[#F0E8DF] hover:bg-[#342A2F] border border-[#45373C] rounded transition-colors"
                title={`Write a memory for ${selectedDateFormatted.fullDate}`}
                aria-label="Write an entry for this date"
              >
                <Feather className="w-4 h-4 text-[#D78A70]" />
              </button>
            </div>

            {/* Entries on this date */}
            {selectedEntries.length > 0 ? (
              <div className="space-y-4">
                <div className="text-xs text-[#A89A98] font-sans flex items-center justify-between">
                  <span>
                    {selectedEntries.length} {selectedEntries.length === 1 ? "reflection" : "reflections"} recorded
                  </span>
                </div>

                {selectedEntries.map((entry) => {
                  const displayTitle = deriveDisplayTitle(entry.title, entry.content);
                  const isDeleting = deletingId === entry.id;
                  const timeStr = formatTimeFromISO(entry.createdAt);

                  return (
                    <div
                      key={entry.id}
                      className="p-4 border border-[#45373C]/50 hover:border-[#D78A70]/50 bg-[#211A1D]/60 rounded-sm transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs text-[#A89A98]/70">
                        {timeStr ? (
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-[#A89A98]/50" />
                            <span>{timeStr}</span>
                          </span>
                        ) : (
                          <span />
                        )}

                        {entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {entry.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] text-[#A89A98] bg-[#2B2226] px-1.5 py-0.5 rounded border border-[#45373C]/40"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <h4 className="font-serif text-lg text-[#F0E8DF] leading-snug">
                        {displayTitle}
                      </h4>

                      <p className="font-writing text-sm text-[#F0E8DF]/80 line-clamp-3 leading-relaxed">
                        {entry.content || "(No words recorded)"}
                      </p>

                      <div className="pt-2 border-t border-[#45373C]/30 flex items-center justify-between text-xs font-sans">
                        <button
                          type="button"
                          onClick={() => onOpenEntry(entry)}
                          className="inline-flex items-center gap-1.5 text-[#D78A70] hover:text-[#FAF6F0] font-medium transition-colors"
                        >
                          <PenLine className="w-3.5 h-3.5" />
                          <span>Open in editor</span>
                        </button>

                        {isDeleting ? (
                          <div className="flex items-center gap-2 bg-[#211A1D] px-2 py-0.5 border border-red-900/50 rounded">
                            <span className="text-[10px] text-red-300">Delete?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteEntry(entry.id);
                                setDeletingId(null);
                              }}
                              className="text-xs text-red-400 hover:text-red-300 font-medium px-1"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="text-xs text-[#A89A98] hover:text-[#F0E8DF] px-1"
                            >
                              No
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
                  );
                })}
              </div>
            ) : (
              /* Honest, calm empty state */
              <div className="py-8 text-left space-y-3">
                <p className="font-serif italic text-lg text-[#F0E8DF]/80">
                  Nothing written on this day.
                </p>
                <p className="font-sans text-xs text-[#A89A98] leading-relaxed">
                  Some days pass in quiet observation without words. You can record a delayed reflection whenever you wish.
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => onWriteForDate(selectedDate)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#211A1D] border border-[#45373C] hover:border-[#D78A70] text-[#F0E8DF] text-xs font-sans rounded-sm transition-colors"
                  >
                    <Feather className="w-3.5 h-3.5 text-[#D78A70]" />
                    <span>Record a thought for this date</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

