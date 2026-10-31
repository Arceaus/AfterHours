"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  DiaryEntry,
  EvidenceItem,
  PersonalPattern,
  MemoryConnection,
  MonthlyReflectionData,
  StructuredReflection,
  SavedReflection,
  ReflectionType,
} from "@/types/entry";
import {
  getReflectionAIConsent,
  setReflectionAIConsent,
  discoverPersonalPatterns,
  discoverMemoryConnections,
  dismissMemoryConnection,
  analyzeChangingPerspectives,
  generateMonthlyReflection,
} from "@/lib/reflection";
import { retrieveEntries } from "@/lib/retrieval";
import { formatLocalCalendarDate, deriveDisplayTitle, getMonthKey, formatMonthKey } from "@/lib/date";
import { useRepository } from "@/lib/repository/RepositoryContext";
import {
  Sparkles,
  Compass,
  ArrowRight,
  Clock,
  Calendar,
  Layers,
  GitCompare,
  CalendarDays,
  Bookmark,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  X,
  Search,
  BookOpen,
  Feather,
  RefreshCw,
} from "lucide-react";

interface ReflectionViewProps {
  entries: DiaryEntry[];
  onOpenEntry: (entry: DiaryEntry) => void;
  onReturnToTonight: () => void;
}

const GENTLE_QUESTIONS = [
  "What seems to have occupied your thoughts recently?",
  "Which goals or projects have appeared in several entries?",
  "Is there something you've mentioned repeatedly over time?",
  "What would you like to revisit from an earlier period?",
  "Are there ideas you started exploring but haven't returned to?",
];

