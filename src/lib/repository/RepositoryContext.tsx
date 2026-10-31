"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  DiaryEntry,
  FutureLetter,
  SavedReflection,
  MemoryEntity,
  MemoryMention,
  UniverseConnection,
  MeaningfulMoment,
  MemoryAttachment,
} from "@/types/entry";
import {
  IEntryRepository,
  IFutureLetterRepository,
  IReflectionRepository,
  IUniverseRepository,
  MigrationSummary,
} from "./types";
import { LocalEntryRepository } from "./localEntryRepository";
import { LocalLetterRepository } from "./localLetterRepository";
import { LocalReflectionRepository } from "./localReflectionRepository";
import { LocalUniverseRepository } from "./localUniverseRepository";
import { SupabaseEntryRepository } from "./supabaseEntryRepository";
import { SupabaseLetterRepository } from "./supabaseLetterRepository";
import { SupabaseReflectionRepository } from "./supabaseReflectionRepository";
import { SupabaseUniverseRepository } from "./supabaseUniverseRepository";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  checkPendingLocalData,
  executeDataMigration,
  exportArchiveAsJSON,
  FullArchivePayload,
} from "./migration";
import { clearActiveDraft, persistEntry } from "@/lib/storage";
import { clearLetterDraft } from "@/lib/letters";
import { offlineQueue } from "@/lib/offlineQueue";

