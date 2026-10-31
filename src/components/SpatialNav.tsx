"use client";

import React, { useState, useEffect } from "react";
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
  Shield,
  Menu,
  X,
  Cloud,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRepository } from "@/lib/repository/RepositoryContext";
import { AmbientSoundPlayer } from "@/components/AmbientSoundPlayer";
import { getFormattedDate } from "@/lib/date";

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
  const { mode, isOnline, pendingQueueCount } = useRepository();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeInfo, setTimeInfo] = useState<{ timeString: string; nightWhisper: string }>({
    timeString: "",
    nightWhisper: "The last room awake",
  });

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
      {/* Floating Spatial Navigation Dock (Desktop & Tablet) */}
      <header
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-40 transition-all duration-700 max-w-7xl w-[calc(100%-2rem)] md:w-auto ${
          focusMode ? "opacity-0 -translate-y-6 pointer-events-none" : "opacity-100 translate-y-0"
        }`}
      >
        <nav
          aria-label="Main Navigation"
          className="relative flex items-center justify-between gap-3 md:gap-6 px-4 md:px-6 py-2.5 bg-[#1A1517]/80 backdrop-blur-xl border border-[#FAF6F0]/[0.08] rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.45)] select-none"
        >
          {/* Brand Identity / Wordmark */}
          <div
            onClick={() => onSelectView("tonight")}
            className="flex items-center gap-2 cursor-pointer group pr-2 border-r border-[#FAF6F0]/[0.06]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70] group-hover:scale-125 transition-transform" />
            <span className="font-serif text-sm tracking-[0.14em] uppercase text-[#F0E8DF] font-light">
              AFTERTHOUGHT
            </span>
          </div>

          {/* Nav Items (Desktop) */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-sans tracking-wide transition-all duration-200 ${
                    active
                      ? "text-[#FAF6F0] bg-[#FAF6F0]/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "text-[#A89A98] hover:text-[#F0E8DF] hover:bg-[#FAF6F0]/[0.03]"
                  }`}
                >
                  <span className={active ? "text-[#D78A70]" : "text-[#A89A98]/60"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-[2px] bg-[#D78A70] rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Section: Sound, Status, Account & Mobile Menu */}
          <div className="flex items-center gap-2 md:gap-3 pl-2 border-l border-[#FAF6F0]/[0.06]">
            {/* Ambient Audio Pill */}
            <div className="hidden sm:block">
              <AmbientSoundPlayer compact />
            </div>

            {/* Focus Mode Quick Toggle */}
            <button
              type="button"
              onClick={onToggleFocusMode}
              className="p-1.5 text-[#A89A98] hover:text-[#F0E8DF] transition-colors rounded-full hover:bg-[#FAF6F0]/[0.05]"
              title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
              aria-label="Toggle focus mode"
            >
              {focusMode ? <EyeOff className="w-3.5 h-3.5 text-[#D78A70]" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* Account / Cloud Sync Pill */}
            <button
              type="button"
              onClick={onOpenAccountModal}
              className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-sans border border-[#FAF6F0]/[0.08] bg-[#FAF6F0]/[0.03] hover:bg-[#FAF6F0]/[0.07] text-[#A89A98] hover:text-[#F0E8DF] transition-all"
              title={user ? `Signed in as ${user.email}` : "Local Sanctuary"}
            >
              {user ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ) : (
                <Shield className="w-3 h-3 text-[#D78A70]" />
              )}
              <span className="hidden md:inline truncate max-w-[110px]">
                {user ? user.email?.split("@")[0] : "Local"}
              </span>
            </button>

            {/* Mobile Hamburger Trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-[#A89A98] hover:text-[#F0E8DF] transition-colors rounded-full hover:bg-[#FAF6F0]/[0.05]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Spatial Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-[#120F10]/95 backdrop-blur-2xl flex flex-col justify-between p-8 animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-[#FAF6F0]/[0.08]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D78A70]" />
              <span className="font-serif text-lg tracking-[0.14em] uppercase text-[#F0E8DF]">
                AFTERTHOUGHT
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-[#A89A98] hover:text-[#F0E8DF]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav List */}
          <nav className="flex flex-col space-y-3 py-8">
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
                  className={`flex items-center justify-between p-3.5 rounded-lg text-left transition-all ${
                    active
                      ? "bg-[#FAF6F0]/[0.08] text-[#FAF6F0] font-medium pl-5 border-l-2 border-[#D78A70]"
                      : "text-[#A89A98] hover:text-[#FAF6F0] hover:bg-[#FAF6F0]/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className={active ? "text-[#D78A70]" : "text-[#A89A98]"}>
                      {item.icon}
                    </span>
                    <span className="font-serif text-lg tracking-wide">{item.label}</span>
                  </div>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70]" />}
                </button>
              );
            })}
          </nav>

          {/* Footer Controls */}
          <div className="pt-6 border-t border-[#FAF6F0]/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A89A98]">Ambient Sound</span>
              <AmbientSoundPlayer />
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAccountModal?.();
              }}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-[#FAF6F0]/[0.08] bg-[#FAF6F0]/[0.04] text-xs text-[#F0E8DF]"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#D78A70]" />
                <span className="truncate max-w-[200px]">
                  {user ? user.email : "Sanctuary & Cloud Sync"}
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase text-[#D78A70]">
                {mode === "cloud" ? "Cloud" : "Local"}
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
