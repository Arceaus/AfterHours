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
    <>
      {/* Discreet floating pill rather than a giant disruptive banner */}
      <aside
        aria-label="Local Data Migration"
        className="mb-8 p-4 bg-[#0E0919]/70 border border-white/10 rounded-2xl text-white backdrop-blur-3xl shadow-[0_12px_32px_rgba(0,0,0,0.4)] relative max-w-2xl mx-auto w-full transition-all animate-fadeIn"
      >
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute top-3.5 right-3.5 text-[#B3A8C6] hover:text-white transition-colors p-1"
          aria-label="Dismiss migration notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="p-2 rounded-full bg-[#FF9254]/15 border border-[#FF9254]/30 text-[#FF9254] shrink-0 mt-0.5 shadow-[0_0_8px_#FF9254]/20">
            <CloudUpload className="w-4 h-4" />
          </div>

          <div className="flex-1">
            <h3 className="font-serif text-base text-white font-normal mb-1">
              Local Memories Ready to Sync
            </h3>
            <p className="text-xs text-[#B3A8C6] leading-relaxed mb-3">
              We found {pendingLocalData.entriesCount} journal {pendingLocalData.entriesCount === 1 ? "entry" : "entries"} stored in this browser. Safely preserve them to your cloud sanctuary.
            </p>

            {migrationResult && (
              <div
                className={`p-2.5 mb-3 rounded-lg text-xs ${
                  migrationResult.errors.length === 0
                    ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
                    : "bg-amber-950/40 border border-amber-500/30 text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {migrationResult.errors.length === 0 ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>
                    Transferred {migrationResult.migratedEntries} entries and {migrationResult.migratedLetters} letters.
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              {!migrationResult ? (
                <button
                  type="button"
                  onClick={handleStartMigration}
                  disabled={isMigrating}
                  className="px-4 py-1.5 bg-[#FF9254] hover:bg-[#FF7A30] text-[#08060F] font-medium text-xs rounded-full transition-colors flex items-center gap-2 disabled:opacity-50 shadow-[0_0_12px_rgba(255,146,84,0.3)]"
                >
                  {isMigrating ? "Syncing..." : "Sync to Cloud"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3.5 py-1 bg-white/10 hover:bg-white/15 text-xs text-white rounded-full transition-colors"
                >
                  Clear Local Browser Cache
                </button>
              )}
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="px-3 py-1 text-xs text-[#B3A8C6] hover:text-white transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Clear confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-[#09080A]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141215] border border-white/[0.08] max-w-sm w-full p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              <h4 className="font-serif text-lg text-[#F3EFEA]">Records Secured in Cloud</h4>
            </div>
            <p className="text-xs text-[#8E8782] leading-relaxed">
              Your entries are safely in Supabase. You can now clear local copies without affecting cloud memories.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs text-[#8E8782] hover:text-[#F3EFEA]"
              >
                Keep Both
              </button>
              <button
                type="button"
                onClick={() => {
                  clearLocalBrowserData();
                  setShowClearConfirm(false);
                  setDismissed(true);
                }}
                className="px-3.5 py-1.5 bg-[#D47A60] text-[#09080A] font-medium text-xs rounded-full hover:bg-[#D47A60]/90"
              >
                Clear Local
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