export interface RepositoryContextType {
  mode: "cloud" | "local";
  isSyncing: boolean;
  isOnline: boolean;
  pendingQueueCount: number;
  entries: DiaryEntry[];
  letters: FutureLetter[];
  reflections: SavedReflection[];
  entities: MemoryEntity[];
  mentions: MemoryMention[];
  connections: UniverseConnection[];
  meaningfulMoments: MeaningfulMoment[];
  activeEntryRepo: IEntryRepository;
  activeLetterRepo: IFutureLetterRepository;
  activeReflectionRepo: IReflectionRepository;
  activeUniverseRepo: IUniverseRepository;
  refreshEntries: () => Promise<DiaryEntry[]>;
  refreshLetters: () => Promise<FutureLetter[]>;
  refreshReflections: () => Promise<SavedReflection[]>;
  refreshUniverseData: () => Promise<void>;
  saveEntry: (entry: DiaryEntry) => Promise<DiaryEntry>;
  deleteEntry: (id: string) => Promise<void>;
  saveLetter: (letter: FutureLetter) => Promise<FutureLetter>;
  deleteLetter: (id: string) => Promise<void>;
  openLetter: (id: string) => Promise<FutureLetter | null>;
  unsealLetter: (id: string) => Promise<FutureLetter | null>;
  saveReflection: (reflection: SavedReflection) => Promise<SavedReflection>;
  deleteReflection: (id: string) => Promise<void>;
  // Universe operations
  saveEntity: (entity: MemoryEntity) => Promise<MemoryEntity>;
  deleteEntity: (id: string) => Promise<void>;
  saveConnection: (connection: UniverseConnection) => Promise<UniverseConnection>;
  deleteConnection: (id: string) => Promise<void>;
  toggleMeaningfulMoment: (entryId: string, note?: string) => Promise<boolean>;
  // Phase 9: Attachments
  listAttachments: (entryId: string) => Promise<MemoryAttachment[]>;
  saveAttachment: (entryId: string, file: File) => Promise<MemoryAttachment>;
  deleteAttachment: (attachmentId: string, storagePath?: string) => Promise<void>;
  // Migration
  pendingLocalData: {
    entriesCount: number;
    lettersCount: number;
    hasData: boolean;
  };
  migrateLocalToCloud: () => Promise<MigrationSummary>;
  clearLocalBrowserData: () => void;
  // Export, Import & Account Management
  exportData: () => void;
  importArchiveJSON: (payload: FullArchivePayload) => Promise<{ success: boolean; importedCount: number; error?: string }>;
  deleteAccount: (confirmation: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

const defaultLocalEntryRepo = new LocalEntryRepository();
const defaultLocalLetterRepo = new LocalLetterRepository();
const defaultLocalReflectionRepo = new LocalReflectionRepository();
const defaultLocalUniverseRepo = new LocalUniverseRepository();

const RepositoryContext = createContext<RepositoryContextType | null>(null);

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  const { user, session, signOut } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [letters, setLetters] = useState<FutureLetter[]>([]);
  const [reflections, setReflections] = useState<SavedReflection[]>([]);
  const [entities, setEntities] = useState<MemoryEntity[]>([]);
  const [mentions, setMentions] = useState<MemoryMention[]>([]);
  const [connections, setConnections] = useState<UniverseConnection[]>([]);
  const [meaningfulMoments, setMeaningfulMoments] = useState<MeaningfulMoment[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);
  const [pendingLocal, setPendingLocal] = useState({
    entriesCount: 0,
    lettersCount: 0,
    hasData: false,
  });

  const mode: "cloud" | "local" = user ? "cloud" : "local";
  const supabaseClient = useMemo(() => getSupabaseBrowserClient(), []);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    let unsubscribeQueue: (() => void) | undefined;
    if (offlineQueue) {
      unsubscribeQueue = offlineQueue.subscribe((items) => {
        setPendingQueueCount(items.length);
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (unsubscribeQueue) unsubscribeQueue();
    };
  }, []);

  const entryRepo: IEntryRepository = useMemo(() => {
    if (user && supabaseClient) {
      return new SupabaseEntryRepository(supabaseClient, user.id);
    }
    return defaultLocalEntryRepo;
  }, [user, supabaseClient]);

  const letterRepo: IFutureLetterRepository = useMemo(() => {
    if (user && supabaseClient) {
      return new SupabaseLetterRepository(supabaseClient, user.id);
    }
    return defaultLocalLetterRepo;
  }, [user, supabaseClient]);

  const reflectionRepo: IReflectionRepository = useMemo(() => {
    if (user && supabaseClient) {
      return new SupabaseReflectionRepository(supabaseClient, user.id);
    }
    return defaultLocalReflectionRepo;
  }, [user, supabaseClient]);

  const universeRepo: IUniverseRepository = useMemo(() => {
    if (user && supabaseClient) {
      return new SupabaseUniverseRepository(supabaseClient, user.id);
    }
    return defaultLocalUniverseRepo;
  }, [user, supabaseClient]);

  const updatePendingLocalStatus = useCallback(() => {
    const status = checkPendingLocalData();
    setPendingLocal({
      entriesCount: status.entriesCount,
      lettersCount: status.lettersCount,
      hasData: status.hasData,
    });
  }, []);

  const refreshEntries = useCallback(async (): Promise<DiaryEntry[]> => {
    try {
      const data = await entryRepo.listEntries();
      setEntries(data);
      return data;
    } catch (err) {
      console.warn("Failed to load entries:", err);
      return [];
    }
  }, [entryRepo]);

  const refreshLetters = useCallback(async (): Promise<FutureLetter[]> => {
    try {
      const data = await letterRepo.listLetters();
      setLetters(data);
      return data;
    } catch (err) {
      console.warn("Failed to load future letters:", err);
      return [];
    }
  }, [letterRepo]);

  const refreshReflections = useCallback(async (): Promise<SavedReflection[]> => {
    try {
      const data = await reflectionRepo.listReflections();
      setReflections(data);
      return data;
    } catch (err) {
      console.warn("Failed to load reflections:", err);
      return [];
    }
  }, [reflectionRepo]);

  const refreshUniverseData = useCallback(async (): Promise<void> => {
    try {
      const [entList, menList, connList, momList] = await Promise.all([
        universeRepo.listEntities(),
        universeRepo.listMentions(),
        universeRepo.listConnections(),
        universeRepo.listMeaningfulMoments(),
      ]);
      setEntities(entList);
      setMentions(menList);
      setConnections(connList);
      setMeaningfulMoments(momList);
    } catch (err) {
      console.warn("Failed to refresh universe data:", err);
    }
  }, [universeRepo]);

  // Automatic offline sync flusher
  const flushOfflineQueue = useCallback(async () => {
    if (!offlineQueue || !isOnline || mode !== "cloud") return;
    await offlineQueue.flush(async (item) => {
      try {
        if (item.type === "save_entry") {
          await entryRepo.saveEntry(item.payload as unknown as DiaryEntry);
        } else if (item.type === "delete_entry") {
          await entryRepo.deleteEntry(item.payload.id as string);
        } else if (item.type === "save_letter") {
          await letterRepo.saveLetter(item.payload as unknown as FutureLetter);
        } else if (item.type === "delete_letter") {
          await letterRepo.deleteLetter(item.payload.id as string);
        }
        return true;
      } catch (err) {
        console.warn("Error during offline queue sync item:", err);
        return false;
      }
    });
    await refreshEntries();
    await refreshLetters();
  }, [entryRepo, letterRepo, isOnline, mode, refreshEntries, refreshLetters]);

  useEffect(() => {
    if (isOnline) {
      void flushOfflineQueue();
    }
  }, [isOnline, flushOfflineQueue]);

  useEffect(() => {
    setEntries([]);
    setLetters([]);
    setReflections([]);
    setEntities([]);
    setMentions([]);
    setConnections([]);
    setMeaningfulMoments([]);
    refreshEntries();
    refreshLetters();
    refreshReflections();
    refreshUniverseData();
    updatePendingLocalStatus();
  }, [user, mode, refreshEntries, refreshLetters, refreshReflections, refreshUniverseData, updatePendingLocalStatus]);

  const handleSaveEntry = useCallback(
    async (entry: DiaryEntry): Promise<DiaryEntry> => {
      setIsSyncing(true);
      try {
        if (!isOnline && mode === "cloud") {
          // Offline in cloud mode: persist locally and enqueue for cloud sync
          persistEntry(entry);
          offlineQueue?.enqueue("save_entry", entry as unknown as Record<string, unknown>);
          setEntries((prev) => {
            const idx = prev.findIndex((e) => e.id === entry.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = entry;
              return updated;
            }
            return [entry, ...prev];
          });
          return entry;
        }

        const saved = await entryRepo.saveEntry(entry);
        await refreshEntries();
        return saved;
      } catch (err) {
        if (mode === "cloud") {
          console.warn("Cloud save failed, falling back to offline queue:", err);
          persistEntry(entry);
          offlineQueue?.enqueue("save_entry", entry as unknown as Record<string, unknown>);
          return entry;
        }
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [entryRepo, refreshEntries, isOnline, mode]
  );

  const handleDeleteEntry = useCallback(
    async (id: string): Promise<void> => {
      setIsSyncing(true);
      try {
        if (!isOnline && mode === "cloud") {
          offlineQueue?.enqueue("delete_entry", { id });
          setEntries((prev) => prev.filter((e) => e.id !== id));
          return;
        }
        await entryRepo.deleteEntry(id);
        await refreshEntries();
      } catch (err) {
        if (mode === "cloud") {
          offlineQueue?.enqueue("delete_entry", { id });
          setEntries((prev) => prev.filter((e) => e.id !== id));
          return;
        }
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [entryRepo, refreshEntries, isOnline, mode]
  );

  const handleSaveLetter = useCallback(
    async (letter: FutureLetter): Promise<FutureLetter> => {
      try {
        if (!isOnline && mode === "cloud") {
          offlineQueue?.enqueue("save_letter", letter as unknown as Record<string, unknown>);
          setLetters((prev) => {
            const idx = prev.findIndex((l) => l.id === letter.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = letter;
              return updated;
            }
            return [letter, ...prev];
          });
          return letter;
        }
        const saved = await letterRepo.saveLetter(letter);
        await refreshLetters();
        return saved;
      } catch (err) {
        if (mode === "cloud") {
          offlineQueue?.enqueue("save_letter", letter as unknown as Record<string, unknown>);
          return letter;
        }
        throw err;
      }
    },
    [letterRepo, refreshLetters, isOnline, mode]
  );

  const handleDeleteLetter = useCallback(
    async (id: string): Promise<void> => {
      if (!isOnline && mode === "cloud") {
        offlineQueue?.enqueue("delete_letter", { id });
        setLetters((prev) => prev.filter((l) => l.id !== id));
        return;
      }
      await letterRepo.deleteLetter(id);
      await refreshLetters();
    },
    [letterRepo, refreshLetters, isOnline, mode]
  );

  const handleOpenLetter = useCallback(
    async (id: string): Promise<FutureLetter | null> => {
      const opened = await letterRepo.openLetter(id);
      await refreshLetters();
      return opened;
    },
    [letterRepo, refreshLetters]
  );

  const handleUnsealLetter = useCallback(
    async (id: string): Promise<FutureLetter | null> => {
      const unsealed = await letterRepo.unsealLetter(id);
      await refreshLetters();
      return unsealed;
    },
    [letterRepo, refreshLetters]
  );

  const handleSaveReflection = useCallback(
    async (reflection: SavedReflection): Promise<SavedReflection> => {
      const saved = await reflectionRepo.saveReflection(reflection);
      await refreshReflections();
      return saved;
    },
    [reflectionRepo, refreshReflections]
  );

  const handleDeleteReflection = useCallback(
    async (id: string): Promise<void> => {
      await reflectionRepo.deleteReflection(id);
      await refreshReflections();
    },
    [reflectionRepo, refreshReflections]
  );

  // Universe handlers
  const handleSaveEntity = useCallback(
    async (entity: MemoryEntity): Promise<MemoryEntity> => {
      const saved = await universeRepo.saveEntity(entity);
      await refreshUniverseData();
      return saved;
    },
    [universeRepo, refreshUniverseData]
  );

  const handleDeleteEntity = useCallback(
    async (id: string): Promise<void> => {
      await universeRepo.deleteEntity(id);
      await refreshUniverseData();
    },
    [universeRepo, refreshUniverseData]
  );

  const handleSaveConnection = useCallback(
    async (connection: UniverseConnection): Promise<UniverseConnection> => {
      const saved = await universeRepo.saveConnection(connection);
      await refreshUniverseData();
      return saved;
    },
    [universeRepo, refreshUniverseData]
  );

  const handleDeleteConnection = useCallback(
    async (id: string): Promise<void> => {
      await universeRepo.deleteConnection(id);
      await refreshUniverseData();
    },
    [universeRepo, refreshUniverseData]
  );

  const handleToggleMeaningfulMoment = useCallback(
    async (entryId: string, note?: string): Promise<boolean> => {
      const result = await universeRepo.toggleMeaningfulMoment(entryId, note);
      await refreshUniverseData();
      return result;
    },
    [universeRepo, refreshUniverseData]
  );

  // Phase 9: Attachments handlers
  const handleListAttachments = useCallback(
    async (entryId: string): Promise<MemoryAttachment[]> => {
      if (entryRepo.listAttachments) {
        return entryRepo.listAttachments(entryId);
      }
      return [];
    },
    [entryRepo]
  );

  const handleSaveAttachment = useCallback(
    async (entryId: string, file: File): Promise<MemoryAttachment> => {
      if (entryRepo.saveAttachment) {
        return entryRepo.saveAttachment(entryId, file);
      }
      throw new Error("Attachments are not supported in this repository mode.");
    },
    [entryRepo]
  );

  const handleDeleteAttachment = useCallback(
    async (attachmentId: string, storagePath?: string): Promise<void> => {
      if (entryRepo.deleteAttachment) {
        await entryRepo.deleteAttachment(attachmentId, storagePath);
      }
    },
    [entryRepo]
  );

  // Safe migration flow
  const migrateLocalToCloud = useCallback(async (): Promise<MigrationSummary> => {
    if (mode !== "cloud") {
      throw new Error("Must be signed into Supabase cloud to migrate local data.");
    }
    const result = await executeDataMigration(entryRepo, letterRepo);
    await refreshEntries();
    await refreshLetters();
    updatePendingLocalStatus();
    return result;
  }, [mode, entryRepo, letterRepo, refreshEntries, refreshLetters, updatePendingLocalStatus]);

  const clearLocalBrowserData = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("afterthought_entries_v2");
      localStorage.removeItem("afterthought_entries_v1");
      localStorage.removeItem("afterthought_future_letters_v1");
      clearActiveDraft();
      clearLetterDraft();
      updatePendingLocalStatus();
    }
  }, [updatePendingLocalStatus]);

  // Enhanced Export
  const exportData = useCallback(() => {
    exportArchiveAsJSON(
      entries,
      letters,
      reflections,
      {
        entities,
        mentions,
        connections,
        meaningfulMoments,
      },
      user?.email
    );
  }, [entries, letters, reflections, entities, mentions, connections, meaningfulMoments, user?.email]);

  // Safe Import
  const importArchiveJSON = useCallback(
    async (payload: FullArchivePayload): Promise<{ success: boolean; importedCount: number; error?: string }> => {
      try {
        let count = 0;
        // 1. Import entries
        for (const entry of payload.entries || []) {
          await entryRepo.saveEntry(entry);
          count++;
        }
        // 2. Import letters
        for (const letter of payload.futureLetters || []) {
          await letterRepo.saveLetter(letter);
          count++;
        }
        // 3. Import reflections
        for (const ref of payload.reflections || []) {
          await reflectionRepo.saveReflection(ref);
        }
        // 4. Import universe entities
        for (const ent of payload.universe?.entities || []) {
          await universeRepo.saveEntity(ent);
        }
        // 5. Import universe connections
        for (const conn of payload.universe?.connections || []) {
          await universeRepo.saveConnection(conn);
        }

        await refreshEntries();
        await refreshLetters();
        await refreshReflections();
        await refreshUniverseData();

        return { success: true, importedCount: count };
      } catch (err) {
        return {
          success: false,
          importedCount: 0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
    [entryRepo, letterRepo, reflectionRepo, universeRepo, refreshEntries, refreshLetters, refreshReflections, refreshUniverseData]
  );

  // Delete account
  const deleteAccount = useCallback(
    async (confirmation: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      if (mode === "local") {
        clearLocalBrowserData();
        setEntries([]);
        setLetters([]);
        return {
          success: true,
          message: "All local entries and drafts have been cleared from this browser.",
        };
      }

      if (!session?.access_token) {
        return { success: false, error: "No active session token found." };
      }

      try {
        const res = await fetch("/api/auth/delete-account", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ confirmation }),
        });

        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || "Account deletion failed" };
        }

        setEntries([]);
        setLetters([]);
        await signOut();

        return { success: true, message: data.message };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Network error during account deletion";
        return { success: false, error: msg };
      }
    },
    [mode, session?.access_token, clearLocalBrowserData, signOut]
  );

