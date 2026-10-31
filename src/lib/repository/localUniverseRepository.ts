import {
  MemoryEntity,
  MemoryMention,
  UniverseConnection,
  MeaningfulMoment,
} from "@/types/entry";
import { IUniverseRepository } from "./types";
import {
  getStoredEntities,
  saveStoredEntities,
  getStoredMentions,
  saveStoredMentions,
  getStoredConnections,
  saveStoredConnections,
  getStoredMeaningfulMoments,
  saveStoredMeaningfulMoments,
} from "@/lib/universe";

export class LocalUniverseRepository implements IUniverseRepository {
  async listEntities(): Promise<MemoryEntity[]> {
    return getStoredEntities();
  }

  async saveEntity(entity: MemoryEntity): Promise<MemoryEntity> {
    const list = getStoredEntities();
    const idx = list.findIndex((e) => e.id === entity.id);
    const updated = {
      ...entity,
      updatedAt: new Date().toISOString(),
    };

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    saveStoredEntities(list);
    return updated;
  }

  async deleteEntity(id: string): Promise<void> {
    const list = getStoredEntities().filter((e) => e.id !== id);
    saveStoredEntities(list);

    // Cascade delete mentions associated with entity
    const mentions = getStoredMentions().filter((m) => m.entityId !== id);
    saveStoredMentions(mentions);
  }

  async listMentions(entryId?: string): Promise<MemoryMention[]> {
    const all = getStoredMentions();
    if (entryId) {
      return all.filter((m) => m.entryId === entryId);
    }
    return all;
  }

  async saveMention(mention: MemoryMention): Promise<MemoryMention> {
    const list = getStoredMentions();
    const idx = list.findIndex((m) => m.id === mention.id);
    if (idx >= 0) {
      list[idx] = mention;
    } else {
      list.push(mention);
    }
    saveStoredMentions(list);
    return mention;
  }

  async deleteMention(id: string): Promise<void> {
    const list = getStoredMentions().filter((m) => m.id !== id);
    saveStoredMentions(list);
  }

  async listConnections(): Promise<UniverseConnection[]> {
    return getStoredConnections();
  }

  async saveConnection(connection: UniverseConnection): Promise<UniverseConnection> {
    const list = getStoredConnections();
    const idx = list.findIndex((c) => c.id === connection.id);
    const updated = {
      ...connection,
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    saveStoredConnections(list);
    return updated;
  }

  async deleteConnection(id: string): Promise<void> {
    const list = getStoredConnections().filter((c) => c.id !== id);
    saveStoredConnections(list);
  }

  async listMeaningfulMoments(): Promise<MeaningfulMoment[]> {
    return getStoredMeaningfulMoments();
  }

  async toggleMeaningfulMoment(entryId: string, note?: string): Promise<boolean> {
    const list = getStoredMeaningfulMoments();
    const idx = list.findIndex((m) => m.entryId === entryId);
    if (idx >= 0) {
      // Remove
      list.splice(idx, 1);
      saveStoredMeaningfulMoments(list);
      return false;
    } else {
      // Add
      list.push({
        id: `moment_${entryId}_${Date.now()}`,
        entryId,
        note,
        createdAt: new Date().toISOString(),
      });
      saveStoredMeaningfulMoments(list);
      return true;
    }
  }
}