export function ReflectionView({
  entries,
  onOpenEntry,
  onReturnToTonight,
}: ReflectionViewProps) {
  const { reflections, saveReflection, deleteReflection, mode } = useRepository();

  // Active section tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "patterns" | "perspectives" | "monthly" | "connections" | "history"
  >("overview");

  // Query & Reflection state
  const [queryInput, setQueryInput] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [activeReflection, setActiveReflection] = useState<{
    type: ReflectionType;
    title: string;
    data: StructuredReflection;
    usedAI: boolean;
    dateRangeLabel?: string;
    savedId?: string;
  } | null>(null);

  // Consent & Privacy Modal State
  const [aiConsent, setAiConsent] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Changing Perspectives Form State
  const [perspectiveTopic, setPerspectiveTopic] = useState("");
  const [perspectivePreset, setPerspectivePreset] = useState<"1month" | "3months" | "6months">("3months");

  // Monthly Reflection State
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      const key = getMonthKey(e.entryDate);
      if (key) set.add(key);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || getMonthKey(new Date().toISOString().split("T")[0])
  );
  const [monthlyData, setMonthlyData] = useState<MonthlyReflectionData | null>(null);

  // Discovered Patterns & Connections
  const patterns = useMemo(() => discoverPersonalPatterns(entries), [entries]);
  const [connections, setConnections] = useState<MemoryConnection[]>([]);

  useEffect(() => {
    setAiConsent(getReflectionAIConsent());
    setConnections(discoverMemoryConnections(entries));
  }, [entries]);

  // Load monthly reflection whenever selectedMonth changes
  useEffect(() => {
    if (selectedMonth && entries.length > 0) {
      const data = generateMonthlyReflection(selectedMonth, entries);
      setMonthlyData(data);
    }
  }, [selectedMonth, entries]);

  const handleToggleConsent = (consented: boolean) => {
    setAiConsent(consented);
    setReflectionAIConsent(consented);
  };

  // 1. Synthesize Reflection for general questions
  const handleAskQuestion = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || entries.length === 0) return;

    setIsSynthesizing(true);
    setActiveReflection(null);

    // Step 1: Local retrieval of top relevant excerpts (privacy-first)
    const retrievalResults = retrieveEntries(q, entries);
    const excerpts: EvidenceItem[] = retrievalResults.map((r) => ({
      entryId: r.entry.id,
      entryDate: r.entry.entryDate,
      title: deriveDisplayTitle(r.entry.title, r.entry.content),
      excerpt: r.excerpt,
    }));

    if (excerpts.length === 0) {
      setActiveReflection({
        type: "question",
        title: q,
        usedAI: false,
        data: {
          summary: `No recorded reflections were found matching "${q}".`,
          observations: [
            "Your existing diary entries do not explicitly mention the keywords in your question.",
          ],
          evidence: [],
          limitations: "Observations are strictly limited to recorded diary entries.",
          reflectionQuestions: [
            "Would you like to write a new reflection tonight exploring this thought?",
          ],
        },
      });
      setIsSynthesizing(false);
      return;
    }

    // Step 2: External AI synthesis (if user consented), else transparent local synthesis
    if (aiConsent) {
      try {
        const res = await fetch("/api/reflection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "question",
            prompt: q,
            excerpts,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.available && data.structured) {
            setActiveReflection({
              type: "question",
              title: q,
              data: data.structured,
              usedAI: true,
            });
            setIsSynthesizing(false);
            return;
          }
        }
      } catch (err) {
        console.warn("AI synthesis request failed, falling back to local analysis:", err);
      }
    }

    // Local grounded synthesis
    const observations = [
      `Found ${excerpts.length} relevant memories across your diary discussing themes related to your question.`,
      `Most recent relevant entry was recorded on ${formatLocalCalendarDate(excerpts[0].entryDate).fullDate}.`,
      `Earliest relevant entry was recorded on ${
        formatLocalCalendarDate(excerpts[excerpts.length - 1].entryDate).fullDate
      }.`,
    ];

    setActiveReflection({
      type: "question",
      title: q,
      usedAI: false,
      data: {
        summary: `Reflections and memories found in your diary related to "${q}".`,
        observations,
        evidence: excerpts,
        limitations:
          "This synthesis is compiled locally from what was recorded. Unwritten experiences cannot be inferred.",
        reflectionQuestions: [
          `When reviewing these entries, what stands out as most meaningful to you now?`,
          `Has your perspective on this topic shifted since you wrote these notes?`,
        ],
      },
    });
    setIsSynthesizing(false);
  };

  // 2. Synthesize Changing Perspectives
  const handleAnalyzePerspective = async () => {
    if (!perspectiveTopic.trim()) return;

    setIsSynthesizing(true);
    setActiveReflection(null);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Compute period boundaries based on preset
    let periodA = { label: "Earlier period", start: "", end: "" };
    let periodB = { label: "Recent period", start: "", end: todayStr };

    if (perspectivePreset === "1month") {
      const d1 = new Date();
      d1.setMonth(d1.getMonth() - 1);
      const d2 = new Date();
      d2.setMonth(d2.getMonth() - 2);
      periodB = { label: "Current Month", start: d1.toISOString().split("T")[0], end: todayStr };
      periodA = {
        label: "Previous Month",
        start: d2.toISOString().split("T")[0],
        end: d1.toISOString().split("T")[0],
      };
    } else if (perspectivePreset === "3months") {
      const d1 = new Date();
      d1.setMonth(d1.getMonth() - 3);
      const d2 = new Date();
      d2.setMonth(d2.getMonth() - 6);
      periodB = { label: "Recent 3 Months", start: d1.toISOString().split("T")[0], end: todayStr };
      periodA = {
        label: "Previous 3 Months",
        start: d2.toISOString().split("T")[0],
        end: d1.toISOString().split("T")[0],
      };
    } else {
      const d1 = new Date();
      d1.setMonth(d1.getMonth() - 6);
      const d2 = new Date();
      d2.setMonth(d2.getMonth() - 12);
      periodB = { label: "Recent 6 Months", start: d1.toISOString().split("T")[0], end: todayStr };
      periodA = {
        label: "Previous 6 Months",
        start: d2.toISOString().split("T")[0],
        end: d1.toISOString().split("T")[0],
      };
    }

    const localStructured = analyzeChangingPerspectives(
      perspectiveTopic,
      entries,
      periodA,
      periodB
    );

    // If AI consent enabled, query server endpoint with selected evidence
    if (aiConsent && localStructured.evidence.length > 0) {
      try {
        const res = await fetch("/api/reflection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "perspective",
            prompt: `How has my perspective on "${perspectiveTopic}" evolved over time?`,
            excerpts: localStructured.evidence,
            context: {
              topic: perspectiveTopic,
              periodA,
              periodB,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.available && data.structured) {
            setActiveReflection({
              type: "perspective",
              title: `Perspective on "${perspectiveTopic}"`,
              data: data.structured,
              usedAI: true,
              dateRangeLabel: `${periodA.label} vs ${periodB.label}`,
            });
            setIsSynthesizing(false);
            return;
          }
        }
      } catch (err) {
        console.warn("AI perspective call failed, using local analysis:", err);
      }
    }

    setActiveReflection({
      type: "perspective",
      title: `Perspective on "${perspectiveTopic}"`,
      data: localStructured,
      usedAI: false,
      dateRangeLabel: `${periodA.label} vs ${periodB.label}`,
    });
    setIsSynthesizing(false);
  };

  // 3. Save Active Reflection
  const handleSaveActiveReflection = async () => {
    if (!activeReflection) return;
    const newSaved: SavedReflection = {
      id: "ref_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8),
      createdAt: new Date().toISOString(),
      type: activeReflection.type,
      title: activeReflection.title,
      query: queryInput,
      dateRange: activeReflection.dateRangeLabel
        ? { label: activeReflection.dateRangeLabel }
        : undefined,
      reflection: activeReflection.data,
      referencedEntryIds: activeReflection.data.evidence.map((e) => e.entryId),
      usedAI: activeReflection.usedAI,
    };

    await saveReflection(newSaved);
    setActiveReflection((prev) => (prev ? { ...prev, savedId: newSaved.id } : null));
  };

  const handleDismissConnection = (connId: string) => {
    dismissMemoryConnection(connId);
    setConnections((prev) => prev.filter((c) => c.id !== connId));
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col py-2 sm:py-6">
      {/* Editorial Header */}
      <header className="mb-8 border-b border-[#FFFFFF]/[0.06] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#FF9254] font-sans">
            <Compass className="w-4 h-4 text-[#FF9254]" />
            <span>Reflection Center</span>
          </div>

          {/* AI Privacy & Consent Badge */}
          <button
            type="button"
            onClick={() => setShowConsentModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-[#FFFFFF]/[0.08] bg-[#0E0919] hover:border-[#FF9254]/60 text-xs text-[#B3A8C6] hover:text-[#FFFFFF] transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-[#FF9254]" />
            <span>{aiConsent ? "External AI: Active" : "Private Local Analysis"}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF9254]" />
          </button>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#FFFFFF] font-normal tracking-[-0.01em] leading-tight mb-3">
          Sometimes, looking back helps you see things differently.
        </h1>
        <p className="font-sans text-sm sm:text-base text-[#B3A8C6] max-w-2xl leading-relaxed">
          A quiet space to understand recurring topics, observe how your perspectives shifted across months, and explore the subtle threads connecting your memories.
        </p>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 pt-6">
          {[
            { id: "overview", label: "Inquire & Reflect", icon: <Search className="w-3.5 h-3.5" /> },
            { id: "patterns", label: `Personal Patterns (${patterns.length})`, icon: <Layers className="w-3.5 h-3.5" /> },
            { id: "perspectives", label: "Changing Perspectives", icon: <GitCompare className="w-3.5 h-3.5" /> },
            { id: "monthly", label: "Monthly Reflection", icon: <CalendarDays className="w-3.5 h-3.5" /> },
            { id: "connections", label: `Memory Links (${connections.length})`, icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: "history", label: `Saved (${reflections.length})`, icon: <Bookmark className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setActiveReflection(null);
                }}
                className={`px-3.5 py-2 rounded-sm text-xs font-sans font-medium transition-all flex items-center gap-2 ${
                  active
                    ? "bg-[#0E0919] text-[#FFFFFF] border border-[#FF9254]/50"
                    : "text-[#B3A8C6] hover:text-[#FFFFFF] hover:bg-[#0E0919]/40 border border-transparent"
                }`}
              >
                <span className={active ? "text-[#FF9254]" : "text-[#B3A8C6]"}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Empty State if 0 entries exist */}
      {entries.length === 0 ? (
        <div className="p-8 sm:p-12 bg-[#0E0919]/40 border border-[#FFFFFF]/[0.08] rounded-sm text-center max-w-xl mx-auto my-8">
          <BookOpen className="w-8 h-8 text-[#FF9254] mx-auto mb-4 opacity-70" />
          <h2 className="font-serif text-2xl text-[#FFFFFF] mb-2 font-normal">
            Your sanctuary is just beginning.
          </h2>
          <p className="text-xs text-[#B3A8C6] leading-relaxed mb-6 font-sans">
            As you preserve your thoughts over multiple evenings, recurring themes, perspective comparisons, and memory connections will gently reveal themselves here.
          </p>
          <button
            type="button"
            onClick={onReturnToTonight}
            className="px-4 py-2 bg-[#FF9254] hover:bg-[#FF9254]/90 text-[#08060F] text-xs font-medium rounded-sm inline-flex items-center gap-2 transition-colors"
          >
            <Feather className="w-3.5 h-3.5" />
            <span>Write Tonight&apos;s Entry</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* TAB 1: Inquire & Reflect (Question asking & Active Reflection) */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Question Input */}
              <div className="p-5 sm:p-6 bg-[#0E0919]/60 border border-[#FFFFFF]/[0.08] rounded-sm space-y-4">
                <label className="block text-xs uppercase tracking-wider text-[#B3A8C6] font-sans">
                  Ask a quiet question about your writing
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#B3A8C6] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAskQuestion(queryInput);
                      }}
                      placeholder="e.g. What have I written about my goals? Or How have I felt about learning?"
                      className="w-full bg-[#08060F] border border-[#FFFFFF]/[0.08] text-[#FFFFFF] pl-10 pr-4 py-2.5 text-xs rounded-sm focus:outline-none focus:border-[#FF9254] font-sans placeholder-[#B3A8C6]/40"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isSynthesizing || !queryInput.trim()}
                    onClick={() => handleAskQuestion(queryInput)}
                    className="px-5 py-2.5 bg-[#FF9254] hover:bg-[#FF9254]/90 disabled:opacity-40 text-[#08060F] text-xs font-medium rounded-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isSynthesizing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Reflecting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Reflect</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Gentle Suggested Questions (Section 8) */}
                <div className="pt-2">
                  <span className="text-[11px] text-[#B3A8C6]/70 block mb-2 font-sans">
                    Or explore one of these gentle invitations:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {GENTLE_QUESTIONS.map((q, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setQueryInput(q);
                          handleAskQuestion(q);
                        }}
                        className="text-[11px] text-[#B3A8C6] hover:text-[#FFFFFF] bg-[#08060F] border border-[#FFFFFF]/[0.08] hover:border-[#FF9254]/40 px-3 py-1.5 rounded-sm transition-colors text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Reflection Card Display */}
              {activeReflection && (
                <article
                  aria-label="Reflection result"
                  className="p-6 sm:p-8 bg-[#0E0919] border border-[#FF9254]/40 rounded-sm space-y-6 shadow-2xl relative animate-fadeIn"
                >
                  <div className="flex items-start justify-between gap-4 border-b border-[#FFFFFF]/[0.06] pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#FF9254] font-sans mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="uppercase tracking-wider font-mono text-[10px]">
                          {activeReflection.usedAI ? "Grounded AI Synthesis" : "Local Synthesis"}
                        </span>
                      </div>
                      <h2 className="font-serif text-2xl text-[#FFFFFF] font-normal">
                        {activeReflection.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={Boolean(activeReflection.savedId)}
                        onClick={handleSaveActiveReflection}
                        className="px-3 py-1.5 border border-[#FFFFFF]/[0.08] hover:border-[#FF9254] text-xs text-[#FFFFFF] rounded-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-[#FF9254]" />
                        <span>{activeReflection.savedId ? "Saved" : "Save"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveReflection(null)}
                        className="text-[#B3A8C6] hover:text-[#FFFFFF] p-1.5"
                        aria-label="Close reflection"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-[#08060F] border border-[#FFFFFF]/[0.08] rounded-sm">
                    <p className="font-serif italic text-base sm:text-lg text-[#FFFFFF] leading-relaxed">
                      &ldquo;{activeReflection.data.summary}&rdquo;
                    </p>
                  </div>

                  {/* Observations */}
                  {activeReflection.data.observations.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs uppercase tracking-wider text-[#B3A8C6] font-sans">
                        Documented Observations
                      </h3>
                      <ul className="space-y-2 text-xs font-sans text-[#FFFFFF]/90 leading-relaxed">
                        {activeReflection.data.observations.map((obs, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF9254] mt-1.5 flex-shrink-0" />
                            <span>{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Evidence / Supporting Diary Excerpts */}
                  {activeReflection.data.evidence.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-xs uppercase tracking-wider text-[#B3A8C6] font-sans">
                        Supporting Evidence from your Diary ({activeReflection.data.evidence.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeReflection.data.evidence.map((ev, i) => {
                          const origEntry = entries.find((e) => e.id === ev.entryId);
                          return (
                            <div
                              key={i}
                              className="p-3.5 bg-[#08060F] border border-[#FFFFFF]/[0.08] rounded-sm space-y-2 flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between text-[11px] text-[#B3A8C6] mb-1 font-mono">
                                  <span>{formatLocalCalendarDate(ev.entryDate).monthDay}</span>
                                  <span>{formatLocalCalendarDate(ev.entryDate).year}</span>
                                </div>
                                <h4 className="font-serif text-sm text-[#FFFFFF] mb-1 line-clamp-1">
                                  {ev.title || "Untitled Reflection"}
                                </h4>
                                <p className="text-xs text-[#B3A8C6] italic font-serif leading-relaxed line-clamp-3">
                                  &ldquo;{ev.excerpt}&rdquo;
                                </p>
                              </div>

                              {origEntry && (
                                <button
                                  type="button"
                                  onClick={() => onOpenEntry(origEntry)}
                                  className="pt-2 text-left text-[11px] text-[#FF9254] hover:underline flex items-center gap-1 font-sans"
                                >
                                  <span>Open full entry</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Limitations (Honest uncertainty) */}
                  {activeReflection.data.limitations && (
                    <div className="pt-2 text-xs text-[#B3A8C6]/70 italic border-t border-[#FFFFFF]/[0.04] flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-[#FF9254]/60 flex-shrink-0" />
                      <span>{activeReflection.data.limitations}</span>
                    </div>
                  )}

                  {/* Reflection Questions to Ponder */}
                  {activeReflection.data.reflectionQuestions.length > 0 && (
                    <div className="p-4 bg-[#08060F]/80 border border-[#FF9254]/20 rounded-sm space-y-2">
                      <span className="text-[11px] uppercase tracking-wider text-[#FF9254] font-sans font-medium block">
                        Questions for you to revisit
                      </span>
                      <ul className="space-y-1.5 text-xs text-[#FFFFFF] font-serif italic">
                        {activeReflection.data.reflectionQuestions.map((q, i) => (
                          <li key={i}>&bull; {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              )}
            </div>
          )}

          {/* TAB 2: Personal Patterns (Section 3) */}
          {activeTab === "patterns" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-2xl text-[#FFFFFF] font-normal">
                    Recurring Personal Patterns
                  </h2>
                  <p className="text-xs text-[#B3A8C6] font-sans mt-0.5">
                    Topics and ideas that appeared across several entries, discovered purely from your actual writing.
                  </p>
                </div>
              </div>

              {patterns.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#B3A8C6] bg-[#0E0919]/30 border border-[#FFFFFF]/[0.08] rounded-sm">
                  Not enough recurring topics detected yet. As you write across different days, patterns will automatically appear.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patterns.map((pat, idx) => (
                    <div
                      key={idx}
                      className="p-5 bg-[#0E0919] border border-[#FFFFFF]/[0.08] rounded-sm space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-serif text-lg text-[#FFFFFF]">
                            #{pat.topic}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider rounded ${
                              pat.frequency === "frequent"
                                ? "bg-[#FF9254]/20 text-[#FF9254] border border-[#FF9254]/40"
                                : pat.frequency === "occasional"
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                                : "bg-[#FFFFFF]/[0.06] text-[#B3A8C6] border border-[#FFFFFF]/[0.08]"
                            }`}
                          >
                            {pat.frequency}
                          </span>
                        </div>
                        <p className="text-xs text-[#B3A8C6] font-sans leading-relaxed mb-3">
                          {pat.description}
                        </p>

                        <div className="space-y-2 border-t border-[#FFFFFF]/[0.06] pt-3">
                          <span className="text-[10px] uppercase tracking-wider text-[#B3A8C6]/60 block font-mono">
                            Recent Mentions ({formatLocalCalendarDate(pat.firstSeen).monthDay} &rarr; {formatLocalCalendarDate(pat.lastSeen).monthDay})
                          </span>
                          {pat.excerpts.slice(0, 2).map((ex, exIdx) => {
                            const entry = entries.find((e) => e.id === ex.entryId);
                            return (
                              <div
                                key={exIdx}
                                onClick={() => entry && onOpenEntry(entry)}
                                className="p-2 bg-[#08060F] hover:bg-[#08060F]/80 rounded border border-[#FFFFFF]/[0.06] cursor-pointer text-xs transition-colors"
                              >
                                <span className="font-mono text-[10px] text-[#FF9254] block">
                                  {formatLocalCalendarDate(ex.entryDate).fullDate}
                                </span>
                                <p className="text-xs text-[#B3A8C6] italic font-serif line-clamp-2">
                                  &ldquo;{ex.excerpt}&rdquo;
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPerspectiveTopic(pat.topic);
                          setActiveTab("perspectives");
                        }}
                        className="pt-2 text-xs text-[#FF9254] hover:underline flex items-center gap-1.5 font-sans"
                      >
                        <span>Compare changing perspective on #{pat.topic}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Changing Perspectives (Section 5) */}
          {activeTab === "perspectives" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-[#FFFFFF] font-normal">
                  Changing Perspectives
                </h2>
                <p className="text-xs text-[#B3A8C6] font-sans mt-0.5">
                  Compare how your thoughts regarding a topic shifted across distinct periods of time.
                </p>
              </div>

              <div className="p-5 sm:p-6 bg-[#0E0919] border border-[#FFFFFF]/[0.08] rounded-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#B3A8C6] mb-1.5 font-sans">
                      Topic or Idea to Compare
                    </label>
                    <input
                      type="text"
                      value={perspectiveTopic}
                      onChange={(e) => setPerspectiveTopic(e.target.value)}
                      placeholder="e.g. college, work, family, future"
                      className="w-full bg-[#08060F] border border-[#FFFFFF]/[0.08] text-[#FFFFFF] px-3.5 py-2 text-xs rounded-sm focus:outline-none focus:border-[#FF9254] font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#B3A8C6] mb-1.5 font-sans">
                      Comparison Interval
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "1month", label: "Past Month" },
                        { id: "3months", label: "Past 3 Months" },
                        { id: "6months", label: "Past 6 Months" },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setPerspectivePreset(preset.id as any)}
                          className={`py-2 px-2 text-center text-xs font-sans rounded-sm border transition-colors ${
                            perspectivePreset === preset.id
                              ? "bg-[#FF9254] text-[#08060F] border-[#FF9254] font-medium"
                              : "bg-[#08060F] text-[#B3A8C6] border-[#FFFFFF]/[0.08] hover:text-[#FFFFFF]"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!perspectiveTopic.trim() || isSynthesizing}
                  onClick={handleAnalyzePerspective}
                  className="px-5 py-2.5 bg-[#FF9254] hover:bg-[#FF9254]/90 disabled:opacity-40 text-[#08060F] text-xs font-medium rounded-sm transition-colors flex items-center gap-2"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>{isSynthesizing ? "Synthesizing..." : "Compare Perspective Periods"}</span>
                </button>
              </div>

              {/* Perspective Result Card (if generated) */}
              {activeReflection && activeReflection.type === "perspective" && (
                <div className="p-6 bg-[#0E0919] border border-[#FF9254]/40 rounded-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#FFFFFF]/[0.06] pb-3">
                    <h3 className="font-serif text-xl text-[#FFFFFF]">
                      {activeReflection.title}
                    </h3>
                    <span className="text-xs font-mono text-[#FF9254]">
                      {activeReflection.dateRangeLabel}
                    </span>
                  </div>
                  <p className="font-serif italic text-base text-[#FFFFFF] leading-relaxed">
                    &ldquo;{activeReflection.data.summary}&rdquo;
                  </p>
                  <ul className="space-y-2 text-xs font-sans text-[#B3A8C6]">
                    {activeReflection.data.observations.map((obs, i) => (
                      <li key={i} className="flex items-start gap-2 text-[#FFFFFF]/90">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9254] mt-1.5 flex-shrink-0" />
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Monthly Reflection (Section 6) */}
          {activeTab === "monthly" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-2xl text-[#FFFFFF] font-normal">
                    Monthly Reflections
                  </h2>
                  <p className="text-xs text-[#B3A8C6] font-sans mt-0.5">
                    Grounded review of what was actually preserved during a specific calendar month.
                  </p>
                </div>

                {/* Month Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-xs text-[#B3A8C6] font-sans">Month:</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-[#0E0919] border border-[#FFFFFF]/[0.08] text-[#FFFFFF] px-3 py-1.5 text-xs rounded-sm focus:outline-none focus:border-[#FF9254] font-sans"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatMonthKey(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {monthlyData && (
                <div className="p-6 sm:p-8 bg-[#0E0919] border border-[#FFFFFF]/[0.08] rounded-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-[#FFFFFF]/[0.06] pb-4">
                    <div>
                      <span className="text-[11px] font-mono text-[#FF9254] uppercase">
                        Preserved History
                      </span>
                      <h3 className="font-serif text-2xl text-[#FFFFFF]">
                        {monthlyData.monthLabel}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 bg-[#08060F] border border-[#FFFFFF]/[0.08] text-xs font-mono text-[#B3A8C6] rounded">
                      {monthlyData.entryCount} {monthlyData.entryCount === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  {/* Summary */}
                  <p className="font-serif italic text-base sm:text-lg text-[#FFFFFF] leading-relaxed p-4 bg-[#08060F] rounded-sm border border-[#FFFFFF]/[0.06]">
                    &ldquo;{monthlyData.summary}&rdquo;
                  </p>

                  {/* Topics that appeared */}
                  {monthlyData.topics.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs uppercase tracking-wider text-[#B3A8C6] font-sans">
                        Topics that Appeared
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {monthlyData.topics.map((t, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-[#08060F] border border-[#FFFFFF]/[0.08] text-xs text-[#FFFFFF] rounded-sm font-sans"
                          >
                            #{t.topic}{" "}
                            <span className="text-[#B3A8C6]/60 text-[10px]">({t.count})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Memorable Moments */}
                  {monthlyData.memorableMoments.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs uppercase tracking-wider text-[#B3A8C6] font-sans">
                        Documented Moments ({monthlyData.memorableMoments.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {monthlyData.memorableMoments.map((m, i) => {
                          const orig = entries.find((e) => e.id === m.entryId);
                          return (
                            <div
                              key={i}
                              className="p-3.5 bg-[#08060F] border border-[#FFFFFF]/[0.08] rounded-sm space-y-1.5"
                            >
                              <span className="font-mono text-[10px] text-[#FF9254]">
                                {formatLocalCalendarDate(m.entryDate).fullDate}
                              </span>
                              <h5 className="font-serif text-sm text-[#FFFFFF]">
                                {m.title}
                              </h5>
                              <p className="text-xs text-[#B3A8C6] italic font-serif line-clamp-2">
                                &ldquo;{m.excerpt}&rdquo;
                              </p>
                              {orig && (
                                <button
                                  type="button"
                                  onClick={() => onOpenEntry(orig)}
                                  className="text-[11px] text-[#FF9254] hover:underline pt-1 inline-flex items-center gap-1 font-sans"
                                >
                                  <span>View full reflection</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Questions to Revisit */}
                  {monthlyData.questionsToRevisit.length > 0 && (
                    <div className="p-4 bg-[#08060F]/60 border border-[#FF9254]/20 rounded-sm space-y-1.5">
                      <span className="text-[11px] uppercase tracking-wider text-[#FF9254] font-sans font-medium">
                        Looking back
                      </span>
                      <ul className="space-y-1 text-xs text-[#FFFFFF] font-serif italic">
                        {monthlyData.questionsToRevisit.map((q, i) => (
                          <li key={i}>&bull; {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Memory Connections (Section 7) */}
          {activeTab === "connections" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-[#FFFFFF] font-normal">
                  Memory Connections
                </h2>
                <p className="text-xs text-[#B3A8C6] font-sans mt-0.5">
                  Subtle thematic links and shared ideas discovered across entries recorded days or months apart.
                </p>
              </div>

              {connections.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#B3A8C6] bg-[#0E0919]/30 border border-[#FFFFFF]/[0.08] rounded-sm">
                  No memory connections detected yet. Connections appear when distinct thoughts or tags span across different weeks.
                </div>
              ) : (
                <div className="space-y-4">
                  {connections.map((conn) => {
                    const entryA = entries.find((e) => e.id === conn.entryA.entryId);
                    const entryB = entries.find((e) => e.id === conn.entryB.entryId);

                    return (
                      <div
                        key={conn.id}
                        className="p-5 bg-[#0E0919] border border-[#FFFFFF]/[0.08] rounded-sm space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-[#FFFFFF]/[0.06] pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <Sparkles className="w-4 h-4 text-[#FF9254]" />
                            <span className="font-serif text-base text-[#FFFFFF]">
                              Theme: {conn.theme}
                            </span>
                            <span className="px-2 py-0.5 bg-[#08060F] border border-[#FFFFFF]/[0.08] text-[10px] font-mono text-[#B3A8C6] rounded">
                              {conn.confidence}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDismissConnection(conn.id)}
                            className="text-xs text-[#B3A8C6] hover:text-red-400 transition-colors"
                            title="Dismiss connection"
                          >
                            Dismiss
                          </button>
                        </div>

                        <p className="text-xs text-[#B3A8C6] font-sans">
                          {conn.explanation}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Entry A */}
                          <div className="p-3 bg-[#08060F] border border-[#FFFFFF]/[0.06] rounded-sm space-y-1">
                            <span className="font-mono text-[10px] text-[#FF9254]">
                              {formatLocalCalendarDate(conn.entryA.entryDate).fullDate}
                            </span>
                            <h4 className="font-serif text-sm text-[#FFFFFF] line-clamp-1">
                              {conn.entryA.title}
                            </h4>
                            <p className="text-xs text-[#B3A8C6] italic font-serif line-clamp-2">
                              &ldquo;{conn.entryA.excerpt}&rdquo;
                            </p>
                            {entryA && (
                              <button
                                type="button"
                                onClick={() => onOpenEntry(entryA)}
                                className="text-[11px] text-[#FF9254] hover:underline pt-1 inline-flex items-center gap-1 font-sans"
                              >
                                <span>Inspect Entry</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Entry B */}
                          <div className="p-3 bg-[#08060F] border border-[#FFFFFF]/[0.06] rounded-sm space-y-1">
                            <span className="font-mono text-[10px] text-[#FF9254]">
                              {formatLocalCalendarDate(conn.entryB.entryDate).fullDate}
                            </span>
                            <h4 className="font-serif text-sm text-[#FFFFFF] line-clamp-1">
                              {conn.entryB.title}
                            </h4>
                            <p className="text-xs text-[#B3A8C6] italic font-serif line-clamp-2">
                              &ldquo;{conn.entryB.excerpt}&rdquo;
                            </p>
                            {entryB && (
                              <button
                                type="button"
                                onClick={() => onOpenEntry(entryB)}
                                className="text-[11px] text-[#FF9254] hover:underline pt-1 inline-flex items-center gap-1 font-sans"
                              >
                                <span>Inspect Entry</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Saved Reflections History (Section 11) */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl text-[#FFFFFF] font-normal">
                  Saved Reflections History
                </h2>
                <p className="text-xs text-[#B3A8C6] font-sans mt-0.5">
                  Reflections and perspectives you chose to preserve.
                </p>
              </div>

              {reflections.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#B3A8C6] bg-[#0E0919]/30 border border-[#FFFFFF]/[0.08] rounded-sm">
                  You haven&apos;t saved any reflections yet. When you generate a reflection or perspective comparison, click &ldquo;Save&rdquo; to keep it here.
                </div>
              ) : (
                <div className="space-y-4">
                  {reflections.map((ref) => {
                    // Check if underlying entries still exist
                    const missingCount = ref.referencedEntryIds.filter(
                      (id) => !entries.some((e) => e.id === id)
                    ).length;

                    return (
                      <div
                        key={ref.id}
                        className="p-5 bg-[#0E0919] border border-[#FFFFFF]/[0.08] rounded-sm space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-[#FFFFFF]/[0.06] pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-lg text-[#FFFFFF]">
                              {ref.title}
                            </span>
                            <span className="px-2 py-0.5 bg-[#08060F] border border-[#FFFFFF]/[0.08] text-[10px] font-mono uppercase text-[#FF9254] rounded">
                              {ref.type}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-[#B3A8C6]">
                              {formatLocalCalendarDate(ref.createdAt.split("T")[0]).fullDate}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteReflection(ref.id)}
                              className="text-[#B3A8C6] hover:text-red-400 p-1"
                              title="Delete saved reflection"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="font-serif italic text-sm text-[#FFFFFF]/90 leading-relaxed">
                          &ldquo;{ref.reflection.summary}&rdquo;
                        </p>

                        {missingCount > 0 && (
                          <div className="text-[11px] text-amber-400/80 italic flex items-center gap-1.5 font-sans">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>
                              {missingCount} underlying {missingCount === 1 ? "entry has" : "entries have"} been deleted since this reflection was recorded.
                            </span>
                          </div>
                        )}

                        <div className="pt-1 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReflection({
                                type: ref.type,
                                title: ref.title,
                                data: ref.reflection,
                                usedAI: ref.usedAI,
                                savedId: ref.id,
                              })
                            }
                            className="text-xs text-[#FF9254] hover:underline flex items-center gap-1 font-sans"
                          >
                            <span>Inspect full reflection & evidence</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PRIVACY & INFORMED CONSENT MODAL (Section 10) */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 bg-[#08060F]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E0919] border border-[#FFFFFF]/[0.08] max-w-lg w-full p-6 sm:p-8 rounded-sm space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowConsentModal(false)}
              className="absolute top-5 right-5 text-[#B3A8C6] hover:text-[#FFFFFF]"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-[#FF9254]">
              <Shield className="w-5 h-5" />
              <h3 className="font-serif text-xl text-[#FFFFFF]">
                Privacy & AI Processing Consent
              </h3>
            </div>

            <p className="text-xs text-[#B3A8C6] leading-relaxed font-sans">
              Diary entries are deeply personal records. AFTERTHOUGHT operates with strict boundaries regarding how your memories are handled.
            </p>

            <div className="p-4 bg-[#08060F] border border-[#FFFFFF]/[0.08] rounded-sm space-y-2 text-xs font-sans text-[#B3A8C6]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Local Analysis by Default:</strong> Personal patterns, topic frequencies, and monthly statistics run 100% on this device without sending data anywhere.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Minimum Evidence Only:</strong> When external AI is enabled, only selected relevant excerpts (up to 8 excerpts) are transmitted to the server. Your entire diary is never uploaded to an AI provider.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Strict Privacy Boundary:</strong> Letters to your Future Self are completely excluded and never transmitted to AI models.
                </span>
              </div>
            </div>

            {/* Toggle */}
            <div className="pt-2 flex items-center justify-between border-t border-[#FFFFFF]/[0.06]">
              <div>
                <span className="text-xs font-medium text-[#FFFFFF] block font-sans">
                  External AI Reflection Synthesis
                </span>
                <span className="text-[11px] text-[#B3A8C6] font-sans">
                  Requires server API key (Google Gemini)
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleToggleConsent(!aiConsent)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  aiConsent ? "bg-[#FF9254]" : "bg-[#FFFFFF]/[0.08]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    aiConsent ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="px-4 py-2 bg-[#FF9254] text-[#08060F] font-medium text-xs rounded-sm hover:bg-[#FF9254]/90 transition-colors"
              >
                Confirm Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