  return (
    <RepositoryContext.Provider
      value={{
        mode,
        isSyncing,
        isOnline,
        pendingQueueCount,
        entries,
        letters,
        reflections,
        entities,
        mentions,
        connections,
        meaningfulMoments,
        activeEntryRepo: entryRepo,
        activeLetterRepo: letterRepo,
        activeReflectionRepo: reflectionRepo,
        activeUniverseRepo: universeRepo,
        refreshEntries,
        refreshLetters,
        refreshReflections,
        refreshUniverseData,
        saveEntry: handleSaveEntry,
        deleteEntry: handleDeleteEntry,
        saveLetter: handleSaveLetter,
        deleteLetter: handleDeleteLetter,
        openLetter: handleOpenLetter,
        unsealLetter: handleUnsealLetter,
        saveReflection: handleSaveReflection,
        deleteReflection: handleDeleteReflection,
        saveEntity: handleSaveEntity,
        deleteEntity: handleDeleteEntity,
        saveConnection: handleSaveConnection,
        deleteConnection: handleDeleteConnection,
        toggleMeaningfulMoment: handleToggleMeaningfulMoment,
        listAttachments: handleListAttachments,
        saveAttachment: handleSaveAttachment,
        deleteAttachment: handleDeleteAttachment,
        pendingLocalData: pendingLocal,
        migrateLocalToCloud,
        clearLocalBrowserData,
        exportData,
        importArchiveJSON,
        deleteAccount,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository() {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error("useRepository must be used within a RepositoryProvider");
  }
  return context;
}
