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
      <div className="flex items-center justify-between mb-8 pb-3 border-b border-[#45373C]/40 text-xs font-sans">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[#A89A98] hover:text-[#F0E8DF] transition-colors py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Future Letters</span>
        </button>

        {showDeleteConfirm ? (
          <div className="flex items-center gap-2 bg-[#2B2226] border border-red-900/60 px-2 py-0.5 rounded">
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
              className="text-xs text-[#A89A98] hover:text-[#F0E8DF] px-1"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[#A89A98]/60 hover:text-red-400 p-1 rounded transition-colors flex items-center gap-1"
            title="Delete this letter"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Delete letter</span>
          </button>
        )}
      </div>

      {/* Header & Meta */}
      <header className="mb-8 space-y-3">
        <div className="flex items-center gap-2 text-xs text-[#D78A70] font-sans">
          <CheckCircle2 className="w-4 h-4" />
          <span className="uppercase tracking-wider text-[11px] font-medium">
            Opened Future Letter
          </span>
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl text-[#F0E8DF] font-normal leading-tight">
          {letter.title || "Untitled letter"}
        </h2>

        {/* Timestamps Info Box */}
        <div className="p-3.5 bg-[#2B2226]/40 border border-[#45373C]/40 rounded-sm text-xs font-sans text-[#A89A98] space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#D78A70]" />
            <span>
              Written on: <strong className="text-[#F0E8DF] font-serif">{createdFormatted}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#A89A98]/60" />
            <span>
              Intended opening: <strong className="text-[#F0E8DF] font-serif">{scheduledFormatted.fullDate}</strong>
            </span>
          </div>
          {openedFormatted && (
            <div className="text-[11px] text-[#A89A98]/60 pt-0.5 italic">
              First opened: {openedFormatted}
            </div>
          )}
        </div>
      </header>

      {/* Complete Unaltered Letter Body */}
      <section aria-label="Letter Body" className="py-6 border-t border-[#45373C]/40">
        <div className="font-writing text-lg sm:text-[19px] leading-[1.85] text-[#F0E8DF] whitespace-pre-wrap tracking-wide">
          {letter.content}
        </div>
      </section>

      {/* Footer Return */}
      <footer className="mt-12 pt-6 border-t border-[#45373C]/40 flex items-center justify-between text-xs font-sans">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2B2226] border border-[#45373C] hover:border-[#D78A70] text-[#F0E8DF] rounded transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#D78A70]" />
          <span>Return to Letters Overview</span>
        </button>

        <span className="font-mono text-[11px] text-[#A89A98]/50">
          Letter ID: {letter.id.substring(0, 8)}
        </span>
      </footer>
    </article>
  );
}

