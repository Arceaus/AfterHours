"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { getFormattedDate } from "@/lib/date";
import { Check, Sparkles, RotateCcw, Clock } from "lucide-react";

interface WritingAreaProps {
  onWordCountChange?: (count: number) => void;
  onEntrySaved?: (entry: { title: string; content: string; date: string }) => void;
}

export function WritingArea({ onWordCountChange, onEntrySaved }: WritingAreaProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [dateInfo, setDateInfo] = useState({
    fullString: "",
    year: "",
    timeString: "",
    nightWhisper: "The last room awake",
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputId = useId();
  const textareaInputId = useId();

  // Load date client-side to prevent hydration mismatch
  useEffect(() => {
    const d = getFormattedDate();
    setDateInfo({
      fullString: d.fullString,
      year: d.year,
      timeString: d.timeString,
      nightWhisper: d.nightWhisper,
    });
  }, []);

  // Restore draft from localStorage on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("afterthought_draft_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.content) setContent(parsed.content);
        if (parsed.lastSaved) setLastSavedTime(parsed.lastSaved);
      }
    } catch {
      // Quiet fallback if localStorage is disabled
    }
  }, []);

  // Auto-resize textarea to fit writing comfortably
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

  // Debounced quiet auto-save
  useEffect(() => {
    if (!title && !content) {
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("saving");
    const timeout = setTimeout(() => {
      try {
        const now = new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        localStorage.setItem(
          "afterthought_draft_v1",
          JSON.stringify({
            title,
            content,
            lastSaved: now,
            updatedAt: Date.now(),
          })
        );
        setLastSavedTime(now);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("idle");
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [title, content]);

  const handleClearDraft = () => {
    if (!content && !title) return;
    const confirmClear = window.confirm("Begin on a clean page? This draft will be cleared.");
    if (confirmClear) {
      setTitle("");
      setContent("");
      localStorage.removeItem("afterthought_draft_v1");
      setSaveStatus("idle");
      setLastSavedTime(null);
    }
  };

  const handleFinishTonight = () => {
    if (!content.trim()) return;
    const dateFormatted = dateInfo.fullString || "Tonight";
    onEntrySaved?.({
      title: title.trim() || "Untitled reflection",
      content: content.trim(),
      date: `${dateFormatted}, ${dateInfo.year}`,
    });
    // Archive and clear current draft canvas
    setTitle("");
    setContent("");
    localStorage.removeItem("afterthought_draft_v1");
    setSaveStatus("idle");
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col">
      {/* Editorial Header */}
      <header className="mb-10 sm:mb-14">
        {/* Date and late-night tag */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 mb-4 border-b border-[#45373C]/40 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70]/80" />
            <time className="font-serif italic text-lg sm:text-xl text-[#D78A70] tracking-wide">
              {dateInfo.fullString || "Tonight"}
              {dateInfo.year ? `, ${dateInfo.year}` : ""}
            </time>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#A89A98]/70 font-sans">
            <Clock className="w-3.5 h-3.5 text-[#A89A98]/50" />
            <span>{dateInfo.nightWhisper}</span>
          </div>
        </div>

        {/* Welcome message */}
        <p className="font-sans text-xs sm:text-[13px] tracking-[0.16em] uppercase text-[#A89A98] mb-2 font-medium">
          You&apos;re here.
        </p>

        {/* Primary headline */}
        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#F0E8DF] tracking-[-0.01em] leading-[1.18] sm:leading-[1.15]">
          What&apos;s on your mind tonight?
        </h2>

        {/* Supporting text */}
        <p className="mt-3 font-sans text-sm sm:text-base text-[#A89A98] font-normal leading-relaxed max-w-xl">
          No need to make sense of it. Just begin.
        </p>
      </header>

      {/* Writing Canvas Container */}
      <section 
        aria-label="Writing Canvas"
        className="relative flex flex-col transition-all"
      >
        {/* Understated Entry Title Field */}
        <div className="mb-4">
          <label htmlFor={titleInputId} className="sr-only">
            Entry title
          </label>
          <input
            id={titleInputId}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give this thought a title (optional)"
            className="w-full bg-transparent font-serif text-xl sm:text-2xl text-[#F0E8DF] placeholder-[#A89A98]/35 border-0 border-b border-transparent focus:border-[#45373C] hover:border-[#45373C]/40 pb-2.5 px-0 transition-colors focus-visible:outline-none focus-visible:ring-0"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* The Writing Area */}
        <div className="relative">
          <label htmlFor={textareaInputId} className="sr-only">
            Journal entry content
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

        {/* Subtle dividers & Save Status Area */}
        <footer className="mt-8 pt-5 border-t border-[#45373C]/50 flex flex-wrap items-center justify-between gap-4 text-xs font-sans text-[#A89A98]">
          {/* Left: Save status */}
          <div className="flex items-center gap-2.5">
            {saveStatus === "saving" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70] animate-pulse" />
                <span className="text-[#A89A98]">Quietly preserving...</span>
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
                  {content || title ? "Saved locally" : "Ready whenever you are"}
                </span>
              </>
            )}
          </div>

          {/* Right: Word count, Read time, and understated actions */}
          <div className="flex items-center gap-4 sm:gap-6">
            {words > 0 && (
              <span className="text-[#A89A98]/70 font-mono text-[11px]">
                {words} {words === 1 ? "word" : "words"} &middot; {readTime} min read
              </span>
            )}

            {(content || title) && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="text-[#A89A98]/60 hover:text-[#F0E8DF] transition-colors p-1 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] rounded text-[11px]"
                  title="Clear canvas"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinishTonight}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2B2226] hover:bg-[#342A2F] border border-[#45373C] text-[#F0E8DF] rounded text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
                  title="Finish tonight's entry"
                >
                  <Sparkles className="w-3 h-3 text-[#D78A70]" />
                  <span>Rest tonight</span>
                </button>
              </div>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
