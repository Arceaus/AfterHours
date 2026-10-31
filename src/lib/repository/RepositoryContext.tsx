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
import { checkPendingLocalData, executeDataMigration, exportArchiveAsJSON } from "./migration";
import { clearActiveDraft } from "@/lib/storage";
import { clearLetterDraft } from "@/lib/letters";

export interface RepositoryContextType {
  mode: "cloud" | "local";
  isSyncing: boolean;
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
  // Migration
  pendingLocalData: {
    entriesCount: number;
    lettersCount: number;
    hasData: boolean;
  };
  migrateLocalToCloud: () => Promise<MigrationSummary>;
  clearLocalBrowserData: () => void;
  // Export & Account Management
  exportData: () => void;
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
  const [pendingLocal, setPendingLocal] = useState({
    entriesCount: 0,
    lettersCount: 0,
    hasData: false,
  });

  // Decide active repos based on user authentication
  const { entryRepo, letterRepo, reflectionRepo, universeRepo, mode } = useMemo(() => {
    const supabase = getSupabaseBrowserClient();
    if (user && supabase) {
      return {
        entryRepo: new SupabaseEntryRepository(supabase, user.id),
        letterRepo: new SupabaseLetterRepository(supabase, user.id),
        reflectionRepo: new SupabaseReflectionRepository(supabase, user.id),
        universeRepo: new SupabaseUniverseRepository(supabase, user.id),
        mode: "cloud" as const,
      };
    }
    return {
      entryRepo: defaultLocalEntryRepo,
      letterRepo: defaultLocalLetterRepo,
      reflectionRepo: defaultLocalReflectionRepo,
      universeRepo: defaultLocalUniverseRepo,
      mode: "local" as const,
    };
  }, [user]);

  // Check pending local data whenever auth state changes
  const updatePendingLocalStatus = useCallback(() => {
    const status = checkPendingLocalData();
    setPendingLocal({
      entriesCount: status.entriesCount,
      lettersCount: status.lettersCount,
      hasData: status.hasData,
    });
  }, []);

  // Reload data whenever active repository changes (or user switches)
  const refreshEntries = useCallback(async (): Promise<DiaryEntry[]> => {
    setIsSyncing(true);
    try {
      const data = await entryRepo.listEntries();
      setEntries(data);
      return data;
    } catch (err) {
      console.error("Failed to refresh entries:", err);
      return [];
    } finally {
      setIsSyncing(false);
    }
  }, [entryRepo]);

  const refreshLetters = useCallback(async (): Promise<FutureLetter[]> => {
    try {
      const data = await letterRepo.listLetters();
      setLetters(data);
      return data;
    } catch (err) {
      console.error("Failed to refresh letters:", err);
      return [];
    }
  }, [letterRepo]);

  const refreshReflections = useCallback(async (): Promise<SavedReflection[]> => {
    try {
      const data = await reflectionRepo.listReflections();
      setReflections(data);
      return data;
    } catch (err) {
      console.error("Failed to refresh reflections:", err);
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

  useEffect(() => {
    // When switching user or mode, reset state immediately to prevent cache bleeding
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
        const saved = await entryRepo.saveEntry(entry);
        await refreshEntries();
        return saved;
      } finally {
        setIsSyncing(false);
      }
    },
    [entryRepo, refreshEntries]
  );

  const handleDeleteEntry = useCallback(
    async (id: string): Promise<void> => {
      setIsSyncing(true);
      try {
        await entryRepo.deleteEntry(id);
        await refreshEntries();
      } finally {
        setIsSyncing(false);
      }
    },
    [entryRepo, refreshEntries]
  );

  const handleSaveLetter = useCallback(
    async (letter: FutureLetter): Promise<FutureLetter> => {
      const saved = await letterRepo.saveLetter(letter);
      await refreshLetters();
      return saved;
    },
    [letterRepo, refreshLetters]
  );

  const handleDeleteLetter = useCallback(
    async (id: string): Promise<void> => {
      await letterRepo.deleteLetter(id);
      await refreshLetters();
    },
    [letterRepo, refreshLetters]
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

  // Export
  const exportData = useCallback(() => {
    exportArchiveAsJSON(entries, letters, user?.email);
  }, [entries, letters, user?.email]);

  // Delete account
  const deleteAccount = useCallback(
    async (confirmation: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      if (mode === "local") {
        // Local mode: clear local storage
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

        // Clear in-memory state & sign out
        setEntries([]);
        setLetters([]);
        await signOut();

        return { success: true, message: data.message };
      } catch (err: any) {
        return { success: false, error: err?.message || "Network error during account deletion" };
      }
    },
    [mode, session?.access_token, clearLocalBrowserData, signOut]
  );

  return (
    <RepositoryContext.Provider
      value={{
        mode,
        isSyncing,
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
        pendingLocalData: pendingLocal,
        migrateLocalToCloud,
        clearLocalBrowserData,
        exportData,
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

