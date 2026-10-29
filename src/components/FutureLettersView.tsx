"use client";

import React, { useState, useEffect, useMemo } from "react";
import { FutureLetter, EffectiveLetterStatus } from "@/types/entry";
import {
  getSavedLetters,
  removeLetter,
  openLetter,
  unsealLetterToDraft,
  getEffectiveLetterStatus,
  loadLetterDraft,
} from "@/lib/letters";
import { formatLocalCalendarDate, formatDateTimeFromISO, getLocalCalendarDate } from "@/lib/date";
import { LetterEditor } from "@/components/LetterEditor";
import { LetterReader } from "@/components/LetterReader";
import {
  Mail,
  Lock,
  Sparkles,
  Calendar,
  Clock,
  Trash2,
  PenLine,
  Eye,
  CheckCircle2,
  Unlock,
  AlertTriangle,
} from "lucide-react";

interface FutureLettersViewProps {
  onReturnToTonight: () => void;
}

export function FutureLettersView({ onReturnToTonight }: FutureLettersViewProps) {
  const [letters, setLetters] = useState<FutureLetter[]>([]);
  const [viewState, setViewState] = useState<"overview" | "editor" | "reader">("overview");
  const [selectedLetter, setSelectedLetter] = useState<FutureLetter | null>(null);
  const [editingLetter, setEditingLetter] = useState<FutureLetter | null>(null);
  const [hasDraftInStorage, setHasDraftInStorage] = useState(false);
  const [unsealingId, setUnsealingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load saved letters and check draft on mount
  useEffect(() => {
    const list = getSavedLetters();
    setLetters(list);
    const draft = loadLetterDraft();
    setHasDraftInStorage(Boolean(draft && (draft.title || draft.content)));
  }, []);

  const refreshList = () => {
    const list = getSavedLetters();
    setLetters(list);
    const draft = loadLetterDraft();
    setHasDraftInStorage(Boolean(draft && (draft.title || draft.content)));
  };

  // Group letters dynamically by calculated effective status (Section 7)
  const groupedLetters = useMemo(() => {
    const now = new Date();
    const ready: FutureLetter[] = [];
    const sealed: FutureLetter[] = [];
    const drafts: FutureLetter[] = [];
    const opened: FutureLetter[] = [];

    letters.forEach((letter) => {
      const effective = getEffectiveLetterStatus(letter, now);
      if (effective === "ready") {
        ready.push(letter);
      } else if (effective === "sealed") {
        sealed.push(letter);
      } else if (effective === "opened") {
        opened.push(letter);
      } else if (effective === "draft") {
        drafts.push(letter);
      }
    });

    return { ready, sealed, drafts, opened };
  }, [letters]);

  const handleOpenReadyLetter = (letter: FutureLetter) => {
    const updated = openLetter(letter.id);
    if (updated) {
      refreshList();
      setSelectedLetter(updated);
      setViewState("reader");
    }
  };

  const handleReadOpenedLetter = (letter: FutureLetter) => {
    setSelectedLetter(letter);
    setViewState("reader");
  };

  const handleEditDraft = (letter: FutureLetter) => {
    setEditingLetter(letter);
    setViewState("editor");
  };

  const handleStartNewLetter = () => {
    setEditingLetter(null);
    setViewState("editor");
  };

  const handleLetterSealed = (sealedLetter: FutureLetter) => {
    refreshList();
    setViewState("overview");
  };

  const handleDeleteLetter = (id: string) => {
    removeLetter(id);
    refreshList();
    if (selectedLetter?.id === id) {
      setViewState("overview");
      setSelectedLetter(null);
    }
    setDeletingId(null);
  };

  const handleConfirmUnseal = (id: string) => {
    const unsealed = unsealLetterToDraft(id);
    refreshList();
    setUnsealingId(null);
    if (unsealed) {
      setEditingLetter(unsealed);
      setViewState("editor");
    }
  };

  // Active View Renderers
  if (viewState === "editor") {
    return (
      <LetterEditor
        initialLetter={editingLetter}
        onLetterSealed={handleLetterSealed}
        onCancel={() => {
          refreshList();
          setViewState("overview");
          setEditingLetter(null);
        }}
        onDraftDeleted={() => {
          if (editingLetter) {
            removeLetter(editingLetter.id);
          }
          refreshList();
          setViewState("overview");
          setEditingLetter(null);
        }}
      />
    );
  }

  if (viewState === "reader" && selectedLetter) {
    return (
      <LetterReader
        letter={selectedLetter}
        onBack={() => {
          refreshList();
          setViewState("overview");
          setSelectedLetter(null);
        }}
        onDelete={(id) => {
          handleDeleteLetter(id);
        }}
      />
    );
  }

  const totalLetters = letters.length;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col py-4 sm:py-6">
      {/* Header */}
      <header className="mb-8 pb-6 border-b border-[#45373C]/40">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full border border-[#45373C] bg-[#2B2226] flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#D78A70]" />
            </div>
            <span className="font-sans text-xs tracking-[0.16em] uppercase text-[#A89A98] font-medium">
              Future Letters
            </span>
          </div>

          <button
            type="button"
            onClick={handleStartNewLetter}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-[#D78A70] bg-[#2B2226] hover:bg-[#342A2F] text-[#F0E8DF] text-xs font-sans tracking-wide rounded-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
          >
            <PenLine className="w-3.5 h-3.5 text-[#D78A70]" />
            <span>Write a new letter</span>
          </button>
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl text-[#F0E8DF] font-normal tracking-tight">
          Letters to your future self
        </h2>
        <p className="mt-2 font-sans text-sm text-[#A89A98] leading-relaxed">
          Private notes written for the person you will become. Sealed until their time arrives.
        </p>
      </header>

      {/* Overview Sections or Calm Empty State (Section 10) */}
      {totalLetters === 0 && !hasDraftInStorage ? (
        <div className="border border-[#45373C]/40 bg-[#2B2226]/30 p-8 sm:p-10 rounded-sm text-left space-y-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[#D78A70] font-sans font-medium">
            A Moment in Time
          </div>
          <h3 className="font-serif text-2xl text-[#F0E8DF] font-normal">
            Some things are worth leaving for later.
          </h3>
          <p className="font-sans text-sm text-[#A89A98] leading-relaxed max-w-lg">
            Write a note to the person you&apos;re becoming. A reminder of what matters to you tonight, a wish for next year, or thoughts for a future birthday.
          </p>
          <div className="pt-3">
            <button
              type="button"
              onClick={handleStartNewLetter}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#2B2226] border border-[#D78A70] text-[#F0E8DF] text-xs font-sans rounded-sm hover:bg-[#342A2F] transition-colors"
            >
              <PenLine className="w-3.5 h-3.5 text-[#D78A70]" />
              <span>Write your first letter</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 1. READY TO OPEN (Section 7 & 8) */}
          {groupedLetters.ready.length > 0 && (
            <section aria-label="Ready to Open Letters" className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#D78A70]/40">
                <div className="flex items-center gap-2 text-[#D78A70]">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <h3 className="font-serif text-xl sm:text-2xl text-[#F0E8DF]">
                    Ready to Open ({groupedLetters.ready.length})
                  </h3>
                </div>
                <span className="text-xs text-[#D78A70] font-sans font-medium">
                  The appointed time has arrived
                </span>
              </div>

              <div className="space-y-3">
                {groupedLetters.ready.map((letter) => {
                  const scheduledObj = formatLocalCalendarDate(letter.scheduledOpenAt);
                  const writtenObj = formatDateTimeFromISO(letter.createdAt);

                  return (
                    <div
                      key={letter.id}
                      className="p-5 border border-[#D78A70]/60 bg-[#2B2226]/80 hover:bg-[#2B2226] rounded-sm transition-all space-y-3 shadow-[0_0_15px_rgba(215,138,112,0.08)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A89A98]">
                        <span className="font-sans text-[11px] text-[#A89A98]/70">
                          Written {writtenObj}
                        </span>
                        <span className="text-[#D78A70] font-serif italic text-sm">
                          Opens on {scheduledObj.fullDate}
                        </span>
                      </div>

                      <h4 className="font-serif text-xl text-[#F0E8DF]">
                        {letter.title || "Something you wrote to yourself"}
                      </h4>

                      <p className="font-sans text-xs text-[#A89A98]/80 italic">
                        This letter was sealed until now. Its words are waiting for you.
                      </p>

                      <div className="pt-2 border-t border-[#45373C]/40 flex items-center justify-between text-xs font-sans">
                        <button
                          type="button"
                          onClick={() => handleOpenReadyLetter(letter)}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#D78A70] hover:bg-[#E49A82] text-[#211A1D] font-medium rounded transition-colors"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Open letter now</span>
                        </button>

                        <span className="text-[11px] font-mono text-[#A89A98]/50">
                          Status: Ready
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 2. DRAFTS (Section 5) */}
          {(groupedLetters.drafts.length > 0 || hasDraftInStorage) && (
            <section aria-label="Draft Letters" className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#45373C]/40">
                <h3 className="font-serif text-xl sm:text-2xl text-[#F0E8DF]">
                  Drafts ({groupedLetters.drafts.length + (hasDraftInStorage ? 1 : 0)})
                </h3>
                <span className="text-xs text-[#A89A98] font-sans">Unsealed thoughts</span>
              </div>

              <div className="space-y-3">
                {hasDraftInStorage && (
                  <div className="p-4 border border-[#45373C]/50 bg-[#2B2226]/30 hover:bg-[#2B2226]/60 rounded-sm transition-all flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#D78A70] font-sans">
                        In Progress
                      </span>
                      <h4 className="font-serif text-lg text-[#F0E8DF]">
                        Unsealed letter draft
                      </h4>
                      <p className="text-xs text-[#A89A98] font-sans mt-0.5">
                        Saved in browser. You can continue writing anytime.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingLetter(null);
                        setViewState("editor");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2B2226] border border-[#45373C] text-[#F0E8DF] hover:border-[#D78A70] text-xs font-sans rounded transition-colors"
                    >
                      <PenLine className="w-3.5 h-3.5 text-[#D78A70]" />
                      <span>Resume</span>
                    </button>
                  </div>
                )}

                {groupedLetters.drafts.map((letter) => (
                  <div
                    key={letter.id}
                    className="p-4 border border-[#45373C]/50 bg-[#2B2226]/30 hover:bg-[#2B2226]/60 rounded-sm transition-all flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-serif text-lg text-[#F0E8DF]">
                        {letter.title || "Untitled draft"}
                      </h4>
                      <p className="text-xs text-[#A89A98] font-sans mt-0.5">
                        Target opening: {formatLocalCalendarDate(letter.scheduledOpenAt).fullDate}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEditDraft(letter)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2B2226] border border-[#45373C] text-[#F0E8DF] hover:border-[#D78A70] text-xs font-sans rounded transition-colors"
                    >
                      <PenLine className="w-3.5 h-3.5 text-[#D78A70]" />
                      <span>Edit draft</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. STILL SEALED (Section 6 - BODY STRICTLY HIDDEN) */}
          <section aria-label="Sealed Letters" className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#45373C]/40">
              <h3 className="font-serif text-xl sm:text-2xl text-[#F0E8DF]">
                Still Sealed ({groupedLetters.sealed.length})
              </h3>
              <span className="text-xs text-[#A89A98] font-sans">Awaiting their day</span>
            </div>

            {groupedLetters.sealed.length === 0 ? (
              <p className="text-xs font-sans text-[#A89A98]/60 italic py-2">
                No sealed letters currently waiting.
              </p>
            ) : (
              <div className="space-y-3">
                {groupedLetters.sealed.map((letter) => {
                  const scheduledObj = formatLocalCalendarDate(letter.scheduledOpenAt);
                  const writtenObj = formatDateTimeFromISO(letter.createdAt);
                  const isUnsealing = unsealingId === letter.id;

                  return (
                    <div
                      key={letter.id}
                      className="p-5 border border-[#45373C]/40 bg-[#2B2226]/30 rounded-sm transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#A89A98]">
                        <span className="font-sans text-[11px] text-[#A89A98]/70">
                          Sealed on {writtenObj}
                        </span>

                        <span className="flex items-center gap-1.5 text-xs text-[#D78A70] font-sans">
                          <Lock className="w-3 h-3" />
                          <span>Opens {scheduledObj.fullDate}</span>
                        </span>
                      </div>

                      {/* Title: Metadata ONLY. No body/excerpt displayed! */}
                      <h4 className="font-serif text-xl text-[#F0E8DF]">
                        {letter.title || "Something you wrote to yourself"}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-[#A89A98]/60 font-sans italic">
                        <span>Resting in silence until its scheduled date.</span>
                      </div>

                      {/* Unseal / Cancel Option (Section 9) */}
                      <div className="pt-2 border-t border-[#45373C]/30 flex items-center justify-between text-xs font-sans">
                        {isUnsealing ? (
                          <div className="flex items-center gap-2 bg-[#211A1D] border border-[#D78A70]/50 p-2 rounded w-full">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#D78A70] shrink-0" />
                            <span className="text-[11px] text-[#F0E8DF]">
                              Unseal back to editable draft?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleConfirmUnseal(letter.id)}
                              className="text-xs text-[#D78A70] hover:text-[#FAF6F0] font-medium px-1.5 py-0.5 rounded ml-auto"
                            >
                              Yes, unseal
                            </button>
                            <button
                              type="button"
                              onClick={() => setUnsealingId(null)}
                              className="text-xs text-[#A89A98] hover:text-[#F0E8DF] px-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-[11px] font-mono text-[#A89A98]/40">
                              Status: Sealed
                            </span>

                            <button
                              type="button"
                              onClick={() => setUnsealingId(letter.id)}
                              className="text-[11px] text-[#A89A98]/60 hover:text-[#F0E8DF] transition-colors"
                              title="Unseal letter back to draft"
                            >
                              Unseal early
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 4. PREVIOUSLY OPENED (Section 8 & 9) */}
          {groupedLetters.opened.length > 0 && (
            <section aria-label="Previously Opened Letters" className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#45373C]/40">
                <h3 className="font-serif text-xl sm:text-2xl text-[#F0E8DF]">
                  Previously Opened ({groupedLetters.opened.length})
                </h3>
                <span className="text-xs text-[#A89A98] font-sans">Letters from yesterday</span>
              </div>

              <div className="space-y-3">
                {groupedLetters.opened.map((letter) => {
                  const writtenObj = formatDateTimeFromISO(letter.createdAt);
                  const isDeleting = deletingId === letter.id;

                  return (
                    <div
                      key={letter.id}
                      className="p-5 border border-[#45373C]/40 bg-[#2B2226]/20 hover:bg-[#2B2226]/50 rounded-sm transition-all space-y-2 group"
                    >
                      <div className="flex items-center justify-between text-xs text-[#A89A98]/70 font-sans">
                        <span>Written {writtenObj}</span>
                        <span className="flex items-center gap-1 text-[11px] text-[#D78A70]">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Opened</span>
                        </span>
                      </div>

                      <h4 className="font-serif text-lg sm:text-xl text-[#F0E8DF]">
                        {letter.title || "Untitled letter"}
                      </h4>

                      <div className="pt-2 border-t border-[#45373C]/30 flex items-center justify-between text-xs font-sans">
                        <button
                          type="button"
                          onClick={() => handleReadOpenedLetter(letter)}
                          className="inline-flex items-center gap-1.5 text-[#D78A70] hover:text-[#FAF6F0] font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Read letter again &rarr;</span>
                        </button>

                        <div className="flex items-center gap-3">
                          {isDeleting ? (
                            <div className="flex items-center gap-2 bg-[#211A1D] px-2 py-0.5 border border-red-900/50 rounded">
                              <span className="text-[11px] text-red-300">Delete?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteLetter(letter.id)}
                                className="text-xs text-red-400 font-semibold px-1"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="text-xs text-[#A89A98] px-1"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingId(letter.id)}
                              className="text-[#A89A98]/50 hover:text-red-400 p-1 rounded transition-colors"
                              title="Delete letter"
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}
