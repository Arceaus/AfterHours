import { DiaryEntry, DraftState } from "@/types/entry";
import { getLocalCalendarDate } from "./date";

const STORAGE_KEY_ENTRIES = "afterthought_entries_v2";
const STORAGE_KEY_DRAFT = "afterthought_draft_v2";

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return (
    "entry_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).substring(2, 9)
  );
}

// Safely retrieve all diary entries
export function getSavedEntries(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => {
          // Sort newest first by entryDate, then createdAt
          const dateComp = (b.entryDate || "").localeCompare(a.entryDate || "");
          if (dateComp !== 0) return dateComp;
          return (b.createdAt || "").localeCompare(a.createdAt || "");
        });
      }
    }

    // Migration from v1 if present
    const legacyRaw = localStorage.getItem("afterthought_entries_v1");
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (Array.isArray(legacy)) {
        const migrated: DiaryEntry[] = legacy.map((item, idx) => {
          const nowISO = new Date().toISOString();
          return {
            id: generateId(),
            title: item.title || "",
            content: item.content || "",
            createdAt: nowISO,
            updatedAt: nowISO,
            entryDate: getLocalCalendarDate(),
            tags: [],
            attachments: [],
          };
        });
        localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(migrated));
        localStorage.removeItem("afterthought_entries_v1");
        return migrated;
      }
    }
  } catch (err) {
    console.error("Failed to load entries from storage:", err);
  }
  return [];
}

// Save or update an entry
export function persistEntry(entry: DiaryEntry): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const entries = getSavedEntries();
    const existingIndex = entries.findIndex((e) => e.id === entry.id);

    let updated: DiaryEntry[];
    if (existingIndex >= 0) {
      // Preserve createdAt, update updatedAt
      const existing = entries[existingIndex];
      const merged: DiaryEntry = {
        ...entry,
        createdAt: existing.createdAt || entry.createdAt,
        updatedAt: new Date().toISOString(),
      };
      updated = [...entries];
      updated[existingIndex] = merged;
    } else {
      updated = [entry, ...entries];
    }

    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Failed to persist entry:", err);
    return [];
  }
}

// Delete an entry by ID
export function removeEntry(id: string): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const entries = getSavedEntries();
    const filtered = entries.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.error("Failed to delete entry:", err);
    return [];
  }
}

// Get single entry by ID
export function getEntryById(id: string): DiaryEntry | null {
  const entries = getSavedEntries();
  return entries.find((e) => e.id === id) || null;
}

// Draft management
export function loadActiveDraft(): DraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
    if (raw) {
      return JSON.parse(raw);
    }

    // Check v1 draft for migration
    const legacyRaw = localStorage.getItem("afterthought_draft_v1");
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy.title || legacy.content) {
        const migratedDraft: DraftState = {
          entryId: null,
          title: legacy.title || "",
          content: legacy.content || "",
          entryDate: getLocalCalendarDate(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(migratedDraft));
        localStorage.removeItem("afterthought_draft_v1");
        return migratedDraft;
      }
    }
  } catch (err) {
    console.error("Failed to load draft:", err);
  }
  return null;
}

export function saveActiveDraft(draft: DraftState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draft));
  } catch (err) {
    console.error("Failed to save draft:", err);
  }
}

export function clearActiveDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_DRAFT);
    localStorage.removeItem("afterthought_draft_v1");
  } catch (err) {
    console.error("Failed to clear draft:", err);
  }
}
