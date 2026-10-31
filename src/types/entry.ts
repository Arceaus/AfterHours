export type NavView = 'tonight' | 'archive' | 'calendar' | 'capsules' | 'letters' | 'reflection';

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

// Phase 7: AI Personal Reflection Engine Types
export type ReflectionType = 'question' | 'perspective' | 'monthly' | 'pattern' | 'connection';

export interface EvidenceItem {
  entryId: string;
  entryDate: string;
  title?: string;
  excerpt: string;
}

export interface StructuredReflection {
  summary: string;
  observations: string[];
  evidence: EvidenceItem[];
  limitations: string;
  reflectionQuestions: string[];
}

export interface SavedReflection {
  id: string;
  createdAt: string; // ISO 8601
  type: ReflectionType;
  title: string;
  query?: string;
  dateRange?: {
    start?: string;
    end?: string;
    label?: string;
  };
  reflection: StructuredReflection;
  referencedEntryIds: string[];
  usedAI: boolean;
}

export interface PersonalPattern {
  topic: string;
  frequency: 'frequent' | 'occasional' | 'emerging';
  mentionCount: number;
  firstSeen: string; // YYYY-MM-DD
  lastSeen: string;  // YYYY-MM-DD
  excerpts: EvidenceItem[];
  description: string;
}

export interface MemoryConnection {
  id: string;
  entryA: EvidenceItem;
  entryB: EvidenceItem;
  explanation: string;
  confidence: 'observed connection' | 'tentative thematic link';
  theme: string;
  dismissed?: boolean;
}

export interface MonthlyReflectionData {
  monthKey: string; // YYYY-MM
  monthLabel: string;
  entryCount: number;
  summary: string;
  topics: { topic: string; count: number }[];
  memorableMoments: EvidenceItem[];
  repeatedInterests: string[];
  questionsToRevisit: string[];
  evidence: EvidenceItem[];
}

