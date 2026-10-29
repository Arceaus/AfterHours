import { DiaryEntry } from "@/types/entry";
import { IEntryRepository } from "./types";
import {
  getSavedEntries,
  getEntryById,
  persistEntry,
  removeEntry,
  getAllUniqueTags,
} from "@/lib/storage";

export class LocalEntryRepository implements IEntryRepository {
  async listEntries(): Promise<DiaryEntry[]> {
    return getSavedEntries();
  }

  async getEntry(id: string): Promise<DiaryEntry | null> {
    return getEntryById(id);
  }

  async saveEntry(entry: DiaryEntry): Promise<DiaryEntry> {
    persistEntry(entry);
    return entry;
  }

  async deleteEntry(id: string): Promise<void> {
    removeEntry(id);
  }

  async getAllTags(): Promise<string[]> {
    return getAllUniqueTags();
  }
}

