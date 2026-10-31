"use client";

import React, { useState } from "react";
import { NavView } from "@/types/entry";
import {
  Feather,
  BookOpen,
  Calendar,
  Archive,
  Mail,
  Sparkles,
  Orbit,
  Eye,
  EyeOff,
  Menu,
  X,
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

  const navItems: { id: NavView; label: string; icon: React.ReactNode }[] = [
    { id: "tonight", label: "Tonight", icon: <Feather className="w-3.5 h-3.5" /> },
    { id: "archive", label: "Memories", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "calendar", label: "Calendar", icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: "capsules", label: "Capsules", icon: <Archive className="w-3.5 h-3.5" /> },
    { id: "letters", label: "Letters", icon: <Mail className="w-3.5 h-3.5" /> },
    { id: "reflection", label: "Reflection", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: "universe", label: "Universe", icon: <Orbit className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {/* Floating Smoked Glass Nav Dock */}
      <header
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-40 transition-all duration-700 w-[calc(100%-2.5rem)] max-w-4xl ${
          focusMode ? "opacity-0 -translate-y-8 pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <nav
          aria-label="Sanctuary Navigation"
          className="relative flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#141215]/85 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.5)] select-none"
        >
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={() => onSelectView("tonight")}
            className="flex items-center gap-2.5 text-left group pr-4 border-r border-white/10 transition-opacity hover:opacity-90"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C87A64] group-hover:scale-125 transition-transform" />
            <span className="font-serif text-[13px] tracking-[0.16em] uppercase text-[#F7F4EF] font-light leading-none">
              AFTERTHOUGHT
            </span>
          </button>

          {/* Center Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-sans tracking-wide transition-all duration-300 ${
                    active
                      ? "text-[#F7F4EF] bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] font-medium"
                      : "text-[#9C9289] hover:text-[#F7F4EF] hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`transition-colors ${
                      active ? "text-[#C87A64]" : "text-[#9C9289]/60"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-[2px] bg-[#C87A64] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Tools: Ambient Audio, Focus Toggle & Account */}
          <div className="flex items-center gap-2 sm:gap-3 pl-3 border-l border-white/10">
            {/* Ambient Soundscape Pill */}
            <div className="hidden sm:block">
              <AmbientSoundPlayer compact />
            </div>

            {/* Focus Mode */}
            <button
              type="button"
              onClick={onToggleFocusMode}
              className="p-1.5 text-[#9C9289] hover:text-[#C87A64] transition-colors rounded-full hover:bg-white/10"
              title={focusMode ? "Exit Focus Mode" : "Focus Mode"}
              aria-label="Toggle focus mode"
            >
              {focusMode ? <EyeOff className="w-3.5 h-3.5 text-[#C87A64]" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* Account / Cloud Status */}
            <button
              type="button"
              onClick={onOpenAccountModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-sans border border-white/10 bg-white/[0.04] hover:border-[#C87A64]/40 text-[#9C9289] hover:text-[#F7F4EF] transition-all shadow-sm"
              title={user ? `Sanctuary: ${user.email}` : "Local Sanctuary"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  user ? "bg-emerald-400" : "bg-[#C87A64]"
                }`}
              />
              <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider">
                {user ? "Cloud" : "Local"}
              </span>
            </button>

            {/* Mobile Menu */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-[#9C9289] hover:text-[#F7F4EF] rounded-full hover:bg-white/10"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile Smoked Glass Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-3 bg-[#141215]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-1 animate-fadeIn">
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
                      ? "text-[#F7F4EF] bg-white/10 font-medium"
                      : "text-[#9C9289] hover:text-[#F7F4EF] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={active ? "text-[#C87A64]" : "text-[#9C9289]"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[#C87A64]" />}
                </button>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}
