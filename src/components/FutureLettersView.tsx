"use client";

import React, { useState, useEffect, useMemo } from "react";
import { FutureLetter } from "@/types/entry";
import {
  loadLetterDraft,
} from "@/lib/letters";
import { useRepository } from "@/lib/repository/RepositoryContext";
import { formatLocalCalendarDate, formatDateTimeFromISO } from "@/lib/date";
import { LetterEditor } from "@/components/LetterEditor";
import { LetterReader } from "@/components/LetterReader";
import {
  Mail,
  Lock,
  Sparkles,
  Calendar,
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
  const {
    letters,
    openLetter: openLetterRepo,
    unsealLetter: unsealLetterRepo,
    deleteLetter: deleteLetterRepo,
    refreshLetters,
  } = useRepository();
  const [viewState, setViewState] = useState<"overview" | "editor" | "reader">("overview");
  const [selectedLetter, setSelectedLetter] = useState<FutureLetter | null>(null);
  const [editingLetter, setEditingLetter] = useState<FutureLetter | null>(null);
  const [hasDraftInStorage, setHasDraftInStorage] = useState(false);
  const [unsealingId, setUnsealingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const draft = loadLetterDraft();
    setHasDraftInStorage(Boolean(draft && (draft.title || draft.content)));
  }, [letters]);

  const refreshList = () => {
    refreshLetters();
    const draft = loadLetterDraft();
    setHasDraftInStorage(Boolean(draft && (draft.title || draft.content)));
  };

  const groupedLetters = useMemo(() => {
    const now = new Date();
    const ready: FutureLetter[] = [];
    const sealed: FutureLetter[] = [];
    const drafts: FutureLetter[] = [];
    const opened: FutureLetter[] = [];

    letters.forEach((letter) => {
      if (letter.status === "opened") {
        opened.push(letter);
      } else if (letter.status === "draft") {
        drafts.push(letter);
      } else {
        const deliverDate = new Date(letter.scheduledOpenAt + "T00:00:00");
        if (now >= deliverDate) {
          ready.push(letter);
        } else {
          sealed.push(letter);
        }
      }
    });

    ready.sort((a, b) => a.scheduledOpenAt.localeCompare(b.scheduledOpenAt));
    sealed.sort((a, b) => a.scheduledOpenAt.localeCompare(b.scheduledOpenAt));
    opened.sort((a, b) => (b.openedAt || b.updatedAt).localeCompare(a.openedAt || a.updatedAt));

    return { ready, sealed, drafts, opened };
  }, [letters]);

  const handleStartNewLetter = () => {
    setEditingLetter(null);
    setViewState("editor");
  };

  const handleEditDraft = (letter: FutureLetter) => {
    setEditingLetter(letter);
    setViewState("editor");
  };

  const handleOpenReadyLetter = async (letter: FutureLetter) => {
    await openLetterRepo(letter.id);
    refreshList();
    setSelectedLetter(letter);
    setViewState("reader");
  };

  const handleReadOpenedLetter = (letter: FutureLetter) => {
    setSelectedLetter(letter);
    setViewState("reader");
  };

  const handleConfirmUnseal = async (letterId: string) => {
    await unsealLetterRepo(letterId);
    setUnsealingId(null);
    refreshList();
  };

  const handleDeleteLetter = async (letterId: string) => {
    await deleteLetterRepo(letterId);
    setDeletingId(null);
    refreshList();
  };

  if (viewState === "editor") {
    return (
      <LetterEditor
        initialLetter={editingLetter}
        onLetterSealed={() => {
          refreshList();
          setViewState("overview");
          setEditingLetter(null);
        }}
        onCancel={() => {
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
    <div className="w-full max-w-4xl mx-auto space-y-12 py-4 select-none">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#FFFFFF]/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-[0.2em] text-[#FF9254] font-sans">
            <Mail className="w-3.5 h-3.5" />
            <span>Epistolary Time Capsule</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#FFFFFF] font-light">
            Letters Waiting in Time
          </h1>
          <p className="font-serif italic text-base text-[#B3A8C6] mt-1 max-w-lg">
            Private notes sent forward across the months or years to meet the person you will become.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartNewLetter}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFFFFF]/[0.08] hover:bg-[#FF9254] hover:text-[#08060F] text-[#FFFFFF] border border-[#FFFFFF]/[0.08] rounded-full text-xs font-sans tracking-wide transition-all shadow-lg"
        >
          <PenLine className="w-3.5 h-3.5 text-[#FF9254] group-hover:text-[#08060F]" />
          <span>Write to your future self</span>
        </button>
      </header>

      {/* Overview Sections */}
      {totalLetters === 0 && !hasDraftInStorage ? (
        <div className="p-12 sm:p-16 border border-[#FFFFFF]/[0.08] bg-[#0E0919]/40 backdrop-blur-xl rounded-3xl text-center space-y-4">
          <p className="font-serif italic text-2xl text-[#FFFFFF]">
            No letters are currently sealed.
          </p>
          <p className="text-sm text-[#B3A8C6] max-w-md mx-auto leading-relaxed">
            Write a message to yourself for next year, a milestone birthday, or a future season. Sealed in silence until its date arrives.
          </p>
          <div className="pt-4">
            <button
              type="button"
              onClick={handleStartNewLetter}
              className="px-6 py-2.5 bg-[#FFFFFF]/[0.08] hover:bg-[#FF9254] hover:text-[#08060F] text-[#FFFFFF] rounded-full text-xs font-sans transition-all"
            >
              Compose your first letter
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Ready to Open */}
          {groupedLetters.ready.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#FF9254] font-sans">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Ready to Open ({groupedLetters.ready.length})</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {groupedLetters.ready.map((letter) => {
                  const scheduledObj = formatLocalCalendarDate(letter.scheduledOpenAt);
                  const writtenObj = formatDateTimeFromISO(letter.createdAt);

                  return (
                    <div
                      key={letter.id}
                      className="p-6 bg-[#0E0919]/70 backdrop-blur-xl border border-[#FF9254]/60 rounded-2xl shadow-[0_10px_35px_rgba(215,138,112,0.12)] space-y-3"
                    >
                      <div className="flex items-baseline justify-between text-xs text-[#B3A8C6]">
                        <span>Written {writtenObj}</span>
                        <span className="font-serif italic text-[#FF9254] text-sm">
                          Opens on {scheduledObj.fullDate}
                        </span>
                      </div>

                      <h3 className="font-serif text-2xl text-[#FFFFFF]">
                        {letter.title || "Something you wrote to yourself"}
                      </h3>

                      <p className="font-serif italic text-sm text-[#B3A8C6]">
                        The appointed date has arrived. Its words are waiting for you.
                      </p>

                      <div className="pt-3 border-t border-[#FFFFFF]/[0.08] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleOpenReadyLetter(letter)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF9254] hover:bg-[#E49A82] text-[#08060F] font-medium rounded-full text-xs transition-colors"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unseal and read letter</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Drafts */}
          {(groupedLetters.drafts.length > 0 || hasDraftInStorage) && (
            <section className="space-y-4">
              <h2 className="text-xs uppercase tracking-[0.16em] text-[#B3A8C6] font-sans">
                Unsealed Drafts ({groupedLetters.drafts.length + (hasDraftInStorage ? 1 : 0)})
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {hasDraftInStorage && (
                  <div className="p-5 bg-[#0E0919]/40 border border-[#FFFFFF]/[0.06] rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#FF9254] font-mono">
                        Draft in progress
                      </span>
                      <h3 className="font-serif text-lg text-[#FFFFFF]">
                        Unsealed letter draft
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingLetter(null);
                        setViewState("editor");
                      }}
                      className="px-4 py-1.5 bg-[#FFFFFF]/[0.06] hover:bg-[#FFFFFF]/[0.1] text-xs font-sans text-[#FFFFFF] rounded-full transition-colors"
                    >
                      Resume
                    </button>
                  </div>
                )}

                {groupedLetters.drafts.map((letter) => (
                  <div
                    key={letter.id}
                    className="p-5 bg-[#0E0919]/40 border border-[#FFFFFF]/[0.06] rounded-xl flex items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-serif text-lg text-[#FFFFFF]">
                        {letter.title || "Untitled draft"}
                      </h3>
                      <p className="text-xs text-[#B3A8C6] font-mono mt-0.5">
                        Target opening: {formatLocalCalendarDate(letter.scheduledOpenAt).fullDate}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEditDraft(letter)}
                      className="px-4 py-1.5 bg-[#FFFFFF]/[0.06] hover:bg-[#FFFFFF]/[0.1] text-xs font-sans text-[#FFFFFF] rounded-full transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Still Sealed Letters */}
          <section className="space-y-4">
            <h2 className="text-xs uppercase tracking-[0.16em] text-[#B3A8C6] font-sans">
              Currently Sealed ({groupedLetters.sealed.length})
            </h2>

            {groupedLetters.sealed.length === 0 ? (
              <p className="text-xs text-[#B3A8C6]/60 font-serif italic py-2">
                No sealed letters waiting in time.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groupedLetters.sealed.map((letter) => {
                  const scheduledObj = formatLocalCalendarDate(letter.scheduledOpenAt);
                  const writtenObj = formatDateTimeFromISO(letter.createdAt);
                  const isUnsealing = unsealingId === letter.id;

                  return (
                    <div
                      key={letter.id}
                      className="p-6 bg-[#0E0919]/40 backdrop-blur-xl border border-[#FFFFFF]/[0.07] rounded-2xl flex flex-col justify-between space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
                    >
                      <div className="flex items-center justify-between text-xs text-[#B3A8C6]">
                        <span className="font-sans text-[11px] text-[#B3A8C6]/60">
                          Sealed on {writtenObj}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-[#FF9254] font-sans">
                          <Lock className="w-3.5 h-3.5" />
                          <span>{scheduledObj.monthDay}, {scheduledObj.year}</span>
                        </span>
                      </div>

                      <h3 className="font-serif text-xl text-[#FFFFFF] line-clamp-1">
                        {letter.title || "Something you wrote to yourself"}
                      </h3>

                      <p className="font-serif italic text-xs text-[#B3A8C6]/70">
                        Resting in silence until its appointed date.
                      </p>

                      <div className="pt-3 border-t border-[#FFFFFF]/[0.06] flex items-center justify-between text-xs font-sans">
                        {isUnsealing ? (
                          <div className="flex items-center gap-2 bg-[#08060F] border border-[#FF9254]/40 p-2 rounded-lg w-full">
                            <span className="text-[11px] text-[#FFFFFF]">Unseal to draft?</span>
                            <button
                              type="button"
                              onClick={() => handleConfirmUnseal(letter.id)}
                              className="text-xs text-[#FF9254] font-bold ml-auto"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setUnsealingId(null)}
                              className="text-xs text-[#B3A8C6]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-[11px] font-mono text-[#B3A8C6]/40">
                              Sealed
                            </span>
                            <button
                              type="button"
                              onClick={() => setUnsealingId(letter.id)}
                              className="text-[11px] text-[#B3A8C6]/60 hover:text-[#FFFFFF] transition-colors"
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

          {/* Previously Opened */}
          {groupedLetters.opened.length > 0 && (
            <section className="space-y-4 pt-4 border-t border-[#FFFFFF]/[0.08]">
              <h2 className="text-xs uppercase tracking-[0.16em] text-[#B3A8C6] font-sans">
                Previously Opened ({groupedLetters.opened.length})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groupedLetters.opened.map((letter) => {
                  const writtenObj = formatDateTimeFromISO(letter.createdAt);
                  const isDeleting = deletingId === letter.id;

                  return (
                    <div
                      key={letter.id}
                      className="p-5 bg-[#0E0919]/30 border border-[#FFFFFF]/[0.06] rounded-xl flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs text-[#B3A8C6]">
                        <span>Written {writtenObj}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9254]" />
                      </div>

                      <h3 className="font-serif text-lg text-[#FFFFFF] line-clamp-1">
                        {letter.title || "Untitled letter"}
                      </h3>

                      <div className="pt-2 border-t border-[#FFFFFF]/[0.06] flex items-center justify-between text-xs font-sans">
                        <button
                          type="button"
                          onClick={() => handleReadOpenedLetter(letter)}
                          className="inline-flex items-center gap-1.5 text-[#FF9254] hover:text-[#FFFFFF] font-serif italic"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Read letter again &rarr;</span>
                        </button>

                        <div>
                          {isDeleting ? (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <button
                                type="button"
                                onClick={() => handleDeleteLetter(letter.id)}
                                className="text-red-400 font-bold"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="text-[#B3A8C6]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingId(letter.id)}
                              className="text-[#B3A8C6]/40 hover:text-red-400 p-1"
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
