"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { FutureLetter, FutureLetterDraft } from "@/types/entry";
import {
  calculatePresetDate,
  isOpeningDateValid,
  generateLetterId,
  saveLetterDraft,
  clearLetterDraft,
  loadLetterDraft,
  persistLetter,
} from "@/lib/letters";
import { formatLocalCalendarDate, getLocalCalendarDate } from "@/lib/date";
import {
  Calendar,
  Lock,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface LetterEditorProps {
  initialLetter?: FutureLetter | null;
  onLetterSealed: (letter: FutureLetter) => void;
  onCancel: () => void;
  onDraftDeleted?: () => void;
}

const WRITING_PROMPTS = [
  "What are you hoping for right now?",
  "What is a small detail about today you might forget?",
  "What worry feels big today that might seem small later?",
  "What promise do you want to make to yourself?",
];

export function LetterEditor({
  initialLetter,
  onLetterSealed,
  onCancel,
  onDraftDeleted,
}: LetterEditorProps) {
  const [title, setTitle] = useState(initialLetter?.title || "");
  const [content, setContent] = useState(initialLetter?.content || "");
  const [scheduledDate, setScheduledDate] = useState<string>(
    initialLetter?.scheduledOpenAt || calculatePresetDate("6months")
  );
  const [activePreset, setActivePreset] = useState<string | null>(
    initialLetter ? null : "6months"
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [showSealModal, setShowSealModal] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputId = useId();
  const textareaInputId = useId();
  const isInitialLoad = useRef(true);

  // Load existing draft if no initial letter was passed
  useEffect(() => {
    isInitialLoad.current = true;
    if (!initialLetter) {
      const draft = loadLetterDraft();
      if (draft) {
        setTitle(draft.title || "");
        setContent(draft.content || "");
        if (draft.scheduledOpenAt && isOpeningDateValid(draft.scheduledOpenAt)) {
          setScheduledDate(draft.scheduledOpenAt);
          setActivePreset(null);
        }
      }
    }
    const timer = setTimeout(() => {
      isInitialLoad.current = false;
    }, 120);
    return () => clearTimeout(timer);
  }, [initialLetter]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(260, el.scrollHeight)}px`;
    }
  }, [content]);

  // Debounced Autosave for Draft
  useEffect(() => {
    if (isInitialLoad.current) return;

    if (!title && !content) {
      setSaveStatus("idle");
      if (!initialLetter) {
        clearLetterDraft();
      }
      return;
    }

    setSaveStatus("saving");
    const timeout = setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      if (!initialLetter) {
        const draft: FutureLetterDraft = {
          id: null,
          title,
          content,
          scheduledOpenAt: scheduledDate,
          updatedAt: now.toISOString(),
        };
        saveLetterDraft(draft);
      } else {
        // Autosave existing draft letter
        const updated: FutureLetter = {
          ...initialLetter,
          title: title.trim(),
          content: content,
          scheduledOpenAt: scheduledDate,
          updatedAt: now.toISOString(),
        };
        persistLetter(updated);
      }

      setLastSavedTime(timeStr);
      setSaveStatus("saved");
    }, 700);

    return () => clearTimeout(timeout);
  }, [title, content, scheduledDate, initialLetter]);

  // Presets handler
  const handleSelectPreset = (preset: "1month" | "3months" | "6months" | "1year") => {
    const calculated = calculatePresetDate(preset);
    setScheduledDate(calculated);
    setActivePreset(preset);
    setDateError(null);
  };

  // Custom date change handler
  const handleCustomDateChange = (dateVal: string) => {
    setScheduledDate(dateVal);
    setActivePreset(null);
    if (!isOpeningDateValid(dateVal)) {
      setDateError("Opening date must be in the future (tomorrow or later).");
    } else {
      setDateError(null);
    }
  };

  const handleClearOrDeleteDraft = () => {
    const confirmDelete = window.confirm("Discard this letter draft? Any unsealed writing will be removed.");
    if (confirmDelete) {
      if (initialLetter) {
        onDraftDeleted?.();
      } else {
        clearLetterDraft();
        setTitle("");
        setContent("");
        onCancel();
      }
    }
  };

  const handleInitiateSeal = () => {
    if (!content.trim() && !title.trim()) return;

    if (!isOpeningDateValid(scheduledDate)) {
      setDateError("Please select an opening date in the future before sealing.");
      return;
    }

    setShowSealModal(true);
  };

  const handleConfirmSeal = () => {
    const nowISO = new Date().toISOString();
    const letterToSeal: FutureLetter = {
      id: initialLetter?.id || generateLetterId(),
      title: title.trim(),
      content: content.trim(),
      createdAt: initialLetter?.createdAt || nowISO,
      updatedAt: nowISO,
      scheduledOpenAt: scheduledDate,
      openedAt: null,
      status: "sealed",
    };

    persistLetter(letterToSeal);
    clearLetterDraft();
    setShowSealModal(false);
    onLetterSealed(letterToSeal);
  };

  const formattedOpeningDate = formatLocalCalendarDate(scheduledDate);
  const tomorrowDateStr = calculatePresetDate("1month").substring(0, 8) + "01"; // simple minimum bound reference
  const minDate = calculatePresetDate("1month"); // user can pick tomorrow via native date min

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col py-2 sm:py-4">
      {/* Top Back / Return Navigation */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#45373C]/40 text-xs font-sans">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-[#A89A98] hover:text-[#F0E8DF] transition-colors py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Letters Overview</span>
        </button>

        <div className="text-[11px] text-[#A89A98]/60 font-mono">
          {initialLetter ? "Editing Draft" : "New Future Letter"}
        </div>
      </div>

      {/* Recipient & Personal Introduction (Section 3) */}
      <header className="mb-8">
        <span className="font-sans text-xs tracking-[0.16em] uppercase text-[#D78A70] font-medium">
          To the person I&apos;ll become.
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl text-[#F0E8DF] font-normal tracking-tight mt-1">
          Write to your future self
        </h2>
        <p className="mt-2 font-sans text-sm text-[#A89A98] leading-relaxed">
          Record what matters to you today. Choose a day in the future for this letter to be opened.
        </p>
      </header>

      {/* Editor Canvas */}
      <div className="space-y-6">
        {/* Optional Title Input */}
        <div>
          <label htmlFor={titleInputId} className="sr-only">
            Letter Title (Optional)
          </label>
          <input
            id={titleInputId}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A little reminder for later..."
            className="w-full bg-transparent font-serif text-xl sm:text-2xl text-[#F0E8DF] placeholder-[#A89A98]/35 border-0 border-b border-transparent focus:border-[#45373C] hover:border-[#45373C]/40 pb-2 px-0 transition-colors focus-visible:outline-none focus-visible:ring-0"
          />
        </div>

        {/* Multiline Letter Content */}
        <div>
          <label htmlFor={textareaInputId} className="sr-only">
            Letter Body
          </label>
          <textarea
            id={textareaInputId}
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What do you want your future self to remember?"
            className="w-full min-h-[260px] sm:min-h-[300px] bg-transparent text-[#F0E8DF] placeholder-[#A89A98]/30 font-writing text-lg sm:text-[19px] leading-[1.85] p-0 border-0 focus-visible:outline-none focus-visible:ring-0 selection:bg-[#D78A70]/30 tracking-wide"
            rows={8}
          />
        </div>

        {/* Optional Writing Suggestions (Subtle, non-obtrusive) */}
        {!content && (
          <div className="pt-2 border-t border-[#45373C]/30 text-xs font-sans text-[#A89A98]/70 space-y-1.5">
            <span className="text-[11px] uppercase tracking-wider text-[#A89A98]/50 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#D78A70]/70" />
              <span>Quiet writing prompts:</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {WRITING_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setContent(prompt + "\n\n")}
                  className="text-[11px] text-[#A89A98] hover:text-[#F0E8DF] bg-[#2B2226]/40 hover:bg-[#2B2226] border border-[#45373C]/40 px-2.5 py-1 rounded transition-colors text-left"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Opening Date Selection (Section 4) */}
        <section aria-label="Choose Opening Date" className="pt-4 border-t border-[#45373C]/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-sans text-[#D78A70]">
              <Calendar className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider text-[11px] font-medium">
                When should this open?
              </span>
            </div>
            <span className="text-xs font-serif italic text-[#F0E8DF]">
              Scheduled: {formattedOpeningDate.fullDate}
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "1month", label: "1 Month" },
              { id: "3months", label: "3 Months" },
              { id: "6months", label: "6 Months" },
              { id: "1year", label: "1 Year" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id as any)}
                className={`px-3 py-1.5 rounded text-xs font-sans transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] ${
                  activePreset === p.id
                    ? "bg-[#D78A70] text-[#211A1D] font-medium"
                    : "bg-[#2B2226] hover:bg-[#342A2F] text-[#F0E8DF] border border-[#45373C]/60"
                }`}
              >
                {p.label}
              </button>
            ))}

            {/* Custom Date Picker */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] text-[#A89A98] font-sans">Or pick date:</span>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => handleCustomDateChange(e.target.value)}
                className="bg-[#2B2226] border border-[#45373C]/60 rounded px-2.5 py-1 text-xs text-[#F0E8DF] focus:border-[#D78A70] focus:outline-none"
              />
            </div>
          </div>

          {dateError && (
            <div className="flex items-center gap-1.5 text-xs text-red-300 font-sans">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span>{dateError}</span>
            </div>
          )}
        </section>

        {/* Footer Actions & Save Status */}
        <footer className="pt-6 border-t border-[#45373C]/50 flex flex-wrap items-center justify-between gap-4 text-xs font-sans text-[#A89A98]">
          {/* Left: Autosave status */}
          <div className="flex items-center gap-2">
            {saveStatus === "saving" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70] animate-pulse" />
                <span>Saving draft...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="w-3.5 h-3.5 text-[#D78A70]" />
                <span>Draft saved locally{lastSavedTime ? ` at ${lastSavedTime}` : ""}</span>
              </>
            )}
            {saveStatus === "idle" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#45373C]" />
                <span>{content || title ? "Draft saved locally" : "Ready to write"}</span>
              </>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {(content || title) && (
              <button
                type="button"
                onClick={handleClearOrDeleteDraft}
                className="inline-flex items-center gap-1 text-[#A89A98]/60 hover:text-[#F0E8DF] py-1 px-2 rounded text-xs transition-colors"
                title="Discard draft"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Discard</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleInitiateSeal}
              disabled={!content.trim() && !title.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2B2226] hover:bg-[#342A2F] border border-[#D78A70] text-[#F0E8DF] rounded text-xs transition-colors disabled:opacity-40 disabled:hover:bg-[#2B2226] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
            >
              <Lock className="w-3.5 h-3.5 text-[#D78A70]" />
              <span>Seal Letter</span>
            </button>
          </div>
        </footer>
      </div>

      {/* Sealing Confirmation Dialog (Section 6) */}
      {showSealModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#211A1D]/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#2B2226] border border-[#45373C] max-w-md w-full p-6 sm:p-7 rounded-sm shadow-2xl space-y-5">
            <div className="flex items-center gap-2.5 text-[#D78A70]">
              <Lock className="w-5 h-5" />
              <h3 className="font-serif text-2xl text-[#F0E8DF]">Seal this letter?</h3>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-[#A89A98] font-sans leading-relaxed">
              <p>
                Title: <strong className="text-[#F0E8DF] font-serif text-base">{title || "Untitled letter"}</strong>
              </p>
              <p>
                Scheduled to open on:{" "}
                <strong className="text-[#D78A70] font-serif text-base">{formattedOpeningDate.fullDate}</strong>
              </p>

              <div className="p-3 bg-[#211A1D] border border-[#45373C]/40 rounded text-xs space-y-1.5">
                <p className="font-serif italic text-[#F0E8DF]/90 text-sm">
                  &ldquo;Once sealed, this letter will stay closed until its opening date.&rdquo;
                </p>
                <p className="text-[11px] text-[#A89A98]/60">
                  Notice: Sealing is a personal commitment and state maintained in this browser on this device. It is not cryptographic encryption.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#45373C]/30 text-xs font-sans">
              <button
                type="button"
                onClick={() => setShowSealModal(false)}
                className="px-3.5 py-2 border border-[#45373C] text-[#A89A98] hover:text-[#F0E8DF] rounded transition-colors"
              >
                Return to editing
              </button>
              <button
                type="button"
                onClick={handleConfirmSeal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#D78A70] hover:bg-[#E49A82] text-[#211A1D] font-medium rounded transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm &amp; Seal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
