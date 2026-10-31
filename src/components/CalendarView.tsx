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
  Image as ImageIcon,
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
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(getLocalCalendarDate());
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const totalDays = getDaysInMonth(viewYear, viewMonth);
  const firstDayIndex = getFirstDayOfWeek(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const returnToToday = () => {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    setSelectedDate(getLocalCalendarDate());
  };

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysInPrevMonth = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  );

  const calendarCells = useMemo(() => {
    const cells: {
      dateStr: string;
      day: number;
      isCurrentMonth: boolean;
      hasEntries: boolean;
      entryCount: number;
    }[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 12 : viewMonth;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEntries = entriesByDate.get(dateStr) || [];
      cells.push({
        dateStr,
        day,
        isCurrentMonth: false,
        hasEntries: dayEntries.length > 0,
        entryCount: dayEntries.length,
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEntries = entriesByDate.get(dateStr) || [];
      cells.push({
        dateStr,
        day: d,
        isCurrentMonth: true,
        hasEntries: dayEntries.length > 0,
        entryCount: dayEntries.length,
      });
    }

    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 1 : viewMonth + 2;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayEntries = entriesByDate.get(dateStr) || [];
      cells.push({
        dateStr,
        day: d,
        isCurrentMonth: false,
        hasEntries: dayEntries.length > 0,
        entryCount: dayEntries.length,
      });
    }

    return cells;
  }, [viewYear, viewMonth, totalDays, firstDayIndex, daysInPrevMonth, entriesByDate]);

  const selectedDateFormatted = formatLocalCalendarDate(selectedDate);
  const selectedEntries = entriesByDate.get(selectedDate) || [];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10 py-4 select-none">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#FFFFFF]/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-[0.2em] text-[#FF9254] font-sans">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Temporal Rhythm</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#FFFFFF] font-light">
            Calendar of Thoughts
          </h1>
          <p className="font-serif italic text-base text-[#B3A8C6] mt-1">
            Every night holds a quiet space. Explore the moments you chose to preserve.
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={returnToToday}
            className="px-3.5 py-1.5 border border-[#FFFFFF]/[0.08] hover:border-[#FF9254]/50 bg-[#0E0919]/80 text-[#FFFFFF] text-xs font-sans rounded-full transition-colors flex items-center gap-1.5"
            title="Return to current month"
          >
            <RotateCcw className="w-3 h-3 text-[#FF9254]" />
            <span>Today</span>
          </button>

          <div className="flex items-center border border-[#FFFFFF]/[0.08] rounded-full bg-[#0E0919]/80 p-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 text-[#B3A8C6] hover:text-[#FFFFFF] rounded-full hover:bg-[#FFFFFF]/[0.05] transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-0.5 font-serif text-sm sm:text-base text-[#FFFFFF] min-w-[130px] text-center select-none">
              {formatMonthYear(viewYear, viewMonth)}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 text-[#B3A8C6] hover:text-[#FFFFFF] rounded-full hover:bg-[#FFFFFF]/[0.05] transition-colors"
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
        <div className="lg:col-span-7 bg-[#0E0919]/50 backdrop-blur-xl border border-[#FFFFFF]/[0.08] rounded-2xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
          <div className="grid grid-cols-7 mb-3 text-center">
            {weekdayNames.map((w) => (
              <span
                key={w}
                className="font-sans text-[11px] uppercase tracking-wider text-[#B3A8C6]/60 py-1"
              >
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2" role="grid" aria-label="Monthly Calendar">
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
                  className={`min-h-[52px] sm:min-h-[60px] p-2 rounded-xl flex flex-col justify-between transition-all relative text-left ${
                    isSelected
                      ? "bg-[#FF9254]/15 border border-[#FF9254] shadow-[0_0_15px_rgba(215,138,112,0.15)]"
                      : isCurrentDay
                      ? "border border-[#FFFFFF]/[0.12] bg-[#FFFFFF]/[0.03] hover:bg-[#FFFFFF]/[0.06]"
                      : "border border-transparent hover:bg-[#FFFFFF]/[0.03] hover:border-[#FFFFFF]/[0.06]"
                  } ${!cell.isCurrentMonth ? "opacity-25" : "opacity-100"}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono ${
                        isSelected
                          ? "text-[#FFFFFF] font-semibold"
                          : isCurrentDay
                          ? "text-[#FF9254] font-medium"
                          : "text-[#B3A8C6]"
                      }`}
                    >
                      {cell.day}
                    </span>

                    {isCurrentDay && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF9254]" title="Today" />
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-auto">
                    {cell.hasEntries && (
                      <div className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? "bg-[#FF9254]" : "bg-[#FF9254]/70"
                          }`}
                        />
                        {cell.entryCount > 1 && (
                          <span className="text-[9px] font-mono text-[#FF9254]/80">
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

          <div className="mt-6 pt-4 border-t border-[#FFFFFF]/[0.06] flex items-center justify-between text-xs text-[#B3A8C6]/60 font-sans">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9254]" />
              <span>Recorded thought</span>
            </span>
            <span>Click any day to inspect</span>
          </div>
        </div>

        {/* Selected Day Inspector (5 cols) */}
        <div className="lg:col-span-5 bg-[#0E0919]/50 backdrop-blur-xl border border-[#FFFFFF]/[0.08] rounded-2xl p-6 sm:p-7 space-y-6 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#FFFFFF]/[0.08]">
            <div>
              <span className="font-serif italic text-lg sm:text-xl text-[#FF9254]">
                {selectedDateFormatted.weekday}, {selectedDateFormatted.monthDay}
              </span>
              <p className="text-xs text-[#B3A8C6] font-mono mt-0.5">
                {selectedDateFormatted.year}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onWriteForDate(selectedDate)}
              className="inline-flex items-center gap-1.5 text-xs font-sans text-[#FFFFFF] bg-[#FFFFFF]/[0.06] hover:bg-[#FF9254] hover:text-[#08060F] border border-[#FFFFFF]/[0.08] rounded-full px-3 py-1.5 transition-all"
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Record</span>
            </button>
          </div>

          {selectedEntries.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="font-serif italic text-base text-[#B3A8C6]">
                No reflection recorded for this date.
              </p>
              <p className="text-xs text-[#B3A8C6]/60">
                You can write a thought for this day at any time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedEntries.map((entry) => {
                const timeStr = formatTimeFromISO(entry.createdAt);
                const displayTitle = deriveDisplayTitle(entry.title, entry.content);

                return (
                  <div
                    key={entry.id}
                    className="p-4 bg-[#FFFFFF]/[0.03] hover:bg-[#FFFFFF]/[0.06] border border-[#FFFFFF]/[0.06] rounded-xl transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-[#B3A8C6]">
                      {timeStr && (
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3 h-3 text-[#B3A8C6]/50" />
                          <span>{timeStr}</span>
                        </span>
                      )}

                      {entry.attachments?.length > 0 && (
                        <span className="flex items-center gap-1 font-mono text-[10px] text-[#FF9254]">
                          <ImageIcon className="w-3 h-3" />
                          <span>{entry.attachments.length}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif text-lg text-[#FFFFFF] leading-snug">
                      {displayTitle}
                    </h4>

                    <p className="font-writing text-sm text-[#E5DDD3]/80 line-clamp-3 leading-relaxed">
                      {entry.content || "(No words recorded)"}
                    </p>

                    <div className="pt-2 border-t border-[#FFFFFF]/[0.06] flex items-center justify-between text-xs font-sans">
                      <button
                        type="button"
                        onClick={() => onOpenEntry(entry)}
                        className="inline-flex items-center gap-1.5 text-[#FF9254] hover:text-[#FFFFFF] font-serif italic text-xs transition-colors"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        <span>Open in editor</span>
                      </button>

                      <div>
                        {deletingId === entry.id ? (
                          <div className="flex items-center gap-2 bg-[#08060F] px-2 py-0.5 border border-red-900/40 rounded-full">
                            <span className="text-[10px] text-red-300">Delete?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteEntry(entry.id);
                                setDeletingId(null);
                              }}
                              className="text-xs text-red-400 font-bold"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="text-xs text-[#B3A8C6]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingId(entry.id)}
                            className="p-1 text-[#B3A8C6]/40 hover:text-red-400 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
