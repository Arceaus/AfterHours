import { SupabaseClient } from "@supabase/supabase-js";
import {
  MemoryEntity,
  MemoryMention,
  UniverseConnection,
  MeaningfulMoment,
  EntityType,
  ConfirmationStatus,
  ConnectionOrigin,
  ConnectionStatus,
  EvidenceItem,
} from "@/types/entry";
import { IUniverseRepository } from "./types";
import { LocalUniverseRepository } from "./localUniverseRepository";

interface DBEntityRow {
  id: string;
  user_id: string;
  entity_type: EntityType;
  display_name: string;
  normalized_name: string;
  confirmation_status: ConfirmationStatus;
  relationship_label?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface DBMentionRow {
  id: string;
  user_id: string;
  entry_id: string;
  entity_id: string;
  original_text: string;
  excerpt?: string | null;
  confidence: number;
  confirmation_status: ConfirmationStatus;
  created_at: string;
}

interface DBConnectionRow {
  id: string;
  user_id: string;
  source_entry_id: string;
  target_entry_id: string;
  connection_type: string;
  explanation: string;
  supporting_evidence: EvidenceItem[];
  origin: ConnectionOrigin;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

interface DBMomentRow {
  id: string;
  user_id: string;
  entry_id: string;
  note?: string | null;
  created_at: string;
}

function mapRowToEntity(row: DBEntityRow): MemoryEntity {
  return {
    id: row.id,
    userId: row.user_id,
    entityType: row.entity_type,
    displayName: row.display_name,
    normalizedName: row.normalized_name,
    confirmationStatus: row.confirmation_status,
    relationshipLabel: row.relationship_label || undefined,
    metadata: row.metadata || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToMention(row: DBMentionRow): MemoryMention {
  return {
    id: row.id,
    userId: row.user_id,
    entryId: row.entry_id,
    entityId: row.entity_id,
    originalText: row.original_text,
    excerpt: row.excerpt || undefined,
    confidence: row.confidence,
    confirmationStatus: row.confirmation_status,
    createdAt: row.created_at,
  };
}

function mapRowToConnection(row: DBConnectionRow): UniverseConnection {
  return {
    id: row.id,
    userId: row.user_id,
    sourceEntryId: row.source_entry_id,
    targetEntryId: row.target_entry_id,
    connectionType: row.connection_type,
    explanation: row.explanation,
    supportingEvidence: row.supporting_evidence || [],
    origin: row.origin,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToMoment(row: DBMomentRow): MeaningfulMoment {
  return {
    id: row.id,
    userId: row.user_id,
    entryId: row.entry_id,
    note: row.note || undefined,
    createdAt: row.created_at,
  };
}

export class SupabaseUniverseRepository implements IUniverseRepository {
  private client: SupabaseClient;
  private userId: string;
  private localFallback = new LocalUniverseRepository();

  constructor(client: SupabaseClient, userId: string) {
    this.client = client;
    this.userId = userId;
  }

  async listEntities(): Promise<MemoryEntity[]> {
    const { data, error } = await this.client
      .from("memory_entities")
      .select("*")
      .eq("user_id", this.userId)
      .order("updated_at", { ascending: false });

    if (error) {
      if (error.message.includes("Could not find the table") || error.code === "PGRST205" || error.code === "42P01") {
        console.warn("Supabase 'memory_entities' table not yet present. Using local fallback.");
        return this.localFallback.listEntities();
      }
      console.warn("SupabaseUniverseRepository: listEntities error", error.message);
      return this.localFallback.listEntities();
    }

    return ((data as DBEntityRow[]) || []).map(mapRowToEntity);
  }

  async saveEntity(entity: MemoryEntity): Promise<MemoryEntity> {
    const payload = {
      id: entity.id,
      user_id: this.userId,
      entity_type: entity.entityType,
      display_name: entity.displayName,
      normalized_name: entity.normalizedName,
      confirmation_status: entity.confirmationStatus,
      relationship_label: entity.relationshipLabel || null,
      metadata: entity.metadata || {},
      created_at: entity.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from("memory_entities")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.warn("Supabase saveEntity fallback to local", error.message);
      return this.localFallback.saveEntity(entity);
    }

    return mapRowToEntity(data as DBEntityRow);
  }

  async deleteEntity(id: string): Promise<void> {
    const { error } = await this.client
      .from("memory_entities")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) {
      console.warn("Supabase deleteEntity fallback to local", error.message);
      await this.localFallback.deleteEntity(id);
    }
  }

  async listMentions(entryId?: string): Promise<MemoryMention[]> {
    let query = this.client
      .from("memory_mentions")
      .select("*")
      .eq("user_id", this.userId);

    if (entryId) {
      query = query.eq("entry_id", entryId);
    }

    const { data, error } = await query;
    if (error) {
      return this.localFallback.listMentions(entryId);
    }

    return ((data as DBMentionRow[]) || []).map(mapRowToMention);
  }

  async saveMention(mention: MemoryMention): Promise<MemoryMention> {
    const payload = {
      id: mention.id,
      user_id: this.userId,
      entry_id: mention.entryId,
      entity_id: mention.entityId,
      original_text: mention.originalText,
      excerpt: mention.excerpt || null,
      confidence: mention.confidence,
      confirmation_status: mention.confirmationStatus,
      created_at: mention.createdAt || new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from("memory_mentions")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      return this.localFallback.saveMention(mention);
    }

    return mapRowToMention(data as DBMentionRow);
  }

  async deleteMention(id: string): Promise<void> {
    await this.client
      .from("memory_mentions")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);
  }

  async listConnections(): Promise<UniverseConnection[]> {
    const { data, error } = await this.client
      .from("memory_connections")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return this.localFallback.listConnections();
    }

    return ((data as DBConnectionRow[]) || []).map(mapRowToConnection);
  }

  async saveConnection(connection: UniverseConnection): Promise<UniverseConnection> {
    const payload = {
      id: connection.id,
      user_id: this.userId,
      source_entry_id: connection.sourceEntryId,
      target_entry_id: connection.targetEntryId,
      connection_type: connection.connectionType,
      explanation: connection.explanation,
      supporting_evidence: connection.supportingEvidence || [],
      origin: connection.origin,
      status: connection.status,
      created_at: connection.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from("memory_connections")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      return this.localFallback.saveConnection(connection);
    }

    return mapRowToConnection(data as DBConnectionRow);
  }

  async deleteConnection(id: string): Promise<void> {
    const { error } = await this.client
      .from("memory_connections")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId);

    if (error) {
      await this.localFallback.deleteConnection(id);
    }
  }

  async listMeaningfulMoments(): Promise<MeaningfulMoment[]> {
    const { data, error } = await this.client
      .from("meaningful_moments")
      .select("*")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return this.localFallback.listMeaningfulMoments();
    }

    return ((data as DBMomentRow[]) || []).map(mapRowToMoment);
  }

  async toggleMeaningfulMoment(entryId: string, note?: string): Promise<boolean> {
    // Check if exists
    const { data, error } = await this.client
      .from("meaningful_moments")
      .select("id")
      .eq("user_id", this.userId)
      .eq("entry_id", entryId)
      .maybeSingle();

    if (error && (error.code === "PGRST205" || error.message.includes("Could not find the table"))) {
      return this.localFallback.toggleMeaningfulMoment(entryId, note);
    }

    if (data && data.id) {
      // Delete
      await this.client
        .from("meaningful_moments")
        .delete()
        .eq("id", data.id)
        .eq("user_id", this.userId);
      return false;
    } else {
      // Insert
      const payload = {
        id: `moment_${entryId}_${Date.now()}`,
        user_id: this.userId,
        entry_id: entryId,
        note: note || null,
        created_at: new Date().toISOString(),
      };
      await this.client.from("meaningful_moments").insert(payload);
      return true;
    }
  }
}

