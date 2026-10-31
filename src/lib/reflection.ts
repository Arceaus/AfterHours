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
import { formatLocalCalendarDate, deriveDisplayTitle, getDaysInMonth } from "./date";

const STORAGE_KEY_AI_CONSENT = "afterthought_reflection_ai_consent";
const STORAGE_KEY_SAVED_REFLECTIONS = "afterthought_saved_reflections_v1";
const STORAGE_KEY_DISMISSED_CONNECTIONS = "afterthought_dismissed_connections_v1";

// 1. Privacy & Consent Management
export function getReflectionAIConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY_AI_CONSENT) === "true";
  } catch {
    return false;
  }
}

export function setReflectionAIConsent(consented: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_AI_CONSENT, consented ? "true" : "false");
  } catch (err) {
    console.error("Failed to save AI consent preference:", err);
  }
}

// 2. Stop words list for natural topic discovery
const REFLECTION_STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
  "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
  "hasn't", "have", "haven't", "having", "he", "her", "here", "hers", "herself",
  "him", "himself", "his", "how", "i", "i'd", "i'll", "i'm", "i've", "if", "in",
  "into", "is", "isn't", "it", "its", "itself", "just", "let's", "me", "more",
  "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
  "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
  "same", "she", "should", "shouldn't", "so", "some", "such", "than", "that",
  "the", "their", "theirs", "them", "themselves", "then", "there", "these",
  "they", "this", "those", "through", "to", "too", "under", "until", "up",
  "very", "was", "wasn't", "we", "were", "weren't", "what", "when", "where",
  "which", "while", "who", "whom", "why", "with", "won't", "would", "wouldn't",
  "you", "your", "yours", "yourself", "yourselves", "entry", "entries", "wrote",
  "today", "tonight", "night", "day", "days", "felt", "feeling", "feel", "think",
  "thought", "thoughts", "write", "writing", "really", "much", "many", "still",
  "already", "thing", "things", "something", "going", "went", "like", "get", "got",
]);

export function createExcerptForTerm(content: string, term: string, maxLength: number = 180): string {
  if (!content) return "";
  const trimmed = content.trim();
  const lower = trimmed.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());

  if (idx === -1) {
    return trimmed.length > maxLength ? `${trimmed.substring(0, maxLength - 3)}...` : trimmed;
  }

  const start = Math.max(0, idx - 45);
  const end = Math.min(trimmed.length, idx + term.length + 115);
  let snippet = trimmed.substring(start, end).trim();

  if (start > 0) snippet = `...${snippet}`;
  if (end < trimmed.length) snippet = `${snippet}...`;

  return snippet;
}

