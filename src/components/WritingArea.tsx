"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { DiaryEntry, DraftState } from "@/types/entry";
import { formatLocalCalendarDate, getFormattedDate, getLocalCalendarDate } from "@/lib/date";
import {
  generateId,
  getEntryById,
  persistEntry,
  removeEntry,
  loadActiveDraft,
  saveActiveDraft,
  clearActiveDraft,
} from "@/lib/storage";
import { TagEditor } from "@/components/TagEditor";
import { Check, Sparkles, RotateCcw, Clock, Trash2, ArrowLeft, PenLine } from "lucide-react";

interface WritingAreaProps {
  activeEntryId: string | null;
  customDate?: string | null;
  onWordCountChange?: (count: number) => void;
  onEntrySaved?: (entry: DiaryEntry) => void;
  onEntryDeleted?: (id: string) => void;
  onStartNewDraft?: () => void;
}

export function WritingArea({
  activeEntryId,
  customDate,
  onWordCountChange,
  onEntrySaved,
  onEntryDeleted,
  onStartNewDraft,
}: WritingAreaProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [entryDate, setEntryDate] = useState<string>(customDate || getLocalCalendarDate());
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [dateDisplay, setDateDisplay] = useState({
    fullString: "",
    year: "",
    timeString: "",
    nightWhisper: "The last room awake",
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputId = useId();
  const textareaInputId = useId();
  const isInitialLoad = useRef(true);

  // Initialize atmospheric date information client-side
  useEffect(() => {
    const d = getFormattedDate();
    setDateDisplay({
      fullString: d.fullString,
      year: d.year,
      timeString: d.timeString,
      nightWhisper: d.nightWhisper,
    });
  }, []);

  // Load entry or draft whenever activeEntryId or customDate changes
  useEffect(() => {
    isInitialLoad.current = true;
    setShowDeleteConfirm(false);

    if (activeEntryId) {
      // Load existing entry
      const existing = getEntryById(activeEntryId);
      if (existing) {
        setTitle(existing.title || "");
        setContent(existing.content || "");
        setTags(existing.tags || []);
        setEntryDate(existing.entryDate);
        setOriginalCreatedAt(existing.createdAt);
        setSaveStatus("idle");
        const formatted = formatLocalCalendarDate(existing.entryDate);
        setDateDisplay((prev) => ({
          ...prev,
          fullString: `${formatted.weekday}, ${formatted.monthDay}`,
          year: formatted.year,
        }));
      }
    } else {
      // Load draft for new entry
      const draft = loadActiveDraft();
      const targetDate = customDate || getLocalCalendarDate();
      setEntryDate(targetDate);
      setOriginalCreatedAt(null);

      if (draft && !draft.entryId) {
        setTitle(draft.title || "");
        setContent(draft.content || "");
        setTags(draft.tags || []);
      } else {
        setTitle("");
        setContent("");
        setTags([]);
      }
      setSaveStatus("idle");

      const formatted = formatLocalCalendarDate(targetDate);
      const d = getFormattedDate();
      setDateDisplay({
        fullString: `${formatted.weekday}, ${formatted.monthDay}`,
        year: formatted.year,
        timeString: d.timeString,
        nightWhisper: d.nightWhisper,
      });
    }

    // Mark initial load done on next tick
    const timer = setTimeout(() => {
      isInitialLoad.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, [activeEntryId, customDate]);

  // Auto-resize textarea to fit content comfortably
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(280, el.scrollHeight)}px`;
    }
  }, [content]);

  // Word count & reading time calculation
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(words / 180));

  useEffect(() => {
    onWordCountChange?.(words);
  }, [words, onWordCountChange]);

  // Autosave mechanism (covers title, content, and tags)
  useEffect(() => {
    // Avoid triggering autosave on initial component load
    if (isInitialLoad.current) return;

    if (!title && !content && tags.length === 0) {
      setSaveStatus("idle");
      if (!activeEntryId) {
        clearActiveDraft();
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

      if (activeEntryId) {
        // Autosave existing entry directly to storage
        const existing = getEntryById(activeEntryId);
        if (existing) {
          const updated: DiaryEntry = {
            ...existing,
            title: title.trim(),
            content: content,
            tags: tags,
            updatedAt: now.toISOString(),
          };
          persistEntry(updated);
          onEntrySaved?.(updated);
        }
      } else {
        // Autosave active draft
        const draft: DraftState = {
          entryId: null,
          title,
          content,
          tags,
          entryDate,
          updatedAt: now.toISOString(),
        };
        saveActiveDraft(draft);
      }

      setLastSavedTime(timeStr);
      setSaveStatus("saved");
    }, 700);

    return () => clearTimeout(timeout);
  }, [title, content, tags, activeEntryId, entryDate, onEntrySaved]);

  const handleFinishEntry = () => {
    if (!content.trim() && !title.trim()) return;

    const nowISO = new Date().toISOString();

    if (activeEntryId) {
      // Update existing entry
      const existing = getEntryById(activeEntryId);
      const updated: DiaryEntry = {
        id: activeEntryId,
        title: title.trim(),
        content: content.trim(),
        tags: tags,
        createdAt: originalCreatedAt || existing?.createdAt || nowISO,
        updatedAt: nowISO,
        entryDate: entryDate || getLocalCalendarDate(),
        attachments: existing?.attachments || [],
      };
      persistEntry(updated);
      onEntrySaved?.(updated);
      setSaveStatus("saved");
    } else {
      // Create new permanent entry
      const newEntry: DiaryEntry = {
        id: generateId(),
        title: title.trim(),
        content: content.trim(),
        tags: tags,
        createdAt: nowISO,
        updatedAt: nowISO,
        entryDate: entryDate || getLocalCalendarDate(),
        attachments: [],
      };

      persistEntry(newEntry);
      clearActiveDraft();
      setTitle("");
      setContent("");
      setTags([]);
      setSaveStatus("idle");
      onEntrySaved?.(newEntry);
    }
  };

  const handleDiscardOrClear = () => {
    if (!content && !title && tags.length === 0) return;
    const confirmClear = window.confirm("Clear this writing canvas? Unsaved draft words will be removed.");
    if (confirmClear) {
      setTitle("");
      setContent("");
      setTags([]);
      if (!activeEntryId) {
        clearActiveDraft();
      }
      setSaveStatus("idle");
      setLastSavedTime(null);
    }
  };

  const handleDeleteEntry = () => {
    if (!activeEntryId) return;
    removeEntry(activeEntryId);
    onEntryDeleted?.(activeEntryId);
    setShowDeleteConfirm(false);
  };

  const isEditingExisting = Boolean(activeEntryId);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col">
      {/* Editorial Header */}
      <header className="mb-8 sm:mb-12">
        {/* Navigation context / Mode banner if editing a past entry or writing for custom date */}
        {isEditingExisting ? (
          <div className="flex items-center justify-between gap-4 mb-4 p-3 bg-[#2B2226]/80 border border-[#D78A70]/30 rounded-sm text-xs font-sans">
            <div className="flex items-center gap-2 text-[#D78A70]">
              <PenLine className="w-3.5 h-3.5" />
              <span className="font-medium">
                Editing recorded entry &middot; {dateDisplay.fullString}
              </span>
            </div>
            <button
              type="button"
              onClick={onStartNewDraft}
              className="inline-flex items-center gap-1.5 text-[#F0E8DF] hover:text-[#D78A70] transition-colors py-0.5 px-2 rounded hover:bg-[#342A2F]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to tonight&apos;s blank page</span>
            </button>
          </div>
        ) : customDate && customDate !== getLocalCalendarDate() ? (
          <div className="flex items-center justify-between gap-4 mb-4 p-3 bg-[#2B2226]/80 border border-[#45373C] rounded-sm text-xs font-sans">
            <span className="text-[#A89A98]">
              Recording a memory for <strong className="text-[#F0E8DF]">{dateDisplay.fullString}</strong>
            </span>
            <button
              type="button"
              onClick={onStartNewDraft}
              className="text-xs text-[#D78A70] hover:underline"
            >
              Reset to tonight
            </button>
          </div>
        ) : null}

        {/* Date and late-night tag */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 mb-4 border-b border-[#45373C]/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70]/80" />
            <time className="font-serif italic text-lg sm:text-xl text-[#D78A70] tracking-wide">
              {dateDisplay.fullString || "Tonight"}
              {dateDisplay.year ? `, ${dateDisplay.year}` : ""}
            </time>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#A89A98]/70 font-sans">
            <Clock className="w-3.5 h-3.5 text-[#A89A98]/50" />
            <span>{dateDisplay.nightWhisper}</span>
          </div>
        </div>

        {/* Welcome message */}
        <p className="font-sans text-xs sm:text-[13px] tracking-[0.16em] uppercase text-[#A89A98] mb-2 font-medium">
          {isEditingExisting ? "Revisiting earlier thoughts." : "You're here."}
        </p>

        {/* Primary headline */}
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#F0E8DF] tracking-[-0.01em] leading-[1.18] sm:leading-[1.15]">
          {isEditingExisting ? "Revise this reflection" : "What's on your mind tonight?"}
        </h2>

        {/* Supporting text */}
        <p className="mt-3 font-sans text-sm sm:text-base text-[#A89A98] font-normal leading-relaxed max-w-xl">
          {isEditingExisting
            ? "Amend your memory, add missing thoughts, or let it stand."
            : "No need to make sense of it. Just begin."}
        </p>
      </header>

      {/* Writing Canvas Container */}
      <section
        aria-label="Writing Canvas"
        className="relative flex flex-col transition-all"
      >
        {/* Optional Title Field */}
        <div className="mb-3">
          <label htmlFor={titleInputId} className="sr-only">
            Entry title (optional)
          </label>
          <input
            id={titleInputId}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this a name, if you want..."
            className="w-full bg-transparent font-serif text-xl sm:text-2xl text-[#F0E8DF] placeholder-[#A89A98]/35 border-0 border-b border-transparent focus:border-[#45373C] hover:border-[#45373C]/40 pb-2 px-0 transition-colors focus-visible:outline-none focus-visible:ring-0"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* Quiet Tag Editor (Directly integrated, non-intrusive) */}
        <div className="mb-4 pt-1">
          <TagEditor tags={tags} onChange={setTags} />
        </div>

        {/* The Writing Area */}
        <div className="relative">
          <label htmlFor={textareaInputId} className="sr-only">
            Diary entry content
          </label>
          <textarea
            id={textareaInputId}
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start anywhere..."
            className="w-full min-h-[300px] sm:min-h-[360px] bg-transparent text-[#F0E8DF] placeholder-[#A89A98]/30 font-writing text-lg sm:text-[20px] leading-[1.85] p-0 border-0 focus-visible:outline-none focus-visible:ring-0 selection:bg-[#D78A70]/30 tracking-wide"
            rows={10}
            spellCheck="true"
          />
        </div>

        {/* Subtle dividers & Honest Save Status Area */}
        <footer className="mt-8 pt-5 border-t border-[#45373C]/50 flex flex-wrap items-center justify-between gap-4 text-xs font-sans text-[#A89A98]">
          {/* Left: Save status */}
          <div className="flex items-center gap-2.5">
            {saveStatus === "saving" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70] animate-pulse" />
                <span className="text-[#A89A98]">Saving quietly...</span>
              </>
            )}

            {saveStatus === "saved" && (
              <>
                <Check className="w-3.5 h-3.5 text-[#D78A70]" />
                <span className="text-[#A89A98]">
                  Saved quietly{lastSavedTime ? ` at ${lastSavedTime}` : ""}
                </span>
              </>
            )}

            {saveStatus === "idle" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#45373C]" />
                <span className="text-[#A89A98]/60">
                  {content || title || tags.length > 0
                    ? isEditingExisting
                      ? "All changes preserved"
                      : "Draft kept on this device"
                    : "Ready whenever you are"}
                </span>
              </>
            )}
          </div>

          {/* Right: Word count, Read time, Actions */}
          <div className="flex items-center gap-4 sm:gap-6">
            {words > 0 && (
              <span className="text-[#A89A98]/70 font-mono text-[11px]">
                {words} {words === 1 ? "word" : "words"} &middot; {readTime} min read
              </span>
            )}

            {/* Editing existing entry: Delete button with inline confirmation */}
            {isEditingExisting && (
              <div className="relative">
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2 bg-[#2B2226] border border-red-900/50 px-2.5 py-1 rounded">
                    <span className="text-[11px] text-red-300">Release this entry?</span>
                    <button
                      type="button"
                      onClick={handleDeleteEntry}
                      className="text-xs text-red-400 hover:text-red-300 font-medium px-1.5 py-0.5 rounded hover:bg-red-950/50"
                    >
                      Delete
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
                    className="text-[#A89A98]/60 hover:text-red-400 transition-colors p-1 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] rounded text-[11px]"
                    title="Delete this entry"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            )}

            {/* Clear draft (for unsaved new draft) */}
            {!isEditingExisting && (content || title || tags.length > 0) && (
              <button
                type="button"
                onClick={handleDiscardOrClear}
                className="text-[#A89A98]/60 hover:text-[#F0E8DF] transition-colors p-1 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] rounded text-[11px]"
                title="Clear canvas"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            {/* Finish & Rest action */}
            {(content || title || tags.length > 0) && (
              <button
                type="button"
                onClick={handleFinishEntry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2B2226] hover:bg-[#342A2F] border border-[#45373C] text-[#F0E8DF] rounded text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
                title={isEditingExisting ? "Save and keep this version" : "Finish tonight's entry"}
              >
                <Sparkles className="w-3 h-3 text-[#D78A70]" />
                <span>{isEditingExisting ? "Preserve changes" : "Rest tonight"}</span>
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
