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
      el.style.height = `${Math.max(300, el.scrollHeight)}px`;
    }
  }, [content]);

  // Word count calculation
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(words / 180));

  useEffect(() => {
    onWordCountChange?.(words);
  }, [words, onWordCountChange]);

  // Autosave mechanism (with cursor preservation)
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

  // Attachment operations
  const handleUploadAttachment = async (file: File) => {
    const targetEntryId = activeEntryId || "draft_current";
    const uploaded = await saveAttachment(targetEntryId, file);
    setAttachments((prev) => [...prev, uploaded]);
  };

  const handleDeleteAttachment = async (attachment: MemoryAttachment) => {
    await deleteAttachment(attachment.id, attachment.storagePath);
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
  };

  // Column width classes
  const widthClasses: Record<FocusColumnWidth, string> = {
    narrow: "max-w-xl",
    comfortable: "max-w-3xl",
    spacious: "max-w-4xl",
  };

  // Font size classes
  const fontSizeClasses: Record<FocusFontSize, string> = {
    normal: "text-base sm:text-[17px] leading-[1.8]",
    comfortable: "text-lg sm:text-[20px] leading-[1.9]",
    large: "text-xl sm:text-[23px] leading-[2.0]",
  };

  const isEditingExisting = Boolean(activeEntryId);

  return (
    <div className={`w-full mx-auto flex flex-col transition-all duration-300 ${widthClasses[columnWidth]}`}>
      {/* Focus Mode Floating Controls */}
      {focusMode && (
        <div className="sticky top-4 z-40 mb-8 p-2.5 bg-[#2B2226]/90 backdrop-blur-md border border-[#45373C]/80 rounded-full shadow-xl flex items-center justify-between text-xs text-[#A89A98]">
          <div className="flex items-center gap-3 pl-3">
            {/* Ambient sound embedded */}
            <AmbientSoundPlayer compact />

            {/* Font size toggles */}
            <div className="hidden sm:flex items-center gap-1 border-l border-[#45373C]/60 pl-3">
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
                      ? "bg-[#D78A70] text-[#211A1D] font-bold"
                      : "text-[#A89A98] hover:text-[#F0E8DF]"
                  }`}
                  title={`Font size: ${size}`}
                >
                  {size === "normal" ? "A" : size === "comfortable" ? "A+" : "A++"}
                </button>
              ))}
            </div>

            {/* Column width toggles */}
            <div className="hidden md:flex items-center gap-1 border-l border-[#45373C]/60 pl-3">
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
                      ? "bg-[#D78A70] text-[#211A1D] font-bold"
                      : "text-[#A89A98] hover:text-[#F0E8DF]"
                  }`}
                  title={`Canvas width: ${w}`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pr-2">
            {/* Save indicator in focus mode */}
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

            {/* Exit button */}
            {onToggleFocusMode && (
              <button
                type="button"
                onClick={onToggleFocusMode}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#211A1D] hover:bg-[#36292E] border border-[#45373C] text-[#F0E8DF] rounded-full text-xs transition-colors"
                title="Exit Focus Mode (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Focus</span>
                <kbd className="hidden sm:inline text-[9px] font-mono bg-[#2B2226] px-1 py-0.2 rounded border border-[#45373C]">
                  Esc
                </kbd>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Editorial Header */}
      {!focusMode && (
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

            <div className="flex items-center gap-3">
              <AmbientSoundPlayer compact />
              <div className="flex items-center gap-2 text-xs text-[#A89A98]/70 font-sans">
                <Clock className="w-3.5 h-3.5 text-[#A89A98]/50" />
                <span>{dateDisplay.nightWhisper}</span>
              </div>
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
      )}

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

        {/* Quiet Tag Editor */}
        <div className="mb-4 pt-1">
          <TagEditor tags={tags} onChange={setTags} />
        </div>

        {/* The Writing Area with font sizing */}
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
            className={`w-full min-h-[300px] sm:min-h-[360px] bg-transparent text-[#F0E8DF] placeholder-[#A89A98]/30 font-writing p-0 border-0 focus-visible:outline-none focus-visible:ring-0 selection:bg-[#D78A70]/30 tracking-wide ${fontSizeClasses[fontSize]}`}
            rows={10}
            spellCheck="true"
          />
        </div>

        {/* Phase 9: Attachment Tray (Photographs & Visual Echoes) */}
        <AttachmentTray
          attachments={attachments}
          onUpload={handleUploadAttachment}
          onDelete={handleDeleteAttachment}
        />

        {/* Subtle dividers & Honest Save Status Area */}
        <footer className="mt-8 pt-5 border-t border-[#45373C]/50 flex flex-wrap items-center justify-between gap-4 text-xs font-sans text-[#A89A98]">
          {/* Left: Truthful save status */}
          <div className="flex items-center gap-2.5">
            {saveStatus === "saving" && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70] animate-pulse" />
                <span className="text-[#A89A98]">
                  {mode === "cloud"
                    ? isOnline
                      ? "Saving to cloud sanctuary..."
                      : "Preserving locally (Offline)..."
                    : "Saving quietly..."}
                </span>
              </>
            )}

            {saveStatus === "saved" && (
              <>
                <Check className="w-3.5 h-3.5 text-[#D78A70]" />
                <span className="text-[#A89A98]">
                  {mode === "cloud"
                    ? isOnline
                      ? "Saved to cloud"
                      : "Saved locally (Offline — queued for sync)"
                    : "Saved locally"}
                  {lastSavedTime ? ` at ${lastSavedTime}` : ""}
                </span>
              </>
            )}

            {saveStatus === "error" && (
              <div className="flex items-center gap-2 text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
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
                <span className="w-1.5 h-1.5 rounded-full bg-[#45373C]" />
                <span className="text-[#A89A98]/60">
                  {content || title || tags.length > 0
                    ? isEditingExisting
                      ? "All changes preserved"
                      : mode === "cloud"
                      ? isOnline
                        ? "Draft kept locally until saved"
                        : "Draft preserved offline"
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

            {/* Toggle focus mode icon */}
            {onToggleFocusMode && !focusMode && (
              <button
                type="button"
                onClick={onToggleFocusMode}
                className="text-[#A89A98]/60 hover:text-[#F0E8DF] transition-colors p-1 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] rounded text-[11px]"
                title="Enter Focus Mode"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Focus</span>
              </button>
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
