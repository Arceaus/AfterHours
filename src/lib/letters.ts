import { FutureLetter, FutureLetterDraft, EffectiveLetterStatus } from "@/types/entry";
import { getLocalCalendarDate, getDaysInMonth } from "./date";

const STORAGE_KEY_LETTERS = "afterthought_future_letters_v1";
const STORAGE_KEY_LETTER_DRAFT = "afterthought_future_letter_draft_v1";

export function generateLetterId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "letter_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);
}

// Calculate preset opening date dynamically
export function calculatePresetDate(
  preset: "1month" | "3months" | "6months" | "1year",
  refDate: Date = new Date()
): string {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const day = refDate.getDate();

  let targetYear = year;
  let targetMonth = month;

  switch (preset) {
    case "1month":
      targetMonth += 1;
      break;
    case "3months":
      targetMonth += 3;
      break;
    case "6months":
      targetMonth += 6;
      break;
    case "1year":
      targetYear += 1;
      break;
  }

  // Adjust for year overflow
  if (targetMonth > 11) {
    targetYear += Math.floor(targetMonth / 12);
    targetMonth = targetMonth % 12;
  }

  // Bound day to valid days in target month
  const maxDays = getDaysInMonth(targetYear, targetMonth);
  const targetDay = Math.min(day, maxDays);

  return `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

// Validation: Opening date must be in the future (strictly greater than today's local calendar date)
export function isOpeningDateValid(dateStr: string, refDate: Date = new Date()): boolean {
  if (!dateStr || dateStr.length !== 10) return false;
  const today = getLocalCalendarDate(refDate);
  return dateStr > today;
}

// Dynamically determine effective lifecycle status
export function getEffectiveLetterStatus(
  letter: FutureLetter,
  refDate: Date = new Date()
): EffectiveLetterStatus {
  if (letter.status === "draft") return "draft";
  if (letter.status === "cancelled") return "cancelled";
  if (letter.status === "opened") return "opened";

  // For sealed letters, check if the scheduled opening date has arrived
  const today = getLocalCalendarDate(refDate);
  if (letter.scheduledOpenAt <= today) {
    return "ready";
  }

  return "sealed";
}

// Retrieve all saved letters
export function getSavedLetters(): FutureLetter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LETTERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      }
    }
  } catch (err) {
    console.error("Failed to load letters:", err);
  }
  return [];
}

// Save or update a letter
export function persistLetter(letter: FutureLetter): FutureLetter[] {
  if (typeof window === "undefined") return [];
  try {
    const letters = getSavedLetters();
    const idx = letters.findIndex((l) => l.id === letter.id);

    let updated: FutureLetter[];
    if (idx >= 0) {
      const existing = letters[idx];
      const merged: FutureLetter = {
        ...letter,
        createdAt: existing.createdAt || letter.createdAt,
        updatedAt: new Date().toISOString(),
      };
      updated = [...letters];
      updated[idx] = merged;
    } else {
      updated = [letter, ...letters];
    }

    localStorage.setItem(STORAGE_KEY_LETTERS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Failed to persist letter:", err);
    return [];
  }
}

// Delete a letter
export function removeLetter(id: string): FutureLetter[] {
  if (typeof window === "undefined") return [];
  try {
    const letters = getSavedLetters();
    const filtered = letters.filter((l) => l.id !== id);
    localStorage.setItem(STORAGE_KEY_LETTERS, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.error("Failed to delete letter:", err);
    return [];
  }
}

// Get single letter by ID
export function getLetterById(id: string): FutureLetter | null {
  const letters = getSavedLetters();
  return letters.find((l) => l.id === id) || null;
}

// Open a letter (transitions to opened state, sets openedAt timestamp)
export function openLetter(id: string): FutureLetter | null {
  if (typeof window === "undefined") return null;
  try {
    const letters = getSavedLetters();
    const letter = letters.find((l) => l.id === id);
    if (!letter) return null;

    const nowISO = new Date().toISOString();
    const updated: FutureLetter = {
      ...letter,
      status: "opened",
      openedAt: letter.openedAt || nowISO,
      updatedAt: nowISO,
    };

    persistLetter(updated);
    return updated;
  } catch (err) {
    console.error("Failed to open letter:", err);
    return null;
  }
}

// Cancel / Unseal a sealed letter back to draft
export function unsealLetterToDraft(id: string): FutureLetter | null {
  if (typeof window === "undefined") return null;
  try {
    const letters = getSavedLetters();
    const letter = letters.find((l) => l.id === id);
    if (!letter) return null;

    const updated: FutureLetter = {
      ...letter,
      status: "draft",
      updatedAt: new Date().toISOString(),
    };

    persistLetter(updated);
    return updated;
  } catch (err) {
    console.error("Failed to unseal letter:", err);
    return null;
  }
}

// Draft Management
export function loadLetterDraft(): FutureLetterDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LETTER_DRAFT);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to load letter draft:", err);
  }
  return null;
}

export function saveLetterDraft(draft: FutureLetterDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LETTER_DRAFT, JSON.stringify(draft));
  } catch (err) {
    console.error("Failed to save letter draft:", err);
  }
}

export function clearLetterDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_LETTER_DRAFT);
  } catch (err) {
    console.error("Failed to clear letter draft:", err);
  }
}
