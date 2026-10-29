export type NavView = 'tonight' | 'archive' | 'calendar' | 'capsules';

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
