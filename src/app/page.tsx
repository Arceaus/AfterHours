"use client";

import React, { useState, useEffect } from "react";
import { NavView } from "@/types/entry";
import { NavigationRail } from "@/components/NavigationRail";
import { WritingArea } from "@/components/WritingArea";
import { RecentMemories, SavedEntry } from "@/components/RecentMemories";
import { PlaceholderView } from "@/components/PlaceholderView";

export default function HomePage() {
  const [currentView, setCurrentView] = useState<NavView>("tonight");
  const [focusMode, setFocusMode] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Load any previously saved session entries from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("afterthought_entries_v1");
      if (stored) {
        setSavedEntries(JSON.parse(stored));
      }
    } catch {
      // quiet fallback
    }
  }, []);

  const handleEntrySaved = (entry: SavedEntry) => {
    const updated = [entry, ...savedEntries];
    setSavedEntries(updated);
    try {
      localStorage.setItem("afterthought_entries_v1", JSON.stringify(updated));
    } catch {
      // quiet fallback
    }
    setNotification("Tonight's thought has been preserved in your quiet archives.");
    setTimeout(() => {
      setNotification(null);
    }, 4500);
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
      />

      {/* Main Sanctuary Area */}
      <main className="flex-1 min-w-0 flex flex-col px-6 sm:px-10 lg:px-14 py-8 sm:py-12 lg:py-14 max-w-7xl">
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
        {currentView === "tonight" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            {/* Writing Area: Primary column (spacious 8 of 12 cols on desktop) */}
            <div
              className={`transition-all duration-300 ${
                focusMode ? "lg:col-span-12 max-w-3xl mx-auto" : "lg:col-span-8"
              }`}
            >
              <WritingArea
                onWordCountChange={setWordCount}
                onEntrySaved={handleEntrySaved}
              />
            </div>

            {/* Asymmetric Aside: Recent Memories (4 of 12 cols on desktop) */}
            {!focusMode && (
              <div className="lg:col-span-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-[#45373C]/40 lg:pl-10">
                <RecentMemories
                  entries={savedEntries}
                  onSelectEntry={(entry) => {
                    alert(`"${entry.title}" (${entry.date})\n\n${entry.content}`);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <PlaceholderView
            view={currentView}
            onReturnToTonight={() => setCurrentView("tonight")}
          />
        )}
      </main>
    </div>
  );
}
