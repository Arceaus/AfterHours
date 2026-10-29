import { DiaryEntry, DraftState, MemoryOverviewStats } from "@/types/entry";
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

// Safely normalize an entry from storage, ensuring backward compatibility
function normalizeEntry(raw: any): DiaryEntry {
  const nowISO = new Date().toISOString();
  return {
    id: raw.id || generateId(),
    title: typeof raw.title === "string" ? raw.title : "",
    content: typeof raw.content === "string" ? raw.content : "",
    createdAt: raw.createdAt || nowISO,
    updatedAt: raw.updatedAt || raw.createdAt || nowISO,
    entryDate: raw.entryDate || getLocalCalendarDate(),
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t: any) => typeof t === "string" && t.trim().length > 0)
      : [],
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
  };
}

// Safely retrieve all diary entries
export function getSavedEntries(): DiaryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENTRIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeEntry).sort((a, b) => {
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
        const migrated: DiaryEntry[] = legacy.map((item) => {
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

    const normalized = normalizeEntry(entry);

    let updated: DiaryEntry[];
    if (existingIndex >= 0) {
      // Preserve original createdAt, update updatedAt
      const existing = entries[existingIndex];
      const merged: DiaryEntry = {
        ...normalized,
        createdAt: existing.createdAt || normalized.createdAt,
        updatedAt: new Date().toISOString(),
      };
      updated = [...entries];
      updated[existingIndex] = merged;
    } else {
      updated = [normalized, ...entries];
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

// Get all unique tags currently in use
export function getAllUniqueTags(): string[] {
  const entries = getSavedEntries();
  const tagSet = new Set<string>();
  entries.forEach((e) => {
    e.tags.forEach((t) => {
      const clean = t.trim();
      if (clean) tagSet.add(clean);
    });
  });
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

// Calculate Memory Overview Statistics from actual data
export function getMemoryOverview(entries?: DiaryEntry[]): MemoryOverviewStats {
  const list = entries || getSavedEntries();

  if (list.length === 0) {
    return {
      totalEntries: 0,
      earliestEntryDate: null,
      latestEntryDate: null,
      distinctDatesCount: 0,
      topTags: [],
    };
  }

  // Calculate distinct calendar dates
  const datesSet = new Set<string>();
  const tagCounts = new Map<string, number>();

  let earliest = list[0].entryDate;
  let latest = list[0].entryDate;

  list.forEach((e) => {
    if (e.entryDate) {
      datesSet.add(e.entryDate);
      if (e.entryDate < earliest) earliest = e.entryDate;
      if (e.entryDate > latest) latest = e.entryDate;
    }

    e.tags.forEach((t) => {
      const clean = t.trim();
      if (clean) {
        tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
      }
    });
  });

  const sortedTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, 6);

  return {
    totalEntries: list.length,
    earliestEntryDate: earliest,
    latestEntryDate: latest,
    distinctDatesCount: datesSet.size,
    topTags: sortedTags,
  };
}

// Draft management
export function loadActiveDraft(): DraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        entryId: parsed.entryId || null,
        title: parsed.title || "",
        content: parsed.content || "",
        entryDate: parsed.entryDate || getLocalCalendarDate(),
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
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
