import { getSavedEntries } from "@/lib/storage";
import { getSavedLetters } from "@/lib/letters";
import { IEntryRepository, IFutureLetterRepository, MigrationSummary } from "./types";
import {
  DiaryEntry,
  FutureLetter,
  SavedReflection,
  MemoryEntity,
  UniverseConnection,
  MemoryMention,
  MeaningfulMoment,
} from "@/types/entry";

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
      const remote = await cloudEntryRepo.getEntry(entry.id);
      if (remote) {
        if (remote.updatedAt >= entry.updatedAt) {
          migratedEntries++;
          continue;
        }
      }
      await cloudEntryRepo.saveEntry(entry);
      migratedEntries++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      errors.push(`Entry "${entry.title || entry.id}": ${msg}`);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      errors.push(`Letter "${letter.title || letter.id}": ${msg}`);
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

export interface FullArchivePayload {
  app: "AFTERTHOUGHT";
  version: "9.0";
  exportedAt: string;
  account: string;
  stats: {
    totalEntries: number;
    totalFutureLetters: number;
    totalReflections: number;
    totalUniverseEntities: number;
    totalConnections: number;
  };
  entries: DiaryEntry[];
  futureLetters: FutureLetter[];
  reflections?: SavedReflection[];
  universe?: {
    entities: MemoryEntity[];
    mentions: MemoryMention[];
    connections: UniverseConnection[];
    meaningfulMoments: MeaningfulMoment[];
  };
}

export function exportArchiveAsJSON(
  entries: DiaryEntry[],
  letters: FutureLetter[],
  reflections: SavedReflection[] = [],
  universeData?: {
    entities: MemoryEntity[];
    mentions: MemoryMention[];
    connections: UniverseConnection[];
    meaningfulMoments: MeaningfulMoment[];
  },
  userEmail?: string | null
): void {
  const exportPayload: FullArchivePayload = {
    app: "AFTERTHOUGHT",
    version: "9.0",
    exportedAt: new Date().toISOString(),
    account: userEmail || "local_user",
    stats: {
      totalEntries: entries.length,
      totalFutureLetters: letters.length,
      totalReflections: reflections.length,
      totalUniverseEntities: universeData?.entities.length || 0,
      totalConnections: universeData?.connections.length || 0,
    },
    entries,
    futureLetters: letters,
    reflections,
    universe: universeData,
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

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  payload?: FullArchivePayload;
  summary?: {
    entriesCount: number;
    lettersCount: number;
    reflectionsCount: number;
    entitiesCount: number;
    connectionsCount: number;
  };
}

export function validateImportJSON(rawText: string): ImportValidationResult {
  try {
    const data = JSON.parse(rawText);
    if (!data || typeof data !== "object") {
      return { valid: false, error: "Invalid JSON format: payload is not an object." };
    }

    if (data.app !== "AFTERTHOUGHT" && !Array.isArray(data.entries)) {
      return {
        valid: false,
        error: "Unrecognized file. This file does not appear to be an AFTERTHOUGHT archive.",
      };
    }

    const entries = Array.isArray(data.entries) ? data.entries : [];
    const letters = Array.isArray(data.futureLetters) ? data.futureLetters : [];
    const reflections = Array.isArray(data.reflections) ? data.reflections : [];
    const entities = Array.isArray(data.universe?.entities) ? data.universe.entities : [];
    const connections = Array.isArray(data.universe?.connections) ? data.universe.connections : [];

    return {
      valid: true,
      payload: data as FullArchivePayload,
      summary: {
        entriesCount: entries.length,
        lettersCount: letters.length,
        reflectionsCount: reflections.length,
        entitiesCount: entities.length,
        connectionsCount: connections.length,
      },
    };
  } catch (err) {
    return {
      valid: false,
      error: `JSON parse error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
