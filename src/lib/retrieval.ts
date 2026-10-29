import { DiaryEntry, ParsedQuery, RetrievalResult } from "@/types/entry";
import {
  getLocalCalendarDate,
  formatLocalCalendarDate,
  getLastMonthRange,
  getMonthsAgoRange,
  getLastYearRange,
  getSameTimeLastYearRange,
  getMonthRangeByName,
  MONTH_NAMES,
  deriveDisplayTitle,
} from "./date";

// Common stop words to exclude from keyword extraction
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
  "during", "each", "few", "find", "for", "from", "further", "had", "hadn't",
  "has", "hasn't", "have", "haven't", "having", "he", "her", "here", "hers",
  "herself", "him", "himself", "his", "how", "i", "i'd", "i'll", "i'm", "i've",
  "if", "in", "into", "is", "isn't", "it", "its", "itself", "let's", "me",
  "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
  "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over",
  "own", "same", "she", "should", "shouldn't", "show", "so", "some", "such",
  "tell", "than", "that", "the", "their", "theirs", "them", "themselves", "then",
  "there", "these", "they", "this", "those", "through", "to", "too", "under",
  "until", "up", "very", "was", "wasn't", "we", "were", "weren't", "what",
  "when", "where", "which", "while", "who", "whom", "why", "with", "won't",
  "would", "wouldn't", "you", "your", "yours", "yourself", "yourselves",
  "entries", "entry", "wrote", "written", "memory", "memories", "thought", "thoughts",
  "mention", "mentioned", "mentions", "look", "looking", "remember", "remembering"
]);

