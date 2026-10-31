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
          className="relative flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#0E0919]/65 backdrop-blur-3xl border border-white/12 rounded-full shadow-[0_20px_50px_rgba(5,2,15,0.45)] select-none"
        >
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={() => onSelectView("tonight")}
            className="flex items-center gap-2.5 text-left group pr-4 border-r border-white/10 transition-opacity hover:opacity-90"
          >
            <span className="w-2 h-2 rounded-full bg-[#FF9254] shadow-[0_0_10px_#FF9254] group-hover:scale-125 transition-transform" />
            <span className="font-serif text-[14px] tracking-[0.16em] uppercase text-white font-normal leading-none">
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
                      ? "text-white bg-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] font-medium"
                      : "text-[#B3A8C6] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`transition-colors ${
                      active ? "text-[#FF9254]" : "text-[#B3A8C6]/60"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3 h-[2px] bg-[#FF9254] rounded-full shadow-[0_0_8px_#FF9254]" />
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
              className="p-1.5 text-[#B3A8C6] hover:text-[#FF9254] transition-colors rounded-full hover:bg-white/10"
              title={focusMode ? "Exit Focus Mode" : "Focus Mode"}
              aria-label="Toggle focus mode"
            >
              {focusMode ? <EyeOff className="w-3.5 h-3.5 text-[#FF9254]" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* Account / Cloud Status */}
            <button
              type="button"
              onClick={onOpenAccountModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-sans border border-white/10 bg-white/[0.05] hover:border-[#FF9254]/40 text-[#B3A8C6] hover:text-white transition-all shadow-sm"
              title={user ? `Sanctuary: ${user.email}` : "Local Sanctuary"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  user ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-[#FF9254] shadow-[0_0_6px_#FF9254]"
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
              className="md:hidden p-1.5 text-[#B3A8C6] hover:text-white rounded-full hover:bg-white/10"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile Frosted Glass Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-3 bg-[#0E0919]/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl flex flex-col gap-1 animate-fadeIn">
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
                      ? "text-white bg-white/10 font-medium"
                      : "text-[#B3A8C6] hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={active ? "text-[#FF9254]" : "text-[#B3A8C6]"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[#FF9254] shadow-[0_0_6px_#FF9254]" />}
                </button>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}
