import { SupabaseClient } from "@supabase/supabase-js";
import { SavedReflection, StructuredReflection, ReflectionType } from "@/types/entry";
import { IReflectionRepository } from "./types";

interface DBReflectionRow {
  id: string;
  user_id: string;
  created_at: string;
  reflection_type: string;
  title: string;
  query: string;
  date_range_start: string | null;
  date_range_end: string | null;
  content: StructuredReflection;
  referenced_entry_ids: string[];
  used_ai: boolean;
}

function mapRowToReflection(row: DBReflectionRow): SavedReflection {
  return {
    id: row.id,
    createdAt: row.created_at,
    type: (row.reflection_type as ReflectionType) || "question",
    title: row.title || "Quiet Reflection",
    query: row.query || "",
    dateRange:
      row.date_range_start || row.date_range_end
        ? {
            start: row.date_range_start || undefined,
            end: row.date_range_end || undefined,
          }
        : undefined,
    reflection: row.content || {
      summary: "",
      observations: [],
      evidence: [],
      limitations: "",
      reflectionQuestions: [],
    },
    referencedEntryIds: Array.isArray(row.referenced_entry_ids)
      ? row.referenced_entry_ids
      : [],
    usedAI: Boolean(row.used_ai),
  };
}

export class SupabaseReflectionRepository implements IReflectionRepository {
  private client: SupabaseClient;
  private userId: string;

  constructor(client: SupabaseClient, userId: string) {
    this.client = client;
    this.userId = userId;
  }

  async listReflections(): Promise<SavedReflection[]> {
    const { data, error } = await this.client
      .from("reflections")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.message.includes("Could not find the table") || error.code === "PGRST205") {
        console.warn(
          "Supabase 'reflections' table not yet created. Run supabase/migrations/20261031000000_phase7_reflections.sql in Supabase SQL Editor."
        );
      } else {
        console.error("SupabaseReflectionRepository: listReflections error", error.message);
      }
      return [];
    }

    return ((data as DBReflectionRow[]) || []).map(mapRowToReflection);
  }

  async saveReflection(reflection: SavedReflection): Promise<SavedReflection> {
    const payload = {
      id: reflection.id,
      user_id: this.userId,
      created_at: reflection.createdAt,
      reflection_type: reflection.type,
      title: reflection.title,
      query: reflection.query || "",
      date_range_start: reflection.dateRange?.start || null,
      date_range_end: reflection.dateRange?.end || null,
      content: reflection.reflection,
      referenced_entry_ids: reflection.referencedEntryIds || [],
      used_ai: reflection.usedAI,
    };

    const { data, error } = await this.client
      .from("reflections")
      .upsert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("SupabaseReflectionRepository: saveReflection error", error.message);
      throw new Error(`Failed to save reflection to cloud: ${error.message}`);
    }

    return mapRowToReflection(data as DBReflectionRow);
  }

  async deleteReflection(id: string): Promise<void> {
    const { error } = await this.client
      .from("reflections")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) {
      console.error("SupabaseReflectionRepository: deleteReflection error", error.message);
      throw new Error(`Failed to delete reflection from cloud: ${error.message}`);
    }
  }
}