// Parse a natural language user query into semantic keywords and date ranges
export function parseNaturalQuery(rawQuery: string, refDate: Date = new Date()): ParsedQuery {
  const query = rawQuery.trim();
  let workingText = query.toLowerCase();

  let startDate: string | undefined;
  let endDate: string | undefined;
  let dateExplanation: string | undefined;
  let isEarliestRequest = false;
  let isLatestRequest = false;

  // 1. Detect earliest / latest / first mention requests
  if (
    /\b(earliest|first mention|when did i first|first wrote|first time)\b/i.test(workingText)
  ) {
    isEarliestRequest = true;
    workingText = workingText.replace(
      /\b(earliest|first mention of|when did i first|first wrote about|first time)\b/gi,
      ""
    );
  } else if (
    /\b(most recent|latest|last entry|newest)\b/i.test(workingText)
  ) {
    isLatestRequest = true;
    workingText = workingText.replace(/\b(most recent|latest|last entry|newest)\b/gi, "");
  }

  // 2. Relative dates: "this time last year" / "around this time last year"
  if (/\b(this time last year|around this time last year|same time last year)\b/i.test(workingText)) {
    const range = getSameTimeLastYearRange(25, refDate);
    startDate = range.startDate;
    endDate = range.endDate;
    dateExplanation = range.label;
    workingText = workingText.replace(/\b(around )?(this|same) time last year\b/gi, "");
  }
  // 3. "six months ago" / "N months ago"
  else if (/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+months ago\b/i.test(workingText)) {
    const match = workingText.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s+months ago\b/i);
    if (match) {
      const wordMap: Record<string, number> = {
        one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
        seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12,
      };
      const count = parseInt(match[1], 10) || wordMap[match[1]] || 6;
      const range = getMonthsAgoRange(count, refDate);
      startDate = range.startDate;
      endDate = range.endDate;
      dateExplanation = range.label;
      workingText = workingText.replace(match[0], "");
    }
  }
  // 4. "last month"
  else if (/\blast month\b/i.test(workingText)) {
    const range = getLastMonthRange(refDate);
    startDate = range.startDate;
    endDate = range.endDate;
    dateExplanation = range.label;
    workingText = workingText.replace(/\blast month\b/gi, "");
  }
  // 5. "last year"
  else if (/\blast year\b/i.test(workingText)) {
    const range = getLastYearRange(refDate);
    startDate = range.startDate;
    endDate = range.endDate;
    dateExplanation = range.label;
    workingText = workingText.replace(/\blast year\b/gi, "");
  }
  // 6. "in October" / "during October" / Month detection
  else {
    const monthPattern = new RegExp(`\\b(in|during|for)?\\s*(${MONTH_NAMES.join("|")})\\s*(\\d{4})?\\b`, "i");
    const mMatch = workingText.match(monthPattern);
    if (mMatch) {
      const monthWord = mMatch[2];
      const yearPart = mMatch[3] ? parseInt(mMatch[3], 10) : undefined;
      const range = getMonthRangeByName(monthWord, yearPart, refDate);
      if (range) {
        startDate = range.startDate;
        endDate = range.endDate;
        dateExplanation = range.label;
        workingText = workingText.replace(mMatch[0], "");
      }
    }
  }

  // 7. Extract exact phrases in quotes: "..."
  const exactPhrases: string[] = [];
  const phraseRegex = /"([^"]+)"/g;
  let pMatch;
  while ((pMatch = phraseRegex.exec(query)) !== null) {
    if (pMatch[1].trim()) {
      exactPhrases.push(pMatch[1].trim().toLowerCase());
    }
  }

  // 8. Extract tags (e.g. #college)
  const filterTags: string[] = [];
  const tagRegex = /#([a-zA-Z0-9_\-]+)/g;
  let tMatch;
  while ((tMatch = tagRegex.exec(query)) !== null) {
    filterTags.push(tMatch[1].toLowerCase());
  }

  // 9. Clean remaining keywords
  const cleanedTokens = workingText
    .replace(/["#]/g, " ")
    .replace(/[^\w\s-]/g, "")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  return {
    rawQuery: query,
    cleanKeywords: cleanedTokens,
    exactPhrases,
    startDate,
    endDate,
    dateExplanation,
    isEarliestRequest,
    isLatestRequest,
    filterTags,
  };
}

// Extract a concise, grounded excerpt surrounding keyword matches
export function createExcerpt(content: string, keywords: string[]): string {
  if (!content) return "";
  const trimmed = content.trim();
  if (keywords.length === 0) {
    return trimmed.length > 220 ? `${trimmed.substring(0, 217)}...` : trimmed;
  }

  const lower = trimmed.toLowerCase();
  let bestPos = -1;

  for (const kw of keywords) {
    const idx = lower.indexOf(kw.toLowerCase());
    if (idx !== -1) {
      bestPos = idx;
      break;
    }
  }

  if (bestPos === -1) {
    return trimmed.length > 220 ? `${trimmed.substring(0, 217)}...` : trimmed;
  }

  const start = Math.max(0, bestPos - 60);
  const end = Math.min(trimmed.length, bestPos + 160);

  let excerpt = trimmed.substring(start, end).trim();
  if (start > 0) excerpt = `...${excerpt}`;
  if (end < trimmed.length) excerpt = `${excerpt}...`;

  return excerpt;
}

// Retrieve relevant diary entries matching a parsed query
export function retrieveEntries(
  rawQuery: string,
  entries: DiaryEntry[],
  refDate: Date = new Date()
): RetrievalResult[] {
  if (entries.length === 0 || !rawQuery.trim()) {
    return [];
  }

  const parsed = parseNaturalQuery(rawQuery, refDate);
  const { cleanKeywords, exactPhrases, startDate, endDate, filterTags, isEarliestRequest, isLatestRequest } = parsed;

  const results: RetrievalResult[] = [];

  for (const entry of entries) {
    // 1. Strict Date Filter check
    if (startDate && entry.entryDate < startDate) continue;
    if (endDate && entry.entryDate > endDate) continue;

    // 2. Strict Tag Filter check (if #tag was in query)
    if (filterTags.length > 0) {
      const entryTagsLower = entry.tags.map((t) => t.toLowerCase());
      const hasAllTags = filterTags.every((t) => entryTagsLower.includes(t));
      if (!hasAllTags) continue;
    }

    const titleLower = (entry.title || "").toLowerCase();
    const contentLower = (entry.content || "").toLowerCase();
    const tagsLower = entry.tags.map((t) => t.toLowerCase());

    let score = 0;
    const matchReasons: string[] = [];

    // Date range match bonus
    if (startDate && endDate) {
      score += 30;
      matchReasons.push("From requested time period");
    }

    // Explicit tag match bonus
    if (filterTags.length > 0) {
      score += 40;
      matchReasons.push(`Matched tag #${filterTags.join(", #")}`);
    }

    // Exact phrase matches
    for (const phrase of exactPhrases) {
      if (titleLower.includes(phrase)) {
        score += 80;
        matchReasons.push(`Exact phrase in title: "${phrase}"`);
      } else if (contentLower.includes(phrase)) {
        score += 50;
        matchReasons.push(`Exact phrase in writing: "${phrase}"`);
      }
    }

    // Keyword matches in title, tags, and body
    let matchedKeywordsCount = 0;
    for (const kw of cleanKeywords) {
      let kwMatched = false;

      // Tag match
      if (tagsLower.some((t) => t === kw || t.includes(kw))) {
        score += 35;
        kwMatched = true;
        matchReasons.push(`Matched tag #${kw}`);
      }

      // Title match
      if (titleLower.includes(kw)) {
        score += 30;
        kwMatched = true;
        matchReasons.push(`Title mentions "${kw}"`);
      }

      // Content match
      if (contentLower.includes(kw)) {
        score += 15;
        kwMatched = true;
      }

      if (kwMatched) {
        matchedKeywordsCount++;
      }
    }

    // If there were keywords or phrases, require at least one match
    if ((cleanKeywords.length > 0 || exactPhrases.length > 0) && score === 0 && matchedKeywordsCount === 0) {
      // If date range was the ONLY query (e.g. "What did I write last month?"), allow all entries from that range
      if (!startDate && !endDate) {
        continue;
      }
    }

    // Deduplicate match reasons
    const uniqueReasons = Array.from(new Set(matchReasons));
    if (uniqueReasons.length === 0) {
      uniqueReasons.push("Recorded reflection");
    }

    const excerpt = createExcerpt(entry.content, [...exactPhrases, ...cleanKeywords]);

    results.push({
      entry,
      score,
      matchReasons: uniqueReasons,
      excerpt,
    });
  }

  if (results.length === 0) {
    return [];
  }

  // Sort results by score descending, then chronologically
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.entry.entryDate.localeCompare(a.entry.entryDate);
  });

  // Handle Earliest / First Mention queries
  if (isEarliestRequest) {
    // Sort chronologically ascending
    results.sort((a, b) => a.entry.entryDate.localeCompare(b.entry.entryDate));
    if (results[0]) {
      results[0].isEarliest = true;
      results[0].matchReasons.unshift("Earliest recorded match");
    }
  } else if (isLatestRequest) {
    // Sort chronologically descending
    results.sort((a, b) => b.entry.entryDate.localeCompare(a.entry.entryDate));
    if (results[0]) {
      results[0].isLatest = true;
      results[0].matchReasons.unshift("Most recent recorded match");
    }
  }

  return results.slice(0, 8); // Sensible limit of top 8 relevant memories
}

