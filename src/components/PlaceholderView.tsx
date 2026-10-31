"use client";

import React from "react";
import { NavView } from "@/types/entry";
import { BookOpen, Calendar, Archive, Mail, Feather, Orbit } from "lucide-react";

interface PlaceholderViewProps {
  view: NavView;
  onReturnToTonight: () => void;
}

export function PlaceholderView({ view, onReturnToTonight }: PlaceholderViewProps) {
  const contentMap: Partial<
    Record<
      NavView,
      {
        title: string;
        subtitle: string;
        description: string;
        icon: React.ReactNode;
        whisper: string;
      }
    >
  > = {
    archive: {
      title: "Past Entries",
      subtitle: "The quiet archives of yesterday",
      description:
        "Every evening you write becomes part of your private historical record. As nights pass, your reflections will gather here chronologically, preserved in their original clarity.",
      icon: <BookOpen className="w-6 h-6 text-[#D78A70]" />,
      whisper: "Words you whispered to yourself, kept safe from time.",
    },
    calendar: {
      title: "Calendar",
      subtitle: "The rhythm of your nocturnal thoughts",
      description:
        "A lunar and nocturnal calendar view mapping the evenings you spent writing. Observe the seasons of your mind without metrics, streaks, or judgment.",
      icon: <Calendar className="w-6 h-6 text-[#D78A70]" />,
      whisper: "Not a productivity streak. Just a trail of quiet presence.",
    },
    capsules: {
      title: "Time Capsules",
      subtitle: "Talk to your past self",
      description:
        "Thoughts, letters, and questions that allow you to search and rediscover what you once wrote in your own words.",
      icon: <Archive className="w-6 h-6 text-[#D78A70]" />,
      whisper: "Locked in silence until the appointed night arrives.",
    },
    letters: {
      title: "Future Letters",
      subtitle: "Letters to your future self",
      description:
        "Write private notes to the person you are becoming. Seal them today and revisit them when their appointed opening date arrives.",
      icon: <Mail className="w-6 h-6 text-[#D78A70]" />,
      whisper: "Some things are worth leaving for later.",
    },
    reflection: {
      title: "Reflection Center",
      subtitle: "Look back to see things differently",
      description:
        "Understand recurring themes, explore changing perspectives over time, and revisit your personal history using your actual diary entries.",
      icon: <BookOpen className="w-6 h-6 text-[#D78A70]" />,
      whisper: "Sometimes, looking back helps you see things differently.",
    },
    universe: {
      title: "Memory Universe",
      subtitle: "Your memories, connected",
      description:
        "Explore the people, places, ideas, and moments that appear throughout your writing.",
      icon: <Orbit className="w-6 h-6 text-[#D78A70]" />,
      whisper: "Every memory is a part of a bigger story.",
    },
  };

  const current = contentMap[view] || contentMap.letters!;

  return (
    <div className="w-full max-w-2xl mx-auto py-12 sm:py-20 flex flex-col items-start">
      <div className="w-12 h-12 rounded-full border border-[#45373C] bg-[#2B2226] flex items-center justify-center mb-6">
        {current.icon}
      </div>

      <div className="text-[12px] uppercase tracking-[0.18em] font-sans text-[#A89A98] mb-2 font-medium">
        {current.subtitle}
      </div>

      <h2 className="font-serif text-3xl sm:text-4xl text-[#F0E8DF] font-normal tracking-tight mb-4">
        {current.title}
      </h2>

      <p className="font-sans text-sm sm:text-base text-[#A89A98] leading-relaxed mb-8 max-w-lg">
        {current.description}
      </p>

      <div className="p-5 border border-[#45373C]/50 bg-[#2B2226]/30 rounded-sm mb-10 w-full max-w-lg">
        <p className="font-serif italic text-[#F0E8DF]/90 text-sm leading-relaxed">
          &ldquo;{current.whisper}&rdquo;
        </p>
      </div>

      <button
        type="button"
        onClick={onReturnToTonight}
        className="inline-flex items-center gap-2.5 px-5 py-2.5 border border-[#45373C] hover:border-[#D78A70] bg-[#2B2226] text-[#F0E8DF] text-xs font-sans tracking-wide rounded-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
      >
        <Feather className="w-3.5 h-3.5 text-[#D78A70]" />
        <span>Return to Tonight&apos;s Canvas</span>
      </button>
    </div>
  );
}
