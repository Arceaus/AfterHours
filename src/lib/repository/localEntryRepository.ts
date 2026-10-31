import { DiaryEntry, MemoryAttachment } from "@/types/entry";
import { IEntryRepository } from "./types";
import {
  getSavedEntries,
  getEntryById,
  persistEntry,
  removeEntry,
  getAllUniqueTags,
} from "@/lib/storage";
import {
  getLocalAttachmentsForEntry,
  saveLocalAttachment,
  deleteLocalAttachment,
  fileToDataUrl,
} from "@/lib/attachments";

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

  async listAttachments(entryId: string): Promise<MemoryAttachment[]> {
    return getLocalAttachmentsForEntry(entryId);
  }

  async saveAttachment(entryId: string, file: File): Promise<MemoryAttachment> {
    const dataUrl = await fileToDataUrl(file);
    const attachment: MemoryAttachment = {
      id: `att_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      entryId,
      storagePath: 'local',
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      url: dataUrl,
      createdAt: new Date().toISOString(),
    };
    await saveLocalAttachment(attachment, dataUrl);
    return attachment;
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    await deleteLocalAttachment(attachmentId);
  }
}
