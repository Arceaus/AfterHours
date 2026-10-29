import { getSavedEntries, getEntryById } from "@/lib/storage";
import { getSavedLetters, getLetterById } from "@/lib/letters";
import { IEntryRepository, IFutureLetterRepository, MigrationSummary } from "./types";
import { DiaryEntry, FutureLetter } from "@/types/entry";

export function checkPendingLocalData(): {
  entriesCount: number;
  lettersCount: number;
  hasData: boolean;
  localEntries: DiaryEntry[];
  localLetters: FutureLetter[];
} {
  const localEntries = getSavedEntries();
  const localLetters = getSavedLetters();
  return {
    entriesCount: localEntries.length,
    lettersCount: localLetters.length,
    hasData: localEntries.length > 0 || localLetters.length > 0,
    localEntries,
    localLetters,
  };
}

export async function executeDataMigration(
  cloudEntryRepo: IEntryRepository,
  cloudLetterRepo: IFutureLetterRepository
): Promise<MigrationSummary> {
  const { localEntries, localLetters } = checkPendingLocalData();

  let migratedEntries = 0;
  let migratedLetters = 0;
  const errors: string[] = [];

  // 1. Migrate entries
  for (const entry of localEntries) {
    try {
      // Check if entry already exists in cloud
      const remote = await cloudEntryRepo.getEntry(entry.id);
      if (remote) {
        // If exact same, skip without duplicating
        if (remote.updatedAt >= entry.updatedAt) {
          migratedEntries++;
          continue;
        }
      }
      await cloudEntryRepo.saveEntry(entry);
      migratedEntries++;
    } catch (err: any) {
      errors.push(`Entry "${entry.title || entry.id}": ${err?.message || "Upload failed"}`);
    }
  }

  // 2. Migrate future letters
  for (const letter of localLetters) {
    try {
      const remote = await cloudLetterRepo.getLetter(letter.id);
      if (remote) {
        if (remote.updatedAt >= letter.updatedAt) {
          migratedLetters++;
          continue;
        }
      }
      await cloudLetterRepo.saveLetter(letter);
      migratedLetters++;
    } catch (err: any) {
      errors.push(`Letter "${letter.title || letter.id}": ${err?.message || "Upload failed"}`);
    }
  }

  return {
    localEntriesCount: localEntries.length,
    localLettersCount: localLetters.length,
    migratedEntries,
    migratedLetters,
    errors,
  };
}

export function exportArchiveAsJSON(entries: DiaryEntry[], letters: FutureLetter[], userEmail?: string | null): void {
  const exportPayload = {
    app: "AFTERTHOUGHT",
    exportedAt: new Date().toISOString(),
    account: userEmail || "local_user",
    version: "6.0",
    stats: {
      totalEntries: entries.length,
      totalFutureLetters: letters.length,
    },
    entries,
    futureLetters: letters,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split("T")[0];
  const a = document.createElement("a");
  a.href = url;
  a.download = `afterthought-archive-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

