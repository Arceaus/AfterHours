"use client";

import React, { useState, useEffect } from "react";
import { NavView } from "@/types/entry";
import { Feather, BookOpen, Calendar, Archive, Moon, Eye, EyeOff } from "lucide-react";
import { getFormattedDate } from "@/lib/date";

interface NavigationRailProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  wordCount: number;
}

export function NavigationRail({
  currentView,
  onSelectView,
  focusMode,
  onToggleFocusMode,
  wordCount,
}: NavigationRailProps) {
  const [timeInfo, setTimeInfo] = useState<{ timeString: string; nightWhisper: string }>({
    timeString: "",
    nightWhisper: "The last room awake",
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const data = getFormattedDate();
      setTimeInfo({
        timeString: data.timeString,
        nightWhisper: data.nightWhisper,
      });
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  const navItems: { id: NavView; label: string; icon: React.ReactNode; hint: string }[] = [
    {
      id: "tonight",
      label: "Tonight",
      icon: <Feather className="w-4 h-4 stroke-[1.5]" />,
      hint: "Your writing canvas",
    },
    {
      id: "archive",
      label: "Past Entries",
      icon: <BookOpen className="w-4 h-4 stroke-[1.5]" />,
      hint: "Whispers of earlier nights",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: <Calendar className="w-4 h-4 stroke-[1.5]" />,
      hint: "The rhythm of your thoughts",
    },
    {
      id: "capsules",
      label: "Time Capsules",
      icon: <Archive className="w-4 h-4 stroke-[1.5]" />,
      hint: "Thoughts sealed for later",
    },
  ];

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-[#45373C]/50 bg-[#211A1D]/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex flex-col">
          <span className="font-serif text-xl tracking-[0.08em] text-[#F0E8DF]">
            AFTERTHOUGHT
          </span>
          <span className="text-[11px] text-[#A89A98]/80 font-sans tracking-wide">
            The last room awake
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleFocusMode}
            className="p-2 text-[#A89A98] hover:text-[#F0E8DF] transition-colors rounded"
            title={focusMode ? "Exit focus mode" : "Enter focus mode"}
            aria-label="Toggle focus mode"
          >
            {focusMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-xs tracking-wider uppercase px-3 py-1.5 border border-[#45373C] text-[#F0E8DF] rounded bg-[#2B2226]"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[69px] z-20 bg-[#211A1D]/98 p-6 flex flex-col justify-between border-t border-[#45373C]/60">
          <nav className="flex flex-col space-y-2">
            {navItems.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between w-full p-3.5 text-left rounded-sm transition-all ${
                    active
                      ? "bg-[#2B2226] text-[#F0E8DF] border-l-2 border-[#D78A70]"
                      : "text-[#A89A98] hover:text-[#F0E8DF] hover:bg-[#2B2226]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={active ? "text-[#D78A70]" : "text-[#A89A98]"}>
                      {item.icon}
                    </span>
                    <span className="font-sans text-sm font-medium tracking-wide">
                      {item.label}
                    </span>
                  </div>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70]" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-[#45373C]/40 space-y-3 text-xs text-[#A89A98]/70">
            <div className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5 text-[#D78A70]/70" />
              <span>{timeInfo.timeString} • {timeInfo.nightWhisper}</span>
            </div>
            <p className="italic text-[11px] leading-relaxed">
              &ldquo;A little corner of the internet that belongs only to you.&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Desktop Navigation Rail */}
      <aside
        className={`hidden md:flex flex-col justify-between w-64 lg:w-72 shrink-0 border-r border-[#45373C]/40 bg-[#211A1D] h-screen sticky top-0 px-7 py-8 transition-opacity duration-300 ${
          focusMode ? "opacity-25 hover:opacity-100" : "opacity-100"
        }`}
      >
        {/* Top: Identity / Wordmark */}
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70]" />
              <h1 className="font-serif text-2xl tracking-[0.06em] text-[#F0E8DF] select-none font-normal">
                AFTERTHOUGHT
              </h1>
            </div>
            <p className="text-[12px] text-[#A89A98] font-sans tracking-wide leading-relaxed pl-4">
              A little corner of the internet that belongs only to you.
            </p>
          </div>

          {/* Navigation Items */}
          <nav aria-label="Main Navigation" className="space-y-1.5 pt-4">
            <div className="px-3 pb-2 text-[10px] font-sans uppercase tracking-[0.15em] text-[#A89A98]/50">
              Spaces
            </div>
            {navItems.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  className={`group w-full flex items-center justify-between px-3.5 py-2.5 rounded text-left transition-all duration-150 ${
                    active
                      ? "bg-[#2B2226] text-[#F0E8DF] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
                      : "text-[#A89A98] hover:text-[#F0E8DF] hover:bg-[#2B2226]/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`transition-colors duration-150 ${
                        active ? "text-[#D78A70]" : "text-[#A89A98]/70 group-hover:text-[#F0E8DF]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="font-sans text-[13px] font-medium tracking-wide">
                      {item.label}
                    </span>
                  </div>

                  {active ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70]" />
                  ) : (
                    <span className="text-[11px] text-[#A89A98]/30 font-serif opacity-0 group-hover:opacity-100 transition-opacity">
                      &rarr;
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Atmospheric quiet details */}
        <div className="space-y-5 pt-6 border-t border-[#45373C]/40">
          {/* Night Time Indicator */}
          <div className="flex items-start gap-2.5 text-xs text-[#A89A98]">
            <Moon className="w-3.5 h-3.5 text-[#D78A70] shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-mono text-[11px] text-[#F0E8DF]/90 tracking-wider">
                {timeInfo.timeString || "00:00"}
              </span>
              <span className="text-[11px] text-[#A89A98]/70 italic font-serif">
                {timeInfo.nightWhisper}
              </span>
            </div>
          </div>

          {/* Focus Mode & Word count */}
          <div className="flex items-center justify-between pt-2 text-xs text-[#A89A98]/80">
            <button
              type="button"
              onClick={onToggleFocusMode}
              className="flex items-center gap-1.5 text-[11px] text-[#A89A98] hover:text-[#F0E8DF] transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] rounded px-1 -mx-1"
            >
              {focusMode ? <EyeOff className="w-3 h-3 text-[#D78A70]" /> : <Eye className="w-3 h-3" />}
              <span>{focusMode ? "Focus on" : "Focus view"}</span>
            </button>

            {wordCount > 0 && (
              <span className="font-mono text-[11px] text-[#A89A98]/60">
                {wordCount} {wordCount === 1 ? "word" : "words"}
              </span>
            )}
          </div>

          {/* Privacy & Sanctuary promise */}
          <div className="pt-2 text-[10px] text-[#A89A98]/40 leading-relaxed font-sans">
            Private sanctuary. Stored solely in this browser.
          </div>
        </div>
      </aside>
    </>
  );
}