// 3. Personal Patterns Discovery (Section 3)
export function discoverPersonalPatterns(entries: DiaryEntry[]): PersonalPattern[] {
  if (entries.length === 0) return [];

  // Track term occurrence across entries
  const termEntryMap = new Map<string, Set<string>>();
  const entryDateMap = new Map<string, string>();
  const entryObjectMap = new Map<string, DiaryEntry>();

  entries.forEach((e) => {
    entryDateMap.set(e.id, e.entryDate);
    entryObjectMap.set(e.id, e);

    // 1. Include explicit tags first
    e.tags.forEach((t) => {
      const clean = t.trim().toLowerCase();
      if (clean && clean.length > 2) {
        const set = termEntryMap.get(clean) || new Set();
        set.add(e.id);
        termEntryMap.set(clean, set);
      }
    });

    // 2. Extract notable words from title and body
    const text = `${e.title || ""} ${e.content || ""}`.toLowerCase();
    const tokens = text
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !REFLECTION_STOP_WORDS.has(w));

    tokens.forEach((word) => {
      const set = termEntryMap.get(word) || new Set();
      set.add(e.id);
      termEntryMap.set(word, set);
    });
  });

  const patterns: PersonalPattern[] = [];

  for (const [topic, entryIdSet] of termEntryMap.entries()) {
    const count = entryIdSet.size;
    // We only highlight topics that appear in at least 2 entries or explicit tags
    if (count < 2) continue;

    const matchedEntries = Array.from(entryIdSet)
      .map((id) => entryObjectMap.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate));

    const dates = matchedEntries.map((e) => e.entryDate);
    const firstSeen = dates[dates.length - 1];
    const lastSeen = dates[0];

    // Frequency classification without emotional judgment (Section 3)
    let frequency: "frequent" | "occasional" | "emerging" = "emerging";
    let desc = "";

    if (count >= 5) {
      frequency = "frequent";
      desc = `You've mentioned "${topic}" across ${count} entries.`;
    } else if (count >= 3) {
      frequency = "occasional";
      desc = `You've noted "${topic}" in several distinct entries.`;
    } else {
      frequency = "emerging";
      desc = `"${topic}" appears in a few recent reflections.`;
    }

    const excerpts: EvidenceItem[] = matchedEntries.slice(0, 3).map((e) => ({
      entryId: e.id,
      entryDate: e.entryDate,
      title: deriveDisplayTitle(e.title, e.content),
      excerpt: createExcerptForTerm(e.content, topic),
    }));

    patterns.push({
      topic,
      frequency,
      mentionCount: count,
      firstSeen,
      lastSeen,
      excerpts,
      description: desc,
    });
  }

  // Sort by mention count descending
  return patterns.sort((a, b) => b.mentionCount - a.mentionCount).slice(0, 10);
}

// 4. Memory Connections Engine (Section 7)
export function discoverMemoryConnections(entries: DiaryEntry[]): MemoryConnection[] {
  if (entries.length < 2) return [];

  const dismissed = getDismissedConnectionIds();
  const connections: MemoryConnection[] = [];

  // Sort entries chronologically
  const sorted = [...entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];

      // Must be at least 5 days apart to represent meaningful recurring memory
      const daysDiff = Math.abs(
        (new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()) / (1000 * 3600 * 24)
      );
      if (daysDiff < 5) continue;

      const connectionId = `conn_${a.id}_${b.id}`;
      if (dismissed.has(connectionId)) continue;

      // 1. Shared tags check
      const sharedTags = a.tags.filter((t) =>
        b.tags.some((bt) => bt.toLowerCase() === t.toLowerCase())
      );

      if (sharedTags.length > 0) {
        const theme = sharedTags[0];
        connections.push({
          id: connectionId,
          theme: `#${theme}`,
          confidence: "observed connection",
          explanation: `Both entries share the tag #${theme}, recorded ${Math.round(
            daysDiff
          )} days apart.`,
          entryA: {
            entryId: a.id,
            entryDate: a.entryDate,
            title: deriveDisplayTitle(a.title, a.content),
            excerpt: createExcerptForTerm(a.content, theme),
          },
          entryB: {
            entryId: b.id,
            entryDate: b.entryDate,
            title: deriveDisplayTitle(b.title, b.content),
            excerpt: createExcerptForTerm(b.content, theme),
          },
        });
        continue;
      }

      // 2. Shared distinct words in title or content
      const wordsA = new Set(
        `${a.title || ""} ${a.content}`
          .toLowerCase()
          .replace(/[^\w\s-]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length >= 5 && !REFLECTION_STOP_WORDS.has(w))
      );

      const wordsB = `${b.title || ""} ${b.content}`
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 5 && !REFLECTION_STOP_WORDS.has(w));

      const shared = Array.from(new Set(wordsB.filter((w) => wordsA.has(w))));

      if (shared.length >= 2) {
        const primaryTerm = shared[0];
        connections.push({
          id: connectionId,
          theme: primaryTerm,
          confidence: "tentative thematic link",
          explanation: `Both reflections mention recurring ideas related to "${shared
            .slice(0, 2)
            .join('" and "')}".`,
          entryA: {
            entryId: a.id,
            entryDate: a.entryDate,
            title: deriveDisplayTitle(a.title, a.content),
            excerpt: createExcerptForTerm(a.content, primaryTerm),
          },
          entryB: {
            entryId: b.id,
            entryDate: b.entryDate,
            title: deriveDisplayTitle(b.title, b.content),
            excerpt: createExcerptForTerm(b.content, primaryTerm),
          },
        });
      }
    }
  }

  return connections.slice(0, 6);
}

