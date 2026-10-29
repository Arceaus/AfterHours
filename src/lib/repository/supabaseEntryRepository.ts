import { SupabaseClient } from "@supabase/supabase-js";
import { DiaryEntry } from "@/types/entry";
import { IEntryRepository } from "./types";

interface DBEntryRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  entry_date: string;
  tags: string[];
  attachments: string[];
}

function mapRowToEntry(row: DBEntryRow): DiaryEntry {
  return {
    id: row.id,
    title: row.title || "",
    content: row.content || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entryDate: row.entry_date,
    tags: Array.isArray(row.tags) ? row.tags : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  };
}

export class SupabaseEntryRepository implements IEntryRepository {
  private client: SupabaseClient;
  private userId: string;

  constructor(client: SupabaseClient, userId: string) {
    this.client = client;
    this.userId = userId;
  }

  async listEntries(): Promise<DiaryEntry[]> {
    const { data, error } = await this.client
      .from("entries")
      .select("*")
      .eq("user_id", this.userId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("SupabaseEntryRepository: listEntries error", error.message);
      throw new Error(`Failed to load entries from cloud: ${error.message}`);
    }

    return (data as DBEntryRow[] || []).map(mapRowToEntry);
  }

  async getEntry(id: string): Promise<DiaryEntry | null> {
    const { data, error } = await this.client
      .from("entries")
      .select("*")
      .eq("id", id)
      .eq("user_id", this.userId)
      .maybeSingle();

    if (error) {
      console.error("SupabaseEntryRepository: getEntry error", error.message);
      throw new Error(`Failed to load entry from cloud: ${error.message}`);
    }

    return data ? mapRowToEntry(data as DBEntryRow) : null;
  }

  async saveEntry(entry: DiaryEntry): Promise<DiaryEntry> {
    const nowISO = new Date().toISOString();

    // Check if entry already exists remotely to detect conflict
    const existing = await this.getEntry(entry.id);
    if (existing) {
      const remoteUpdated = new Date(existing.updatedAt).getTime();
      const localUpdated = new Date(entry.updatedAt).getTime();
      // If remote has newer update by > 2000ms, prevent silent overwrite
      if (remoteUpdated > localUpdated + 2000) {
        console.warn("Remote conflict detected on entry:", entry.id);
        throw new Error(
          "Conflict detected: This entry was updated on another device more recently. Please reload before saving."
        );
      }
    }

    const payload = {
      id: entry.id,
      user_id: this.userId,
      title: entry.title || "",
      content: entry.content || "",
      created_at: existing?.createdAt || entry.createdAt || nowISO,
      updated_at: nowISO,
      entry_date: entry.entryDate,
      tags: entry.tags || [],
      attachments: entry.attachments || [],
    };

    const { data, error } = await this.client
      .from("entries")
      .upsert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("SupabaseEntryRepository: saveEntry error", error.message);
      throw new Error(`Cloud save failed: ${error.message}`);
    }

    return mapRowToEntry(data as DBEntryRow);
  }

  async deleteEntry(id: string): Promise<void> {
    const { error } = await this.client
      .from("entries")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) {
      console.error("SupabaseEntryRepository: deleteEntry error", error.message);
      throw new Error(`Failed to delete entry from cloud: ${error.message}`);
    }
  }

  async getAllTags(): Promise<string[]> {
    const entries = await this.listEntries();
    const tagSet = new Set<string>();
    entries.forEach((e) => {
      e.tags.forEach((t) => {
        const clean = t.trim();
        if (clean) tagSet.add(clean);
      });
    });
    return Array.from(tagSet).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }
}
