"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { DiaryEntry, FutureLetter } from "@/types/entry";
import { IEntryRepository, IFutureLetterRepository, MigrationSummary } from "./types";
import { LocalEntryRepository } from "./localEntryRepository";
import { LocalLetterRepository } from "./localLetterRepository";
import { SupabaseEntryRepository } from "./supabaseEntryRepository";
import { SupabaseLetterRepository } from "./supabaseLetterRepository";
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
  activeEntryRepo: IEntryRepository;
  activeLetterRepo: IFutureLetterRepository;
  refreshEntries: () => Promise<DiaryEntry[]>;
  refreshLetters: () => Promise<FutureLetter[]>;
  saveEntry: (entry: DiaryEntry) => Promise<DiaryEntry>;
  deleteEntry: (id: string) => Promise<void>;
  saveLetter: (letter: FutureLetter) => Promise<FutureLetter>;
  deleteLetter: (id: string) => Promise<void>;
  openLetter: (id: string) => Promise<FutureLetter | null>;
  unsealLetter: (id: string) => Promise<FutureLetter | null>;
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

const RepositoryContext = createContext<RepositoryContextType | null>(null);

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  const { user, session, signOut } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [letters, setLetters] = useState<FutureLetter[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingLocal, setPendingLocal] = useState({
    entriesCount: 0,
    lettersCount: 0,
    hasData: false,
  });

  // Decide active repos based on user authentication
  const { entryRepo, letterRepo, mode } = useMemo(() => {
    const supabase = getSupabaseBrowserClient();
    if (user && supabase) {
      return {
        entryRepo: new SupabaseEntryRepository(supabase, user.id),
        letterRepo: new SupabaseLetterRepository(supabase, user.id),
        mode: "cloud" as const,
      };
    }
    return {
      entryRepo: defaultLocalEntryRepo,
      letterRepo: defaultLocalLetterRepo,
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

  useEffect(() => {
    // When switching user or mode, reset state immediately to prevent cache bleeding
    setEntries([]);
    setLetters([]);
    refreshEntries();
    refreshLetters();
    updatePendingLocalStatus();
  }, [user, mode, refreshEntries, refreshLetters, updatePendingLocalStatus]);

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
        activeEntryRepo: entryRepo,
        activeLetterRepo: letterRepo,
        refreshEntries,
        refreshLetters,
        saveEntry: handleSaveEntry,
        deleteEntry: handleDeleteEntry,
        saveLetter: handleSaveLetter,
        deleteLetter: handleDeleteLetter,
        openLetter: handleOpenLetter,
        unsealLetter: handleUnsealLetter,
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
