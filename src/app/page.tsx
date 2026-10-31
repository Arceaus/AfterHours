"use client";

import React, { useState, useEffect, useCallback } from "react";
import { NavView, DiaryEntry } from "@/types/entry";
import { NavigationRail } from "@/components/NavigationRail";
import { WritingArea } from "@/components/WritingArea";
import { RecentMemories } from "@/components/RecentMemories";
import { ArchiveView } from "@/components/ArchiveView";
import { CalendarView } from "@/components/CalendarView";
import { TimeCapsulesView } from "@/components/TimeCapsulesView";
import { FutureLettersView } from "@/components/FutureLettersView";
import { ReflectionView } from "@/components/ReflectionView";
import { MemoryUniverseView } from "@/components/MemoryUniverseView";
import { MigrationBanner } from "@/components/MigrationBanner";
import { AccountModal } from "@/components/AccountModal";
import { useRepository } from "@/lib/repository/RepositoryContext";

export default function HomePage() {
  const { entries, deleteEntry, refreshEntries, mode } = useRepository();
  const [currentView, setCurrentView] = useState<NavView>("tonight");
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);
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
    <div className="min-h-screen bg-[#211A1D] text-[#F0E8DF] flex flex-col md:flex-row relative selection:bg-[#D78A70]/30 selection:text-[#FAF6F0]">
      {/* Subtle ambient lighting vignette in the corner - purely soft, no neon */}
      <div
        aria-hidden="true"
        className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-[#2B2226]/40 via-transparent to-transparent pointer-events-none -z-10 blur-3xl opacity-60"
      />

      {/* Navigation Rail */}
      <NavigationRail
        currentView={currentView}
        onSelectView={(v) => {
          setCurrentView(v);
        }}
        focusMode={focusMode}
        onToggleFocusMode={() => setFocusMode(!focusMode)}
        wordCount={wordCount}
        onOpenAccountModal={() => setIsAccountOpen(true)}
      />

      {/* Main Sanctuary Area */}
      <main className="flex-1 min-w-0 flex flex-col px-6 sm:px-10 lg:px-14 py-8 sm:py-12 lg:py-14 max-w-7xl">
        {/* Local Data Migration Banner (if cloud user has local records) */}
        <MigrationBanner />

        {/* Subtle tranquil notification */}
        {notification && (
          <div
            role="status"
            className="mb-8 p-3.5 bg-[#2B2226] border border-[#D78A70]/40 text-[#F0E8DF] text-xs font-sans rounded-sm flex items-center justify-between animate-fadeIn"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70]" />
              <span>{notification}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-[#A89A98] hover:text-[#F0E8DF] text-xs px-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View Switcher */}
        {currentView === "tonight" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Writing Area: Primary column (spacious 8 of 12 cols on desktop) */}
            <div
              className={`transition-all duration-300 ${
                focusMode ? "lg:col-span-12 max-w-4xl mx-auto" : "lg:col-span-8"
              }`}
            >
              <WritingArea
                activeEntryId={activeEntryId}
                customDate={customDate}
                focusMode={focusMode}
                onToggleFocusMode={() => setFocusMode(!focusMode)}
                onWordCountChange={setWordCount}
                onEntrySaved={handleEntrySaved}
                onEntryDeleted={handleEntryDeleted}
                onStartNewDraft={handleStartNewDraft}
              />
            </div>

            {/* Asymmetric Aside: Recent Memories (4 of 12 cols on desktop) */}
            {!focusMode && (
              <div className="lg:col-span-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[#45373C]/40 lg:pl-10">
                <RecentMemories
                  entries={entries}
                  activeEntryId={activeEntryId}
                  onSelectEntry={handleSelectEntry}
                />
              </div>
            )}
          </div>
        )}

        {currentView === "archive" && (
          <ArchiveView
            entries={entries}
            onOpenEntry={handleSelectEntry}
            onDeleteEntry={handleEntryDeleted}
            onReturnToTonight={handleStartNewDraft}
          />
        )}

        {currentView === "calendar" && (
          <CalendarView
            entries={entries}
            onOpenEntry={handleSelectEntry}
            onDeleteEntry={handleEntryDeleted}
            onWriteForDate={handleWriteForDate}
          />
        )}

        {currentView === "capsules" && (
          <TimeCapsulesView
            entries={entries}
            onOpenEntry={handleSelectEntry}
            onReturnToTonight={handleStartNewDraft}
          />
        )}

        {currentView === "letters" && (
          <FutureLettersView
            onReturnToTonight={handleStartNewDraft}
          />
        )}

        {currentView === "reflection" && (
          <ReflectionView
            entries={entries}
            onOpenEntry={handleSelectEntry}
            onReturnToTonight={handleStartNewDraft}
          />
        )}

        {currentView === "universe" && (
          <MemoryUniverseView
            entries={entries}
            onOpenEntry={handleSelectEntry}
            onReturnToTonight={handleStartNewDraft}
          />
        )}
      </main>

      {/* Account & Cloud Sanctuary Modal */}
      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
      />
    </div>
  );
}
