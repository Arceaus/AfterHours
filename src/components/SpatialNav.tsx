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
  Cloud,
  Check,
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
  const { mode, isOnline } = useRepository();
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
      {/* Floating Minimalist Header (Desktop & Tablet) */}
      <header
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 w-[calc(100%-2.5rem)] max-w-4xl ${
          focusMode ? "opacity-0 -translate-y-8 pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <nav
          aria-label="Main Navigation"
          className="relative flex items-center justify-between px-4 sm:px-5 py-2 bg-[#100E11]/85 backdrop-blur-xl border border-white/[0.07] rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.55)] select-none"
        >
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={() => onSelectView("tonight")}
            className="flex items-center gap-2.5 text-left group pr-3 transition-opacity hover:opacity-90"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D47A60] group-hover:scale-125 transition-transform" />
            <span className="font-serif text-[13px] tracking-[0.16em] uppercase text-[#F3EFEA] font-light">
              AFTERTHOUGHT
            </span>
          </button>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  className={`relative px-3 py-1.5 rounded-full text-xs font-sans tracking-wide transition-all duration-200 ${
                    active
                      ? "text-[#F3EFEA] font-medium bg-white/[0.08]"
                      : "text-[#8E8782] hover:text-[#F3EFEA] hover:bg-white/[0.03]"
                  }`}
                >
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#D47A60] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Tools (Sound, Focus, Account & Mobile Hamburger) */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="hidden sm:block">
              <AmbientSoundPlayer compact />
            </div>

            <button
              type="button"
              onClick={onToggleFocusMode}
              className="p-1.5 text-[#8E8782] hover:text-[#F3EFEA] transition-colors rounded-full hover:bg-white/[0.05]"
              title={focusMode ? "Exit Focus Mode" : "Focus Mode"}
              aria-label="Toggle focus mode"
            >
              {focusMode ? <EyeOff className="w-3.5 h-3.5 text-[#D47A60]" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onOpenAccountModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-sans border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] text-[#8E8782] hover:text-[#F3EFEA] transition-all"
              title={user ? `Signed in as ${user.email}` : "Local Sanctuary"}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  user ? "bg-emerald-400" : "bg-[#8E8782]/60"
                }`}
              />
              <span className="hidden sm:inline">
                {user ? "Cloud" : "Local"}
              </span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-[#8E8782] hover:text-[#F3EFEA] rounded-full hover:bg-white/[0.05]"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-3 bg-[#100E11]/95 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col gap-1 animate-fadeIn">
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
                      ? "text-[#F3EFEA] bg-white/[0.08] font-medium"
                      : "text-[#8E8782] hover:text-[#F3EFEA] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={active ? "text-[#D47A60]" : "text-[#8E8782]"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[#D47A60]" />}
                </button>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}