// Generate an honest, grounded synthesis from local retrieval without external AI
export function generateLocalSynthesis(parsed: ParsedQuery, results: RetrievalResult[]): string {
  if (results.length === 0) {
    if (parsed.startDate && parsed.endDate) {
      return `No entries were found from ${parsed.dateExplanation || "the requested period"}${
        parsed.cleanKeywords.length > 0 ? ` discussing "${parsed.cleanKeywords.join(" ")}"` : ""
      }. Your thoughts during this time were either unrecorded or focused on other matters.`;
    }
    return `No recorded thoughts matched "${parsed.rawQuery}". Try adjusting your keywords, searching for tags like #${
      parsed.filterTags[0] || "ideas"
    }, or asking about a specific month.`;
  }

  const count = results.length;
  const countStr = count === 1 ? "1 memory" : `${count} memories`;

  if (parsed.isEarliestRequest && results[0]) {
    const first = results[0];
    const dateStr = formatLocalCalendarDate(first.entry.entryDate).fullDate;
    const titleStr = deriveDisplayTitle(first.entry.title, first.entry.content);
    return `Your earliest recorded entry on this subject was written on ${dateStr} ("${titleStr}").`;
  }

  if (parsed.isLatestRequest && results[0]) {
    const latest = results[0];
    const dateStr = formatLocalCalendarDate(latest.entry.entryDate).fullDate;
    const titleStr = deriveDisplayTitle(latest.entry.title, latest.entry.content);
    return `Your most recent entry on this topic was recorded on ${dateStr} ("${titleStr}").`;
  }

  if (parsed.startDate && parsed.endDate) {
    return `Found ${countStr} preserved from ${parsed.dateExplanation || "the requested period"}. Here is what you were thinking about:`;
  }

  return `Found ${countStr} matching your inquiry across your private sanctuary:`;
}
