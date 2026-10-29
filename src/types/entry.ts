export type NavView = 'tonight' | 'archive' | 'calendar' | 'capsules' | 'letters';

export interface DiaryEntry {
  id: string;
  title?: string;
  content: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  entryDate: string; // YYYY-MM-DD local calendar date
  tags: string[];
  attachments: string[]; // reserved for future attachment functionality
}

export interface DraftState {
  entryId?: string | null; // if editing an existing entry, its id; if null, a new draft
  title: string;
  content: string;
  entryDate: string; // YYYY-MM-DD
  tags: string[];
  updatedAt: string; // ISO 8601
}

export interface MemoryOverviewStats {
  totalEntries: number;
  earliestEntryDate: string | null;
  latestEntryDate: string | null;
  distinctDatesCount: number;
  topTags: { tag: string; count: number }[];
}

// Time Capsules & Retrieval Types
export interface RetrievalResult {
  entry: DiaryEntry;
  score: number;
  matchReasons: string[];
  excerpt: string;
  isEarliest?: boolean;
  isLatest?: boolean;
}

export interface ParsedQuery {
  rawQuery: string;
  cleanKeywords: string[];
  exactPhrases: string[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  targetMonth?: string; // YYYY-MM
  targetYear?: number;
  isEarliestRequest?: boolean;
  isLatestRequest?: boolean;
  filterTags: string[];
  dateExplanation?: string;
}

export interface CapsuleResponse {
  query: ParsedQuery;
  results: RetrievalResult[];
  synthesis: string;
  usedAI: boolean;
  aiError?: string;
}

// Letters to Your Future Self Types
export type LetterStatus = 'draft' | 'sealed' | 'opened' | 'cancelled';
export type EffectiveLetterStatus = 'draft' | 'sealed' | 'ready' | 'opened' | 'cancelled';

export interface FutureLetter {
  id: string;
  title?: string;
  content: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  scheduledOpenAt: string; // YYYY-MM-DD
  openedAt?: string | null; // ISO 8601
  status: LetterStatus;
}

export interface FutureLetterDraft {
  id?: string | null;
  title: string;
  content: string;
  scheduledOpenAt: string; // YYYY-MM-DD
  updatedAt: string; // ISO 8601
}
