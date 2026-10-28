export type NavView = 'tonight' | 'archive' | 'calendar' | 'capsules';

export interface EntryDraft {
  id: string;
  title: string;
  content: string;
  date: string; // ISO date string
  lastModified: number;
  wordCount: number;
  readTimeMinutes: number;
}
