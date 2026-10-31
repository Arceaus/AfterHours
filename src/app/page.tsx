"use client";

import React, { useState, useCallback } from "react";
import { NavView, DiaryEntry } from "@/types/entry";
import { SpatialNav } from "@/components/SpatialNav";
import { ThoughtWorldCanvas } from "@/components/canvas/ThoughtWorldCanvas";
import { WritingArea } from "@/components/WritingArea";
import { ArchiveView } from "@/components/ArchiveView";
import { CalendarView } from "@/components/CalendarView";
import { TimeCapsulesView } from "@/components/TimeCapsulesView";
import { FutureLettersView } from "@/components/FutureLettersView";
import { ReflectionView } from "@/components/ReflectionView";
import { MemoryUniverseView } from "@/components/MemoryUniverseView";
import { MigrationBanner } from "@/components/MigrationBanner";
import { AccountModal } from "@/components/AccountModal";
import { useRepository } from "@/lib/repository/RepositoryContext";
import { Bookmark, X, PenLine } from "lucide-react";
import { formatLocalCalendarDate, deriveDisplayTitle } from "@/lib/date";

export default function HomePage() {
  const { entries, deleteEntry, refreshEntries, mode } = useRepository();
  const [currentView, setCurrentView] = useState<NavView>("tonight");
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [isEchoDrawerOpen, setIsEchoDrawerOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const showNotification = useCallback((message: string) => {
    setNotification(message);
    const timer = setTimeout(() => {
      setNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleEntrySaved = useCallback((entry: DiaryEntry) => {
    refreshEntries();
    showNotification(
      mode === "cloud"
        ? "Thought preserved in your cloud sanctuary."
        : "Thought preserved in your quiet sanctuary."
    );
  }, [mode, refreshEntries, showNotification]);

  const handleEntryDeleted = useCallback(async (id: string) => {
    await deleteEntry(id);
    if (activeEntryId === id) {
      setActiveEntryId(null);
    }
    showNotification("Entry quietly released from your archives.");
  }, [activeEntryId, deleteEntry, showNotification]);

  const handleSelectEntry = (entry: DiaryEntry) => {
    setActiveEntryId(entry.id);
    setCustomDate(null);
    setCurrentView("tonight");
    setIsEchoDrawerOpen(false);
  };

  const handleStartNewDraft = () => {
    setActiveEntryId(null);
    setCustomDate(null);
    setCurrentView("tonight");
  };

  const handleWriteForDate = (dateStr: string) => {
    setActiveEntryId(null);
    setCustomDate(dateStr);
    setCurrentView("tonight");
  };

  return (
    <div className="min-h-screen bg-[#09080A] text-[#F3EFEA] relative selection:bg-[#D47A60]/25 selection:text-[#FDFCF9] overflow-x-hidden font-sans">
      {/* 1. Signature Abstract Celestial Canvas */}
      <ThoughtWorldCanvas isWriting={isWriting || focusMode} />

      {/* 2. Environmental Lighting & Atmosphere Vignette */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 bg-radial-gradient from-transparent via-[#09080A]/40 to-[#09080A]/90"
      />

      {/* 3. Floating Spatial Navigation Dock */}
      <SpatialNav
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode(!focusMode)}
        wordCount={wordCount}
        onOpenAccountModal={() => setIsAccountOpen(true)}
      />

      {/* 4. Main Spatial Canvas */}
      <main className="relative z-10 min-h-screen pt-24 sm:pt-28 pb-16 px-5 sm:px-8 md:px-12 max-w-5xl mx-auto flex flex-col">
        {/* Local Data Migration Banner */}
        <MigrationBanner />

        {/* Quiet Notification Banner */}
        {notification && (
          <div
            role="status"
            className="mb-8 p-3 bg-[#141215]/90 backdrop-blur-md border border-[#D47A60]/30 text-[#F3EFEA] text-xs font-sans rounded-full max-w-md mx-auto flex items-center justify-between shadow-xl animate-fadeIn"
          >
            <div className="flex items-center gap-2 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D47A60]" />
              <span>{notification}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-[#8E8782] hover:text-[#F3EFEA] text-xs px-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Views */}
        {currentView === "tonight" && (
          <div className="w-full flex-1 flex flex-col justify-center animate-fadeIn">
            <WritingArea
              activeEntryId={activeEntryId}
              customDate={customDate}
              focusMode={focusMode}
              onToggleFocusMode={() => setFocusMode(!focusMode)}
              onWordCountChange={setWordCount}
              onWritingStateChange={setIsWriting}
              onEntrySaved={handleEntrySaved}
              onEntryDeleted={handleEntryDeleted}
              onStartNewDraft={handleStartNewDraft}
            />

            {/* Subtle Echoes Floating Pill (Quick glance at recent memories without cluttering canvas) */}
            {!focusMode && entries.length > 0 && (
              <div className="fixed bottom-6 right-6 z-30">
                <button
                  type="button"
                  onClick={() => setIsEchoDrawerOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-[#1A1517]/80 hover:bg-[#2B2226] backdrop-blur-xl border border-[#FAF6F0]/[0.08] hover:border-[#D78A70]/50 rounded-full text-xs text-[#A89A98] hover:text-[#FAF6F0] shadow-lg transition-all"
                  title="Peek at recent thoughts"
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#D78A70]" />
                  <span>Echoes ({Math.min(entries.length, 5)})</span>
                </button>
              </div>
            )}
          </div>
        )}

        {currentView === "archive" && (
          <div className="w-full flex-1 animate-fadeIn">
            <ArchiveView
              entries={entries}
              onOpenEntry={handleSelectEntry}
              onDeleteEntry={handleEntryDeleted}
              onReturnToTonight={handleStartNewDraft}
            />
          </div>
        )}

        {currentView === "calendar" && (
          <div className="w-full flex-1 animate-fadeIn">
            <CalendarView
              entries={entries}
              onOpenEntry={handleSelectEntry}
              onDeleteEntry={handleEntryDeleted}
              onWriteForDate={handleWriteForDate}
            />
          </div>
        )}

        {currentView === "capsules" && (
          <div className="w-full flex-1 animate-fadeIn">
            <TimeCapsulesView
              entries={entries}
              onOpenEntry={handleSelectEntry}
              onReturnToTonight={handleStartNewDraft}
            />
          </div>
        )}

        {currentView === "letters" && (
          <div className="w-full flex-1 animate-fadeIn">
            <FutureLettersView
              onReturnToTonight={handleStartNewDraft}
            />
          </div>
        )}

        {currentView === "reflection" && (
          <div className="w-full flex-1 animate-fadeIn">
            <ReflectionView
              entries={entries}
              onOpenEntry={handleSelectEntry}
              onReturnToTonight={handleStartNewDraft}
            />
          </div>
        )}

        {currentView === "universe" && (
          <div className="w-full flex-1 animate-fadeIn">
            <MemoryUniverseView
              entries={entries}
              onOpenEntry={handleSelectEntry}
              onReturnToTonight={handleStartNewDraft}
            />
          </div>
        )}
      </main>

      {/* Floating Recent Echoes Slide-Over Drawer */}
      {isEchoDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#120F10]/70 backdrop-blur-sm flex justify-end animate-fadeIn"
          onClick={() => setIsEchoDrawerOpen(false)}
        >
          <div
            className="w-full max-w-sm h-full bg-[#181315]/95 border-l border-[#FAF6F0]/[0.08] p-6 flex flex-col justify-between overflow-y-auto shadow-2xl animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#FAF6F0]/[0.08] mb-6">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-[#D78A70]" />
                  <h3 className="font-serif text-lg text-[#FAF6F0]">Recent Echoes</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEchoDrawerOpen(false)}
                  className="p-1 text-[#A89A98] hover:text-[#FAF6F0]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {entries.slice(0, 6).map((entry) => {
                  const dateObj = formatLocalCalendarDate(entry.entryDate);
                  const displayTitle = deriveDisplayTitle(entry.title, entry.content);

                  return (
                    <div
                      key={entry.id}
                      onClick={() => handleSelectEntry(entry)}
                      className="p-3.5 bg-[#FAF6F0]/[0.03] hover:bg-[#FAF6F0]/[0.07] border border-[#FAF6F0]/[0.06] hover:border-[#D78A70]/40 rounded-lg cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#A89A98]/70 mb-1">
                        <span className="font-serif italic text-[#D78A70]">
                          {dateObj.monthDay}, {dateObj.year}
                        </span>
                        <PenLine className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#D78A70]" />
                      </div>
                      <h4 className="font-serif text-sm text-[#F0E8DF] line-clamp-1">
                        {displayTitle}
                      </h4>
                      <p className="font-sans text-xs text-[#A89A98] line-clamp-2 mt-1 leading-relaxed">
                        {entry.content || "(No words recorded)"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-6 border-t border-[#FAF6F0]/[0.08] text-center">
              <button
                type="button"
                onClick={() => {
                  setIsEchoDrawerOpen(false);
                  setCurrentView("archive");
                }}
                className="text-xs text-[#D78A70] hover:underline font-serif italic"
              >
                Browse all {entries.length} memories in the archive &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account & Cloud Sanctuary Modal */}
      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
      />
    </div>
  );
}
