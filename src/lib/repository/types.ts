import { DiaryEntry, FutureLetter } from "@/types/entry";

export interface IEntryRepository {
  listEntries(): Promise<DiaryEntry[]>;
  getEntry(id: string): Promise<DiaryEntry | null>;
  saveEntry(entry: DiaryEntry): Promise<DiaryEntry>;
  deleteEntry(id: string): Promise<void>;
  getAllTags(): Promise<string[]>;
}

export interface IFutureLetterRepository {
  listLetters(): Promise<FutureLetter[]>;
  getLetter(id: string): Promise<FutureLetter | null>;
  saveLetter(letter: FutureLetter): Promise<FutureLetter>;
  deleteLetter(id: string): Promise<void>;
  openLetter(id: string): Promise<FutureLetter | null>;
  unsealLetter(id: string): Promise<FutureLetter | null>;
}

export interface MigrationSummary {
  localEntriesCount: number;
  localLettersCount: number;
  migratedEntries: number;
  migratedLetters: number;
  errors: string[];
}
