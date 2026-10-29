"use client";

import React, { useState } from "react";
import { useRepository } from "@/lib/repository/RepositoryContext";
import { CloudUpload, CheckCircle, AlertTriangle, X, ShieldCheck } from "lucide-react";
import { MigrationSummary } from "@/lib/repository/types";

export function MigrationBanner() {
  const {
    mode,
    pendingLocalData,
    migrateLocalToCloud,
    clearLocalBrowserData,
  } = useRepository();

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationSummary | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Only show if user is in cloud mode (authenticated) and has local unmigrated records
  if (mode !== "cloud" || !pendingLocalData.hasData || dismissed) {
    return null;
  }

  const handleStartMigration = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    try {
      const res = await migrateLocalToCloud();
      setMigrationResult(res);
    } catch (err: any) {
      setMigrationResult({
        localEntriesCount: pendingLocalData.entriesCount,
        localLettersCount: pendingLocalData.lettersCount,
        migratedEntries: 0,
        migratedLetters: 0,
        errors: [err?.message || "Migration failed unexpectedly."],
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <aside
      aria-label="Local Data Migration"
      className="mb-8 p-5 bg-[#2B2226] border border-[#D78A70]/50 rounded-sm text-[#F0E8DF] shadow-xl relative"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 text-[#A89A98] hover:text-[#F0E8DF] transition-colors"
        aria-label="Dismiss migration notification"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-full bg-[#D78A70]/10 border border-[#D78A70]/30 text-[#D78A70] flex-shrink-0">
          <CloudUpload className="w-5 h-5" />
        </div>

        <div className="flex-1 pr-6">
          <h2 className="font-serif text-lg text-[#F0E8DF] tracking-wide mb-1">
            Local Memories Ready to Sync
          </h2>
          <p className="text-xs text-[#A89A98] leading-relaxed mb-3">
            We discovered{" "}
            <span className="text-[#F0E8DF] font-medium">
              {pendingLocalData.entriesCount} journal {pendingLocalData.entriesCount === 1 ? "entry" : "entries"}
            </span>{" "}
            and{" "}
            <span className="text-[#F0E8DF] font-medium">
              {pendingLocalData.lettersCount} future {pendingLocalData.lettersCount === 1 ? "letter" : "letters"}
            </span>{" "}
            stored locally in this browser. You can safely transfer them to your permanent cloud account.
          </p>

          {/* Results Display */}
          {migrationResult && (
            <div
              className={`p-3.5 mb-3 rounded-sm text-xs ${
                migrationResult.errors.length === 0
                  ? "bg-[#211A1D] border border-emerald-500/30 text-emerald-300"
                  : "bg-[#211A1D] border border-amber-500/30 text-amber-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-1 font-medium">
                {migrationResult.errors.length === 0 ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  Migrated {migrationResult.migratedEntries} entries and {migrationResult.migratedLetters} letters.
                </span>
              </div>
              {migrationResult.errors.length > 0 && (
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[#A89A98]">
                  {migrationResult.errors.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {!migrationResult ? (
              <button
                type="button"
                onClick={handleStartMigration}
                disabled={isMigrating}
                className="px-4 py-2 bg-[#D78A70] hover:bg-[#D78A70]/90 text-[#211A1D] font-medium text-xs rounded-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isMigrating ? "Safely Uploading..." : "Sync to Cloud Sanctuary"}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3.5 py-1.5 bg-[#45373C]/60 hover:bg-[#45373C] text-xs text-[#F0E8DF] rounded-sm transition-colors"
                >
                  Clear Local Browser Copies
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  className="px-3.5 py-1.5 border border-[#45373C] hover:border-[#A89A98] text-xs text-[#A89A98] hover:text-[#F0E8DF] rounded-sm transition-colors"
                >
                  Keep Local Backup
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation modal for clearing local copies */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-[#211A1D]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#2B2226] border border-[#45373C] max-w-md w-full p-6 rounded-sm space-y-4">
            <div className="flex items-center gap-3 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-serif text-lg text-[#F0E8DF]">Cloud Records Verified</h3>
            </div>
            <p className="text-xs text-[#A89A98] leading-relaxed">
              Your entries and letters have been securely verified in your Supabase account. Clearing local browser storage will free up browser space without touching your cloud records.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs text-[#A89A98] hover:text-[#F0E8DF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearLocalBrowserData();
                  setShowClearConfirm(false);
                  setDismissed(true);
                }}
                className="px-3.5 py-1.5 bg-[#D78A70] text-[#211A1D] font-medium text-xs rounded-sm hover:bg-[#D78A70]/90"
              >
                Clear Local Browser Storage
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