export function dismissMemoryConnection(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISMISSED_CONNECTIONS);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!parsed.includes(id)) {
      parsed.push(id);
      localStorage.setItem(STORAGE_KEY_DISMISSED_CONNECTIONS, JSON.stringify(parsed));
    }
  } catch (err) {
    console.error("Failed to dismiss connection:", err);
  }
}

export function getDismissedConnectionIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISMISSED_CONNECTIONS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

// 5. Changing Perspectives Comparison (Section 5)
export function analyzeChangingPerspectives(
  topic: string,
  entries: DiaryEntry[],
  periodA: { label: string; start: string; end: string },
  periodB: { label: string; start: string; end: string }
): StructuredReflection {
  const cleanTopic = topic.trim().toLowerCase();

  const entriesA = entries.filter(
    (e) =>
      e.entryDate >= periodA.start &&
      e.entryDate <= periodA.end &&
      `${e.title} ${e.content} ${e.tags.join(" ")}`.toLowerCase().includes(cleanTopic)
  );

  const entriesB = entries.filter(
    (e) =>
      e.entryDate >= periodB.start &&
      e.entryDate <= periodB.end &&
      `${e.title} ${e.content} ${e.tags.join(" ")}`.toLowerCase().includes(cleanTopic)
  );

  const evidence: EvidenceItem[] = [
    ...entriesA.slice(0, 3).map((e) => ({
      entryId: e.id,
      entryDate: e.entryDate,
      title: deriveDisplayTitle(e.title, e.content),
      excerpt: createExcerptForTerm(e.content, cleanTopic),
    })),
    ...entriesB.slice(0, 3).map((e) => ({
      entryId: e.id,
      entryDate: e.entryDate,
      title: deriveDisplayTitle(e.title, e.content),
      excerpt: createExcerptForTerm(e.content, cleanTopic),
    })),
  ];

  if (entriesA.length === 0 && entriesB.length === 0) {
    return {
      summary: `No entries discussing "${topic}" were recorded during either ${periodA.label} or ${periodB.label}.`,
      observations: [
        "Your diary does not contain explicit records for this subject across either selected period.",
      ],
      evidence: [],
      limitations: "Available entries do not establish user thoughts on this subject during these dates.",
      reflectionQuestions: [
        `Would you like to write a new reflection tonight on what "${topic}" means to you right now?`,
      ],
    };
  }

  const observations: string[] = [];

  if (entriesA.length > 0) {
    const datesA = entriesA.map((e) => e.entryDate).join(", ");
    observations.push(
      `During ${periodA.label}, you noted "${cleanTopic}" in ${entriesA.length} entry (${datesA}).`
    );
  } else {
    observations.push(`During ${periodA.label}, no mentions of "${cleanTopic}" were recorded.`);
  }

  if (entriesB.length > 0) {
    const datesB = entriesB.map((e) => e.entryDate).join(", ");
    observations.push(
      `In ${periodB.label}, your writing mentions "${cleanTopic}" across ${entriesB.length} entry (${datesB}).`
    );
  } else {
    observations.push(`In ${periodB.label}, no mentions of "${cleanTopic}" were recorded.`);
  }

  observations.push(
    `This represents what was explicitly documented. Tone or emphasis may reflect differing contexts between ${periodA.label} and ${periodB.label}.`
  );

  return {
    summary: `Comparison of recorded thoughts regarding "${topic}" between ${periodA.label} and ${periodB.label}.`,
    observations,
    evidence,
    limitations:
      "This comparison reflects only what you explicitly wrote down, not your entire internal thoughts or changes outside the diary.",
    reflectionQuestions: [
      `When you look at what you wrote in ${periodA.label} versus ${periodB.label}, does the change feel natural or surprising?`,
      `Is there an aspect of "${topic}" you haven't mentioned in your recent entries that you want to revisit?`,
    ],
  };
}

