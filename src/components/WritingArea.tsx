"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import {
  DiaryEntry,
  DraftState,
  MemoryAttachment,
  FocusFontSize,
  FocusColumnWidth,
} from "@/types/entry";
import { formatLocalCalendarDate, getFormattedDate, getLocalCalendarDate } from "@/lib/date";
import {
  generateId,
  loadActiveDraft,
  saveActiveDraft,
  clearActiveDraft,
} from "@/lib/storage";
import { useRepository } from "@/lib/repository/RepositoryContext";
import { TagEditor } from "@/components/TagEditor";
import { AttachmentTray } from "@/components/AttachmentTray";
import { AmbientSoundPlayer } from "@/components/AmbientSoundPlayer";
import {
  Check,
  Sparkles,
  RotateCcw,
  Clock,
  Trash2,
  ArrowLeft,
  PenLine,
  AlertCircle,
  Eye,
  EyeOff,
  CloudOff,
  Minimize2,
} from "lucide-react";

interface WritingAreaProps {
  activeEntryId: string | null;
  customDate?: string | null;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  onWordCountChange?: (count: number) => void;
  onEntrySaved?: (entry: DiaryEntry) => void;
  onEntryDeleted?: (id: string) => void;
  onStartNewDraft?: () => void;
  onWritingStateChange?: (isWriting: boolean) => void;
}

