"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRepository } from "@/lib/repository/RepositoryContext";
import {
  X,
  User,
  Shield,
  Download,
  Upload,
  LogOut,
  AlertOctagon,
  CheckCircle,
  KeyRound,
  Mail,
  Lock,
  Database,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import { validateImportJSON, FullArchivePayload } from "@/lib/repository/migration";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const {
    user,
    isConfigured,
    signIn,
    signUp,
    signOut,
    resetPassword,
  } = useAuth();

  const {
    mode,
    entries,
    letters,
    exportData,
    importArchiveJSON,
    deleteAccount,
  } = useRepository();

  const [authTab, setAuthTab] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{
    payload: FullArchivePayload;
    summary: {
      entriesCount: number;
      lettersCount: number;
      reflectionsCount: number;
      entitiesCount: number;
      connectionsCount: number;
    };
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Deletion state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteZone, setShowDeleteZone] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await signIn(email, password);
      if (res.error) {
        setErrorMessage(res.error.message);
      } else {
        setSuccessMessage("Welcome back to your quiet sanctuary.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await signUp(email, password);
      if (res.error) {
        setErrorMessage(res.error.message);
      } else {
        setSuccessMessage(
          "Sanctuary created. If confirmation email is enabled, please check your inbox."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await resetPassword(email);
      if (res.error) {
        setErrorMessage(res.error.message);
      } else {
        setSuccessMessage("Password recovery instructions sent to your email.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Password reset failed";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE MY ARCHIVE") {
      setDeleteError("Please type DELETE MY ARCHIVE exactly to confirm.");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteAccount(deleteConfirmation);
      if (!res.success) {
        setDeleteError(res.error || "Deletion could not be completed.");
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected deletion error";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = validateImportJSON(text);
      if (!res.valid || !res.payload || !res.summary) {
        setImportError(res.error || "File validation failed.");
        setImportPreview(null);
      } else {
        setImportPreview({
          payload: res.payload,
          summary: res.summary,
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const res = await importArchiveJSON(importPreview.payload);
      if (res.success) {
        setSuccessMessage(`Successfully restored ${res.importedCount} memories and letters.`);
        setImportPreview(null);
      } else {
        setImportError(res.error || "Failed to restore archive items.");
      }
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#181315]/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1B1618] border border-[#FAF6F0]/[0.08] rounded-md shadow-2xl p-6 sm:p-7 relative text-[#F7F3EE] max-h-[92vh] overflow-y-auto animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#9E948D] hover:text-[#F7F3EE] transition-colors p-1"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <Shield className="w-5 h-5 text-[#C87A64]" />
          <div>
            <h3 className="font-serif text-lg tracking-wide">
              {user ? "Cloud Sanctuary Account" : "Sanctuary Settings & Sync"}
            </h3>
            <p className="text-[11px] text-[#9E948D] font-sans">
              Private, row-level protected nocturnal space.
            </p>
          </div>
        </div>

        {/* Import Preview Confirmation Sub-Modal */}
        {importPreview && (
          <div className="mb-6 p-4 bg-[#130F11] border border-[#C87A64]/40 rounded-sm space-y-3">
            <div className="flex items-center gap-2 text-[#C87A64] text-xs font-medium">
              <FileCheck className="w-4 h-4" />
              <span>Archive Ready for Safe Restoration</span>
            </div>
            <p className="text-xs text-[#9E948D] leading-relaxed">
              Found the following items inside this backup file:
            </p>
            <ul className="text-xs text-[#F7F3EE] space-y-1 pl-4 list-disc font-sans">
              <li>{importPreview.summary.entriesCount} Diary entries</li>
              <li>{importPreview.summary.lettersCount} Future letters</li>
              <li>{importPreview.summary.reflectionsCount} Saved reflections</li>
              <li>{importPreview.summary.entitiesCount} Universe entities</li>
              <li>{importPreview.summary.connectionsCount} Memory connections</li>
            </ul>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-3 py-1.5 bg-[#C87A64] hover:bg-[#C87A64]/90 text-[#130F11] text-xs font-medium rounded transition-colors disabled:opacity-50"
              >
                {isImporting ? "Restoring Archive..." : "Confirm & Restore"}
              </button>
              <button
                type="button"
                onClick={() => setImportPreview(null)}
                className="px-3 py-1.5 text-xs text-[#9E948D] hover:text-[#F7F3EE]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {importError && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs rounded-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Authenticated State */}
        {user ? (
          <div className="space-y-6">
            <div className="p-4 bg-[#130F11] border border-[#FAF6F0]/[0.08] rounded-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-[#9E948D]">Signed in as:</span>
                <span className="text-[#F7F3EE] font-medium truncate max-w-[200px]">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-[#9E948D]">Cloud Sanctuary:</span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Active & Synced
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-[#9E948D]">Synchronized entries:</span>
                <span className="text-[#F7F3EE] font-mono">{entries.length} memories</span>
              </div>
            </div>

            {/* Actions: Export & Import */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={exportData}
                className="w-full py-2.5 px-4 bg-[#130F11] hover:bg-[#130F11]/80 border border-[#FAF6F0]/[0.08] text-[#F7F3EE] text-xs font-medium rounded-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-[#C87A64]" />
                <span>Export Entire Sanctuary Archive (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-[#130F11] hover:bg-[#130F11]/80 border border-[#FAF6F0]/[0.08] text-[#F7F3EE] text-xs font-medium rounded-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-[#C87A64]" />
                <span>Import & Restore Archive (JSON)</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileSelect}
              />

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-transparent hover:bg-[#130F11] border border-[#FAF6F0]/[0.08] text-[#9E948D] hover:text-[#F7F3EE] text-xs font-medium rounded-sm flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Cloud Sanctuary</span>
              </button>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="pt-4 border-t border-[#FAF6F0]/[0.06]">
              {!showDeleteZone ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteZone(true)}
                  className="text-xs text-rose-400/80 hover:text-rose-400 transition-colors"
                >
                  Delete Account & Cloud Archive...
                </button>
              ) : (
                <div className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-sm space-y-3 text-xs">
                  <div className="flex items-center gap-2 text-rose-400 font-medium">
                    <AlertOctagon className="w-4 h-4 flex-shrink-0" />
                    <span>Permanent Account Deletion</span>
                  </div>
                  <p className="text-[#9E948D] leading-relaxed">
                    This action will permanently delete all cloud-stored diary entries, drafts, future letters, attachments, and reflection records. This cannot be undone.
                  </p>
                  <p className="text-[#9E948D]">
                    To confirm, please type{" "}
                    <strong className="text-[#F7F3EE] select-all font-mono">DELETE MY ARCHIVE</strong> below:
                  </p>

                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE MY ARCHIVE"
                    className="w-full bg-[#130F11] border border-rose-900/60 text-[#F7F3EE] px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-rose-500 font-mono"
                  />

                  {deleteError && (
                    <p className="text-xs text-rose-400">{deleteError}</p>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={deleteConfirmation !== "DELETE MY ARCHIVE" || isDeleting}
                      onClick={handleDeleteAccount}
                      className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white font-medium text-xs rounded-sm transition-colors"
                    >
                      {isDeleting ? "Purging Records..." : "Permanently Delete Everything"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteZone(false)}
                      className="text-xs text-[#9E948D] hover:text-[#F7F3EE]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Unauthenticated Auth Form */
          <div>
            {/* Tabs */}
            <div className="flex border-b border-[#FAF6F0]/[0.08] mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("signin");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 pb-3 text-xs font-medium tracking-wide transition-colors border-b-2 -mb-px ${
                  authTab === "signin"
                    ? "border-[#C87A64] text-[#F7F3EE]"
                    : "border-transparent text-[#9E948D] hover:text-[#F7F3EE]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("signup");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 pb-3 text-xs font-medium tracking-wide transition-colors border-b-2 -mb-px ${
                  authTab === "signup"
                    ? "border-[#C87A64] text-[#F7F3EE]"
                    : "border-transparent text-[#9E948D] hover:text-[#F7F3EE]"
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("reset");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 pb-3 text-xs font-medium tracking-wide transition-colors border-b-2 -mb-px ${
                  authTab === "reset"
                    ? "border-[#C87A64] text-[#F7F3EE]"
                    : "border-transparent text-[#9E948D] hover:text-[#F7F3EE]"
                }`}
              >
                Recovery
              </button>
            </div>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs rounded-sm">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 text-xs rounded-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            {authTab === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#9E948D] mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9E948D] absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-[#130F11] border border-[#FAF6F0]/[0.08] text-[#F7F3EE] pl-9 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-[#C87A64]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#9E948D] mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9E948D] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#130F11] border border-[#FAF6F0]/[0.08] text-[#F7F3EE] pl-9 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-[#C87A64]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isConfigured}
                  className="w-full py-2.5 bg-[#C87A64] hover:bg-[#C87A64]/90 text-[#130F11] font-medium text-xs rounded-sm transition-colors disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Sign In to Cloud Sanctuary"}
                </button>
              </form>
            )}

            {authTab === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#9E948D] mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9E948D] absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-[#130F11] border border-[#FAF6F0]/[0.08] text-[#F7F3EE] pl-9 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-[#C87A64]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#9E948D] mb-1.5">Create Secure Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9E948D] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full bg-[#130F11] border border-[#FAF6F0]/[0.08] text-[#F7F3EE] pl-9 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-[#C87A64]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isConfigured}
                  className="w-full py-2.5 bg-[#C87A64] hover:bg-[#C87A64]/90 text-[#130F11] font-medium text-xs rounded-sm transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Cloud Sanctuary"}
                </button>
              </form>
            )}

            {authTab === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-[#9E948D] leading-relaxed">
                  Enter your registered email address to receive password reset instructions.
                </p>
                <div>
                  <label className="block text-xs text-[#9E948D] mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9E948D] absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-[#130F11] border border-[#FAF6F0]/[0.08] text-[#F7F3EE] pl-9 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-[#C87A64]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isConfigured}
                  className="w-full py-2.5 bg-[#C87A64] hover:bg-[#C87A64]/90 text-[#130F11] font-medium text-xs rounded-sm transition-colors disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Recovery Email"}
                </button>
              </form>
            )}

            {/* Offline Export & Import capabilities even if not signed in */}
            <div className="pt-6 mt-6 border-t border-[#FAF6F0]/[0.06] space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9E948D]">
                <span>Local Offline Tools</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={exportData}
                  className="text-xs text-[#C87A64] hover:bg-[#130F11] p-2 border border-[#FAF6F0]/[0.08] rounded text-center flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-[#C87A64] hover:bg-[#130F11] p-2 border border-[#FAF6F0]/[0.08] rounded text-center flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Restore Backup</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
