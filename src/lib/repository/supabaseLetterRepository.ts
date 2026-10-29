import { SupabaseClient } from "@supabase/supabase-js";
import { FutureLetter, LetterStatus } from "@/types/entry";
import { IFutureLetterRepository } from "./types";

interface DBLetterRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  scheduled_open_at: string;
  opened_at: string | null;
  status: string;
}

function mapRowToLetter(row: DBLetterRow): FutureLetter {
  return {
    id: row.id,
    title: row.title || "",
    content: row.content || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scheduledOpenAt: row.scheduled_open_at,
    openedAt: row.opened_at || null,
    status: (row.status as LetterStatus) || "sealed",
  };
}

export class SupabaseLetterRepository implements IFutureLetterRepository {
  private client: SupabaseClient;
  private userId: string;

  constructor(client: SupabaseClient, userId: string) {
    this.client = client;
    this.userId = userId;
  }

  async listLetters(): Promise<FutureLetter[]> {
    const { data, error } = await this.client
      .from("future_letters")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("SupabaseLetterRepository: listLetters error", error.message);
      throw new Error(`Failed to load letters from cloud: ${error.message}`);
    }

    return (data as DBLetterRow[] || []).map(mapRowToLetter);
  }

  async getLetter(id: string): Promise<FutureLetter | null> {
    const { data, error } = await this.client
      .from("future_letters")
      .select("*")
      .eq("id", id)
      .eq("user_id", this.userId)
      .maybeSingle();

    if (error) {
      console.error("SupabaseLetterRepository: getLetter error", error.message);
      throw new Error(`Failed to load letter from cloud: ${error.message}`);
    }

    return data ? mapRowToLetter(data as DBLetterRow) : null;
  }

  async saveLetter(letter: FutureLetter): Promise<FutureLetter> {
    const nowISO = new Date().toISOString();
    const existing = await this.getLetter(letter.id);

    const payload = {
      id: letter.id,
      user_id: this.userId,
      title: letter.title || "",
      content: letter.content || "",
      created_at: existing?.createdAt || letter.createdAt || nowISO,
      updated_at: nowISO,
      scheduled_open_at: letter.scheduledOpenAt,
      opened_at: letter.openedAt || null,
      status: letter.status || "sealed",
    };

    const { data, error } = await this.client
      .from("future_letters")
      .upsert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("SupabaseLetterRepository: saveLetter error", error.message);
      throw new Error(`Cloud save failed for letter: ${error.message}`);
    }

    return mapRowToLetter(data as DBLetterRow);
  }

  async deleteLetter(id: string): Promise<void> {
    const { error } = await this.client
      .from("future_letters")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) {
      console.error("SupabaseLetterRepository: deleteLetter error", error.message);
      throw new Error(`Failed to delete letter from cloud: ${error.message}`);
    }
  }

  async openLetter(id: string): Promise<FutureLetter | null> {
    const letter = await this.getLetter(id);
    if (!letter) return null;

    const nowISO = new Date().toISOString();
    const updated: FutureLetter = {
      ...letter,
      status: "opened",
      openedAt: letter.openedAt || nowISO,
      updatedAt: nowISO,
    };

    return this.saveLetter(updated);
  }

  async unsealLetter(id: string): Promise<FutureLetter | null> {
    const letter = await this.getLetter(id);
    if (!letter) return null;

    const updated: FutureLetter = {
      ...letter,
      status: "draft",
      updatedAt: new Date().toISOString(),
    };

    return this.saveLetter(updated);
  }
}

