"use client";

import React, { useState } from "react";
import { FutureLetter } from "@/types/entry";
import { formatLocalCalendarDate, formatDateTimeFromISO } from "@/lib/date";
import { ArrowLeft, Trash2, Calendar, Clock, CheckCircle2 } from "lucide-react";

interface LetterReaderProps {
  letter: FutureLetter;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export function LetterReader({ letter, onBack, onDelete }: LetterReaderProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const createdFormatted = formatDateTimeFromISO(letter.createdAt);
  const scheduledFormatted = formatLocalCalendarDate(letter.scheduledOpenAt);
  const openedFormatted = letter.openedAt ? formatDateTimeFromISO(letter.openedAt) : null;

  return (
    <article className="w-full max-w-2xl mx-auto py-2 sm:py-6 flex flex-col">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-8 pb-3 border-b border-[#FAF6F0]/[0.06] text-xs font-sans">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[#9E948D] hover:text-[#F7F3EE] transition-colors py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Future Letters</span>
        </button>

        {showDeleteConfirm ? (
          <div className="flex items-center gap-2 bg-[#1B1618] border border-red-900/60 px-2 py-0.5 rounded">
            <span className="text-[11px] text-red-300">Delete letter?</span>
            <button
              type="button"
              onClick={() => onDelete(letter.id)}
              className="text-xs text-red-400 hover:text-red-300 font-semibold px-1"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs text-[#9E948D] hover:text-[#F7F3EE] px-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[#9E948D]/60 hover:text-red-400 p-1 rounded transition-colors flex items-center gap-1"
            title="Delete this letter"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Delete letter</span>
          </button>
        )}
      </div>

      {/* Header & Meta */}
      <header className="mb-8 space-y-3">
        <div className="flex items-center gap-2 text-xs text-[#C87A64] font-sans">
          <CheckCircle2 className="w-4 h-4" />
          <span className="uppercase tracking-wider text-[11px] font-medium">
            Opened Future Letter
          </span>
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl text-[#F7F3EE] font-normal leading-tight">
          {letter.title || "Untitled letter"}
        </h2>

        {/* Timestamps Info Box */}
        <div className="p-3.5 bg-[#1B1618]/40 border border-[#FAF6F0]/[0.06] rounded-sm text-xs font-sans text-[#9E948D] space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#C87A64]" />
            <span>
              Written on: <strong className="text-[#F7F3EE] font-serif">{createdFormatted}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#9E948D]/60" />
            <span>
              Intended opening: <strong className="text-[#F7F3EE] font-serif">{scheduledFormatted.fullDate}</strong>
            </span>
          </div>
          {openedFormatted && (
            <div className="text-[11px] text-[#9E948D]/60 pt-0.5 italic">
              First opened: {openedFormatted}
            </div>
          )}
        </div>
      </header>

      {/* Complete Unaltered Letter Body */}
      <section aria-label="Letter Body" className="py-6 border-t border-[#FAF6F0]/[0.06]">
        <div className="font-writing text-lg sm:text-[19px] leading-[1.85] text-[#F7F3EE] whitespace-pre-wrap tracking-wide">
          {letter.content}
        </div>
      </section>

      {/* Footer Return */}
      <footer className="mt-12 pt-6 border-t border-[#FAF6F0]/[0.06] flex items-center justify-between text-xs font-sans">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B1618] border border-[#FAF6F0]/[0.08] hover:border-[#C87A64] text-[#F7F3EE] rounded transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#C87A64]" />
          <span>Return to Letters Overview</span>
        </button>

        <span className="font-mono text-[11px] text-[#9E948D]/50">
          Letter ID: {letter.id.substring(0, 8)}
        </span>
      </footer>
    </article>
  );
}

