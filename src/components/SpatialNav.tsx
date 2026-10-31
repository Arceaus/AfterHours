"use client";

import React, { useState } from "react";
import { NavView } from "@/types/entry";
import {
  Eye,
  EyeOff,
  Menu,
  X,
  Volume2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRepository } from "@/lib/repository/RepositoryContext";
import { AmbientSoundPlayer } from "@/components/AmbientSoundPlayer";

interface SpatialNavProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  wordCount: number;
  onOpenAccountModal?: () => void;
}

export function SpatialNav({
  currentView,
  onSelectView,
  focusMode,
  onToggleFocusMode,
  wordCount,
  onOpenAccountModal,
}: SpatialNavProps) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavView; kanji: string; label: string }[] = [
    { id: "tonight", kanji: "夜", label: "Tonight" },
    { id: "archive", kanji: "記", label: "Memories" },
    { id: "calendar", kanji: "暦", label: "Calendar" },
    { id: "capsules", kanji: "筥", label: "Capsules" },
    { id: "letters", kanji: "文", label: "Letters" },
    { id: "reflection", kanji: "省", label: "Reflection" },
    { id: "universe", kanji: "宙", label: "Universe" },
  ];

  return (
    <>
      {/* Floating Neo-Japanese Architectural Dock */}
      <header
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-40 transition-all duration-700 w-[calc(100%-2.5rem)] max-w-4xl ${
          focusMode ? "opacity-0 -translate-y-8 pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <nav
          aria-label="Sanctuary Navigation"
          className="relative flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#0C0B0E]/90 backdrop-blur-2xl border border-[#E28A3B]/20 rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.7)] select-none"
        >
          {/* Brand Identity / Vermilion Seal */}
          <button
            type="button"
            onClick={() => onSelectView("tonight")}
            className="flex items-center gap-2.5 text-left group pr-4 border-r border-white/[0.06] transition-opacity hover:opacity-90"
          >
            {/* Traditional Vermilion Seal Stamp */}
            <span className="w-5 h-5 rounded-sm bg-[#C83E2D]/90 border border-[#C83E2D] flex items-center justify-center text-[10px] font-serif text-[#F4EFEA] font-bold shadow-[0_0_8px_rgba(200,62,45,0.4)]">
              夜
            </span>
            <div className="flex flex-col">
              <span className="font-serif text-[13px] tracking-[0.2em] uppercase text-[#F4EFEA] font-light leading-none">
                AFTERTHOUGHT
              </span>
              <span className="text-[8px] font-mono tracking-widest text-[#8F8782] uppercase mt-0.5">
                SHOU SUGI BAN
              </span>
            </div>
          </button>

          {/* Center Navigation: Kanji + Roman micro-labels */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans tracking-wider transition-all duration-300 ${
                    active
                      ? "text-[#F4EFEA] bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "text-[#8F8782] hover:text-[#F4EFEA] hover:bg-white/[0.03]"
                  }`}
                >
                  <span
                    className={`font-serif text-[11px] transition-colors ${
                      active ? "text-[#E28A3B]" : "text-[#8F8782]/60"
                    }`}
                  >
                    {item.kanji}
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-[2px] bg-[#E28A3B] rounded-full shadow-[0_0_6px_#E28A3B]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Tools: Soundscape, Candle Focus & Cloud Seal */}
          <div className="flex items-center gap-2 sm:gap-3 pl-3 border-l border-white/[0.06]">
            {/* Ambient Soundscape Pill */}
            <div className="hidden sm:block">
              <AmbientSoundPlayer compact />
            </div>

            {/* Focus Mode (Lantern Mode) */}
            <button
              type="button"
              onClick={onToggleFocusMode}
              className="p-1.5 text-[#8F8782] hover:text-[#E28A3B] transition-colors rounded-full hover:bg-white/[0.05]"
              title={focusMode ? "Exit Lantern Mode" : "Lantern Mode (Focus)"}
              aria-label="Toggle lantern focus mode"
            >
              {focusMode ? <EyeOff className="w-3.5 h-3.5 text-[#E28A3B]" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* Sanctuary Status Stamp */}
            <button
              type="button"
              onClick={onOpenAccountModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans border border-white/[0.08] bg-white/[0.03] hover:border-[#E28A3B]/40 text-[#8F8782] hover:text-[#F4EFEA] transition-all"
              title={user ? `Sanctuary: ${user.email}` : "Local Sanctuary"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  user ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-[#E28A3B] shadow-[0_0_6px_#E28A3B]"
                }`}
              />
              <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider">
                {user ? "Cloud" : "Discrete"}
              </span>
            </button>

            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-[#8F8782] hover:text-[#F4EFEA] rounded-full hover:bg-white/[0.05]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile Architectural Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-3 bg-[#0C0B0E]/95 backdrop-blur-2xl border border-[#E28A3B]/20 rounded-2xl shadow-2xl flex flex-col gap-1 animate-fadeIn">
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
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-sans transition-colors ${
                    active
                      ? "text-[#F4EFEA] bg-white/[0.08] font-medium"
                      : "text-[#8F8782] hover:text-[#F4EFEA] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-[#E28A3B]">{item.kanji}</span>
                    <span>{item.label}</span>
                  </div>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[#E28A3B]" />}
                </button>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}