// 6. Monthly Reflection Builder (Section 6)
export function generateMonthlyReflection(
  yearMonth: string, // YYYY-MM
  entries: DiaryEntry[]
): MonthlyReflectionData {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthLabel = `${monthNames[monthIdx] || "Selected Month"} ${year}`;

  const monthEntries = entries
    .filter((e) => e.entryDate.startsWith(yearMonth))
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate));

  if (monthEntries.length === 0) {
    return {
      monthKey: yearMonth,
      monthLabel,
      entryCount: 0,
      summary: `No reflections were recorded in your sanctuary during ${monthLabel}.`,
      topics: [],
      memorableMoments: [],
      repeatedInterests: [],
      questionsToRevisit: [
        `Looking back at ${monthLabel}, what is one memory from that time you would like to preserve now?`,
      ],
      evidence: [],
    };
  }

  // Count topic frequencies
  const topicCounts = new Map<string, number>();
  monthEntries.forEach((e) => {
    e.tags.forEach((t) => {
      const clean = t.trim().toLowerCase();
      if (clean) topicCounts.set(clean, (topicCounts.get(clean) || 0) + 1);
    });

    const words = `${e.title || ""} ${e.content}`
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !REFLECTION_STOP_WORDS.has(w));

    words.forEach((w) => {
      topicCounts.set(w, (topicCounts.get(w) || 0) + 1);
    });
  });

  const sortedTopics = Array.from(topicCounts.entries())
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const memorableMoments: EvidenceItem[] = monthEntries.slice(0, 4).map((e) => ({
    entryId: e.id,
    entryDate: e.entryDate,
    title: deriveDisplayTitle(e.title, e.content),
    excerpt: e.content.length > 160 ? `${e.content.substring(0, 157)}...` : e.content,
  }));

  const repeatedInterests = sortedTopics
    .filter((t) => t.count >= 2)
    .map((t) => t.topic);

  let summary = "";
  if (monthEntries.length === 1) {
    summary = `You recorded 1 quiet reflection during ${monthLabel}. Because only one memory is documented, the system does not infer broader monthly trends.`;
  } else {
    summary = `You preserved ${monthEntries.length} memories throughout ${monthLabel}, touching upon subjects such as ${sortedTopics
      .slice(0, 3)
      .map((t) => `"${t.topic}"`)
      .join(", ")}.`;
  }

  return {
    monthKey: yearMonth,
    monthLabel,
    entryCount: monthEntries.length,
    summary,
    topics: sortedTopics,
    memorableMoments,
    repeatedInterests,
    questionsToRevisit: [
      `What was taking up most of your quiet attention during ${monthLabel}?`,
      `Did anything you wrote about in ${monthLabel} turn out differently than you expected?`,
    ],
    evidence: memorableMoments,
  };
}

// 7. Saved Reflections Storage (Section 11)
export function getLocalSavedReflections(): SavedReflection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_REFLECTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to load saved reflections:", err);
    return [];
  }
}

export function saveLocalReflection(reflection: SavedReflection): SavedReflection[] {
  if (typeof window === "undefined") return [];
  try {
    const list = getLocalSavedReflections();
    const updated = [reflection, ...list.filter((r) => r.id !== reflection.id)];
    localStorage.setItem(STORAGE_KEY_SAVED_REFLECTIONS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Failed to save reflection:", err);
    return [];
  }
}

export function removeLocalReflection(id: string): SavedReflection[] {
  if (typeof window === "undefined") return [];
  try {
    const list = getLocalSavedReflections();
    const filtered = list.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY_SAVED_REFLECTIONS, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.error("Failed to delete reflection:", err);
    return [];
  }
}

