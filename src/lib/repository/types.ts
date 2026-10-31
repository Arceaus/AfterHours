import { DiaryEntry, FutureLetter, SavedReflection, MemoryEntity, MemoryMention, UniverseConnection, MeaningfulMoment, MemoryAttachment } from "@/types/entry";

export interface IEntryRepository {
  listEntries(): Promise<DiaryEntry[]>;
  getEntry(id: string): Promise<DiaryEntry | null>;
  saveEntry(entry: DiaryEntry): Promise<DiaryEntry>;
  deleteEntry(id: string): Promise<void>;
  getAllTags(): Promise<string[]>;
  listAttachments?(entryId: string): Promise<MemoryAttachment[]>;
  saveAttachment?(entryId: string, file: File): Promise<MemoryAttachment>;
  deleteAttachment?(attachmentId: string, storagePath?: string): Promise<void>;
}

export interface IFutureLetterRepository {
  listLetters(): Promise<FutureLetter[]>;
  getLetter(id: string): Promise<FutureLetter | null>;
  saveLetter(letter: FutureLetter): Promise<FutureLetter>;
  deleteLetter(id: string): Promise<void>;
  openLetter(id: string): Promise<FutureLetter | null>;
  unsealLetter(id: string): Promise<FutureLetter | null>;
}

export interface IReflectionRepository {
  listReflections(): Promise<SavedReflection[]>;
  saveReflection(reflection: SavedReflection): Promise<SavedReflection>;
  deleteReflection(id: string): Promise<void>;
}

export interface IUniverseRepository {
  listEntities(): Promise<MemoryEntity[]>;
  saveEntity(entity: MemoryEntity): Promise<MemoryEntity>;
  deleteEntity(id: string): Promise<void>;
  listMentions(entryId?: string): Promise<MemoryMention[]>;
  saveMention(mention: MemoryMention): Promise<MemoryMention>;
  deleteMention(id: string): Promise<void>;
  listConnections(): Promise<UniverseConnection[]>;
  saveConnection(connection: UniverseConnection): Promise<UniverseConnection>;
  deleteConnection(id: string): Promise<void>;
  listMeaningfulMoments(): Promise<MeaningfulMoment[]>;
  toggleMeaningfulMoment(entryId: string, note?: string): Promise<boolean>;
}

export interface MigrationSummary {
  localEntriesCount: number;
  localLettersCount: number;
  migratedEntries: number;
  migratedLetters: number;
  errors: string[];
}