export function WritingArea({
  activeEntryId,
  customDate,
  focusMode = false,
  onToggleFocusMode,
  onWordCountChange,
  onEntrySaved,
  onEntryDeleted,
  onStartNewDraft,
  onWritingStateChange,
}: WritingAreaProps) {
  const {
    mode,
    isOnline,
    saveEntry,
    deleteEntry,
    activeEntryRepo,
    listAttachments,
    saveAttachment,
    deleteAttachment,
  } = useRepository();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<MemoryAttachment[]>([]);
  const [entryDate, setEntryDate] = useState<string>(customDate || getLocalCalendarDate());
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Focus mode settings (persisted in localStorage)
  const [fontSize, setFontSize] = useState<FocusFontSize>("comfortable");
  const [columnWidth, setColumnWidth] = useState<FocusColumnWidth>("comfortable");

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

  // Inform parent when writing starts to quiet the 3D environment
  useEffect(() => {
    const isActivelyWriting = isFocused || content.length > 20 || focusMode;
    onWritingStateChange?.(isActivelyWriting);
  }, [isFocused, content.length, focusMode, onWritingStateChange]);

  // Load focus mode preferences
  useEffect(() => {
    try {
      const savedFontSize = localStorage.getItem("afterthought_focus_font_size") as FocusFontSize;
      if (savedFontSize && ["normal", "comfortable", "large"].includes(savedFontSize)) {
        setFontSize(savedFontSize);
      }
      const savedWidth = localStorage.getItem("afterthought_focus_column_width") as FocusColumnWidth;
      if (savedWidth && ["narrow", "comfortable", "spacious"].includes(savedWidth)) {
        setColumnWidth(savedWidth);
      }
    } catch {
      // Storage access error
    }
  }, []);

  // Keyboard shortcut: Esc to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusMode && onToggleFocusMode) {
        onToggleFocusMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusMode, onToggleFocusMode]);

  // Atmospheric date information
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
      activeEntryRepo.getEntry(activeEntryId).then((existing) => {
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
      });

      // Load attachments for this entry
      listAttachments(activeEntryId).then((atts) => {
        setAttachments(atts);
      });
    } else {
      const draft = loadActiveDraft();
      const targetDate = customDate || getLocalCalendarDate();
      setEntryDate(targetDate);
      setOriginalCreatedAt(null);
      setAttachments([]);

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

    const timer = setTimeout(() => {
      isInitialLoad.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, [activeEntryId, customDate, activeEntryRepo, listAttachments]);

  // Auto-resize textarea to fit content comfortably
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.max(340, el.scrollHeight)}px`;
    }
  }, [content]);

  // Word count calculation
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(words / 180));

  useEffect(() => {
    onWordCountChange?.(words);
  }, [words, onWordCountChange]);

  // Autosave mechanism
  useEffect(() => {
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
        const updated: DiaryEntry = {
          id: activeEntryId,
          title: title.trim(),
          content: content,
          tags: tags,
          createdAt: originalCreatedAt || now.toISOString(),
          updatedAt: now.toISOString(),
          entryDate,
          attachments: attachments.map((a) => a.id),
          attachmentItems: attachments,
        };
        saveEntry(updated)
          .then((saved) => {
            onEntrySaved?.(saved);
            setLastSavedTime(timeStr);
            setSaveStatus("saved");
            setErrorMessage(null);
          })
          .catch((err) => {
            console.error("Autosave error:", err);
            setSaveStatus("error");
            setErrorMessage(err?.message || "Save failed");
          });
      } else {
        const draft: DraftState = {
          entryId: null,
          title,
          content,
          tags,
          entryDate,
          updatedAt: now.toISOString(),
        };
        saveActiveDraft(draft);
        setLastSavedTime(timeStr);
        setSaveStatus("saved");
        setErrorMessage(null);
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [title, content, tags, activeEntryId, entryDate, originalCreatedAt, attachments, saveEntry, onEntrySaved]);

  const handleFinishEntry = () => {
    if (!content.trim() && !title.trim()) return;

    const nowISO = new Date().toISOString();

    if (activeEntryId) {
      const updated: DiaryEntry = {
        id: activeEntryId,
        title: title.trim(),
        content: content.trim(),
        tags: tags,
        createdAt: originalCreatedAt || nowISO,
        updatedAt: nowISO,
        entryDate: entryDate || getLocalCalendarDate(),
        attachments: attachments.map((a) => a.id),
        attachmentItems: attachments,
      };
      setSaveStatus("saving");
      saveEntry(updated)
        .then((saved) => {
          onEntrySaved?.(saved);
          setSaveStatus("saved");
          setErrorMessage(null);
        })
        .catch((err) => {
          setSaveStatus("error");
          setErrorMessage(err?.message || "Failed to preserve entry");
        });
    } else {
      const newEntry: DiaryEntry = {
        id: generateId(),
        title: title.trim(),
        content: content.trim(),
        tags: tags,
        createdAt: nowISO,
        updatedAt: nowISO,
        entryDate: entryDate || getLocalCalendarDate(),
        attachments: attachments.map((a) => a.id),
        attachmentItems: attachments,
      };

      setSaveStatus("saving");
      saveEntry(newEntry)
        .then((saved) => {
          clearActiveDraft();
          setTitle("");
          setContent("");
          setTags([]);
          setAttachments([]);
          setSaveStatus("idle");
          setErrorMessage(null);
          onEntrySaved?.(saved);
        })
        .catch((err) => {
          setSaveStatus("error");
          setErrorMessage(err?.message || "Failed to preserve entry");
        });
    }
  };

  const handleDiscardOrClear = () => {
    if (!content && !title && tags.length === 0) return;
    const confirmClear = window.confirm("Clear this writing canvas? Unsaved draft words will be removed.");
    if (confirmClear) {
      setTitle("");
      setContent("");
      setTags([]);
      setAttachments([]);
      if (!activeEntryId) {
        clearActiveDraft();
      }
      setSaveStatus("idle");
      setLastSavedTime(null);
    }
  };

  const handleDeleteEntry = async () => {
    if (!activeEntryId) return;
    try {
      await deleteEntry(activeEntryId);
      onEntryDeleted?.(activeEntryId);
      setShowDeleteConfirm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete entry";
      setErrorMessage(msg);
    }
  };

  const handleUploadAttachment = async (file: File) => {
    const targetEntryId = activeEntryId || "draft_current";
    const uploaded = await saveAttachment(targetEntryId, file);
    setAttachments((prev) => [...prev, uploaded]);
  };

  const handleDeleteAttachment = async (attachment: MemoryAttachment) => {
    await deleteAttachment(attachment.id, attachment.storagePath);
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
  };

  const widthClasses: Record<FocusColumnWidth, string> = {
    narrow: "max-w-2xl",
    comfortable: "max-w-3xl",
    spacious: "max-w-4xl",
  };

  const fontSizeClasses: Record<FocusFontSize, string> = {
    normal: "text-lg sm:text-[19px] leading-[1.85]",
    comfortable: "text-xl sm:text-[22px] leading-[1.95]",
    large: "text-2xl sm:text-[25px] leading-[2.05]",
  };

  const isEditingExisting = Boolean(activeEntryId);

  return (
    <div className={`w-full mx-auto flex flex-col transition-all duration-700 ${widthClasses[columnWidth]}`}>
      {/* Focus Mode Floating Minimalist Toolbar */}
      {focusMode && (
        <div className="sticky top-6 z-40 mb-10 p-2.5 bg-[#171415]/85 backdrop-blur-2xl border border-[#FAF6F0]/[0.08] rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between text-xs text-[#A89A98] animate-fadeIn">
          <div className="flex items-center gap-3 pl-3">
            <AmbientSoundPlayer compact />

            {/* Font size selectors */}
            <div className="hidden sm:flex items-center gap-1 border-l border-[#FAF6F0]/[0.08] pl-3">
              {(["normal", "comfortable", "large"] as FocusFontSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setFontSize(size);
                    localStorage.setItem("afterthought_focus_font_size", size);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    fontSize === size
                      ? "bg-[#D78A70] text-[#120F10] font-bold"
                      : "text-[#A89A98] hover:text-[#F0E8DF]"
                  }`}
                  title={`Font size: ${size}`}
                >
                  {size === "normal" ? "A" : size === "comfortable" ? "A+" : "A++"}
                </button>
              ))}
            </div>

            {/* Canvas width selectors */}
            <div className="hidden md:flex items-center gap-1 border-l border-[#FAF6F0]/[0.08] pl-3">
              {(["narrow", "comfortable", "spacious"] as FocusColumnWidth[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setColumnWidth(w);
                    localStorage.setItem("afterthought_focus_column_width", w);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-sans tracking-wider transition-colors ${
                    columnWidth === w
                      ? "bg-[#D78A70] text-[#120F10] font-bold"
                      : "text-[#A89A98] hover:text-[#F0E8DF]"
                  }`}
                  title={`Width: ${w}`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pr-2">
            <div className="flex items-center gap-1.5 text-[11px]">
              {saveStatus === "saving" && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70] animate-pulse" />
              )}
              {saveStatus === "saved" && (
                <Check className="w-3 h-3 text-[#D78A70]" />
              )}
              {!isOnline && (
                <CloudOff className="w-3 h-3 text-[#D78A70]" />
              )}
            </div>

            {onToggleFocusMode && (
              <button
                type="button"
                onClick={onToggleFocusMode}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#231C1F] hover:bg-[#2C2428] border border-[#FAF6F0]/[0.08] text-[#F0E8DF] rounded-full text-xs transition-colors"
                title="Exit Focus Mode (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Focus</span>
                <kbd className="hidden sm:inline text-[9px] font-mono bg-[#171415] px-1 py-0.5 rounded border border-[#FAF6F0]/[0.08]">
                  Esc
                </kbd>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Atmospheric Editorial Opening (The Signature Tonight Experience) */}
      {!focusMode && (
        <header className="mb-10 sm:mb-12 pt-4 select-none transition-all duration-700">
          {/* Past entry editing mode indicator */}
          {isEditingExisting ? (
            <div className="flex items-center justify-between gap-4 mb-6 p-3 bg-white/[0.03] border border-[#D47A60]/30 rounded-xl text-xs font-sans">
              <div className="flex items-center gap-2 text-[#D47A60]">
                <PenLine className="w-3.5 h-3.5" />
                <span className="font-medium">
                  Revisiting memory from {dateDisplay.fullString}
                </span>
              </div>
              <button
                type="button"
                onClick={onStartNewDraft}
                className="inline-flex items-center gap-1.5 text-[#F3EFEA] hover:text-[#D47A60] transition-colors py-1 px-3 rounded-full bg-white/[0.04]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to blank canvas</span>
              </button>
            </div>
          ) : customDate && customDate !== getLocalCalendarDate() ? (
            <div className="flex items-center justify-between gap-4 mb-6 p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs font-sans">
              <span className="text-[#8E8782]">
                Composing thoughts for <strong className="text-[#F3EFEA]">{dateDisplay.fullString}</strong>
              </span>
              <button
                type="button"
                onClick={onStartNewDraft}
                className="text-xs text-[#D47A60] hover:underline"
              >
                Reset to tonight
              </button>
            </div>
          ) : null}

          {/* Date & Whispering Atmosphere */}
          <div className="flex items-center gap-2.5 text-xs text-[#8E8782] mb-3 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D47A60]" />
            <time className="font-serif italic text-base text-[#D47A60]">
              {dateDisplay.fullString || "Tonight"}
              {dateDisplay.year ? `, ${dateDisplay.year}` : ""}
            </time>
            <span className="text-[#8E8782]/40">&middot;</span>
            <span className="text-[#8E8782]/80 italic font-serif">
              {dateDisplay.nightWhisper}
            </span>
          </div>

          {/* Primary Inspiring Headline */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#F3EFEA] tracking-[-0.015em] leading-[1.18] mb-3">
            {isEditingExisting ? "Revise this reflection" : "What has been living in your mind?"}
          </h1>

          {/* Calming Supporting Whisper */}
          <p className="font-serif italic text-sm sm:text-base text-[#8E8782] font-normal leading-relaxed max-w-xl">
            {isEditingExisting
              ? "Amend your memory, add missing thoughts, or let it stand."
              : "You don\u2019t have to organize your thoughts. Just let them exist."}
          </p>
        </header>
      )}

      {/* Spatial Writing Canvas */}
      <section
        aria-label="Writing Canvas"
        className="relative flex flex-col transition-all duration-500"
      >
        {/* Title Field (Minimal, Borderless Editorial Typography) */}
        <div className="mb-6">
          <label htmlFor={titleInputId} className="sr-only">
            Entry title (optional)
          </label>
          <input
            id={titleInputId}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Give this moment a title, if you wish..."
            className="w-full bg-transparent font-serif italic text-2xl sm:text-3xl text-[#F3EFEA] placeholder-[#8E8782]/30 border-0 border-b border-white/[0.05] focus:border-[#D47A60]/40 pb-3 px-0 transition-colors focus-visible:outline-none focus-visible:ring-0"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* The Writing Area with luxurious paragraph typography */}
        <div className="relative">
          <label htmlFor={textareaInputId} className="sr-only">
            Diary entry content
          </label>
          <textarea
            id={textareaInputId}
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Start anywhere... Let the words arrive on their own."
            className={`w-full min-h-[360px] sm:min-h-[420px] bg-transparent text-[#F3EFEA] placeholder-[#8E8782]/30 font-writing p-0 border-0 focus-visible:outline-none focus-visible:ring-0 selection:bg-[#D47A60]/25 tracking-wide ${fontSizeClasses[fontSize]}`}
            rows={12}
            spellCheck="true"
          />
        </div>

        {/* Quiet Tag Editor (Now below writing area so it never interrupts the flow) */}
        <div className="mt-6 pt-3 border-t border-white/[0.05]">
          <TagEditor tags={tags} onChange={setTags} />
        </div>

        {/* Memory Attachments Tray */}
        <AttachmentTray
          attachments={attachments}
          onUpload={handleUploadAttachment}
          onDelete={handleDeleteAttachment}
        />

        {/* Subtle, Calm Status Bar */}
        <footer className="mt-8 pt-5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs font-sans text-[#8E8782]">
          {/* Truthful Save Status */}
          <div className="flex items-center gap-2.5">
            {saveStatus === "saving" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70] animate-pulse" />
                <span className="text-[#A89A98]">
                  {mode === "cloud"
                    ? isOnline
                      ? "Resting into cloud sanctuary..."
                      : "Preserving locally (Offline)..."
                    : "Preserving quietly..."}
                </span>
              </>
            )}

            {saveStatus === "saved" && (
              <>
                <Check className="w-3.5 h-3.5 text-[#D78A70]" />
                <span className="text-[#A89A98]/80 font-serif italic">
                  {mode === "cloud"
                    ? isOnline
                      ? "Preserved in cloud sanctuary"
                      : "Preserved locally (Offline — queued for sync)"
                    : "Preserved locally"}
                  {lastSavedTime ? ` at ${lastSavedTime}` : ""}
                </span>
              </>
            )}

            {saveStatus === "error" && (
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage || "Save failed"}</span>
                <button
                  type="button"
                  onClick={handleFinishEntry}
                  className="underline hover:text-rose-300 ml-1 text-[11px]"
                >
                  Retry
                </button>
              </div>
            )}

            {saveStatus === "idle" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FAF6F0]/20" />
                <span className="text-[#A89A98]/60 font-serif italic">
                  {content || title || tags.length > 0
                    ? isEditingExisting
                      ? "All words preserved"
                      : "Words resting on this screen"
                    : "The page is quiet and waiting"}
                </span>
              </>
            )}
          </div>

          {/* Right Section: Word Count, Clear, Focus & Finish */}
          <div className="flex items-center gap-4 sm:gap-6">
            {words > 0 && (
              <span className="text-[#A89A98]/60 font-serif italic text-xs">
                {words} {words === 1 ? "word" : "words"} &middot; {readTime} min read
              </span>
            )}

            {onToggleFocusMode && !focusMode && (
              <button
                type="button"
                onClick={onToggleFocusMode}
                className="text-[#A89A98]/70 hover:text-[#FAF6F0] transition-colors p-1 flex items-center gap-1.5 rounded text-xs"
                title="Enter Focus Mode"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Focus</span>
              </button>
            )}

            {isEditingExisting && (
              <div className="relative">
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2 bg-[#2B2226] border border-red-900/50 px-2.5 py-1 rounded-full">
                    <span className="text-[11px] text-red-300">Release entry?</span>
                    <button
                      type="button"
                      onClick={handleDeleteEntry}
                      className="text-xs text-red-400 hover:text-red-300 font-medium px-1.5 py-0.5 rounded"
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
                    className="text-[#A89A98]/60 hover:text-red-400 transition-colors p-1 flex items-center gap-1 rounded text-xs"
                    title="Delete this entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            )}

            {!isEditingExisting && (content || title || tags.length > 0) && (
              <button
                type="button"
                onClick={handleDiscardOrClear}
                className="text-[#A89A98]/60 hover:text-[#FAF6F0] transition-colors p-1 flex items-center gap-1 rounded text-xs"
                title="Clear canvas"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}

            {(content || title || tags.length > 0) && (
              <button
                type="button"
                onClick={handleFinishEntry}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FAF6F0]/[0.08] hover:bg-[#D78A70] hover:text-[#120F10] text-[#FAF6F0] border border-[#FAF6F0]/[0.1] rounded-full text-xs font-sans transition-all duration-300 shadow-sm"
                title={isEditingExisting ? "Preserve changes" : "Rest tonight"}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isEditingExisting ? "Preserve changes" : "Rest tonight"}</span>
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
