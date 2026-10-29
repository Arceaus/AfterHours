"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRepository } from "@/lib/repository/RepositoryContext";
import {
  X,
  User,
  Shield,
  Download,
  LogOut,
  AlertOctagon,
  CheckCircle,
  KeyRound,
  Mail,
  Lock,
  Database,
} from "lucide-react";

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
    deleteAccount,
  } = useRepository();

  const [authTab, setAuthTab] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    } catch (err: any) {
      setErrorMessage(err?.message || "Sign in failed");
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
    } catch (err: any) {
      setErrorMessage(err?.message || "Sign up failed");
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
    } catch (err: any) {
      setErrorMessage(err?.message || "Password recovery failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteAccount(deleteConfirmation);
      if (!res.success) {
        setDeleteError(res.error || "Deletion failed.");
      } else {
        onClose();
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Deletion failed.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#211A1D]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#2B2226] border border-[#45373C] w-full max-w-lg rounded-sm shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#A89A98] hover:text-[#F0E8DF] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[#D78A70] text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Private Sanctuary & Cloud Sync</span>
          </div>
          <h2 className="font-serif text-2xl text-[#F0E8DF] tracking-wide">
            {user ? "Your Private Sanctuary" : "Cloud Authentication"}
          </h2>
        </div>

        {/* Status notice if backend unconfigured */}
        {!isConfigured && (
          <div className="mb-6 p-4 bg-[#211A1D] border border-amber-500/30 text-amber-200/90 rounded-sm text-xs leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-medium text-amber-400">
              <Database className="w-4 h-4 flex-shrink-0" />
              <span>Offline Local Storage Active</span>
            </div>
            <p className="text-[#A89A98]">
              Supabase cloud credentials are not yet configured in{" "}
              <code className="text-[#F0E8DF] bg-[#2B2226] px-1 py-0.5 rounded">.env.local</code>.
              Your diary entries and future letters are currently stored safely and privately in your browser.
            </p>
          </div>
        )}

        {/* Authenticated View */}
        {user ? (
          <div className="space-y-6">
            {/* User Info Card */}
            <div className="p-4 bg-[#211A1D] border border-[#45373C]/50 rounded-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#A89A98]">Signed In Account</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] rounded uppercase tracking-wider font-mono">
                  Cloud Active
                </span>
              </div>
              <p className="text-sm font-medium text-[#F0E8DF] break-all">{user.email}</p>
              <div className="flex items-center gap-4 pt-2 text-xs text-[#A89A98]">
                <span>
                  <strong className="text-[#F0E8DF]">{entries.length}</strong> Entries
                </span>
                <span>•</span>
                <span>
                  <strong className="text-[#F0E8DF]">{letters.length}</strong> Future Letters
                </span>
              </div>
            </div>

            {/* Actions: Export & Sign out */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={exportData}
                className="w-full py-2.5 px-4 bg-[#211A1D] hover:bg-[#211A1D]/80 border border-[#45373C] text-[#F0E8DF] text-xs font-medium rounded-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-[#D78A70]" />
                <span>Export Entire Sanctuary Archive (JSON)</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-transparent hover:bg-[#211A1D] border border-[#45373C]/60 text-[#A89A98] hover:text-[#F0E8DF] text-xs font-medium rounded-sm flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Cloud Sanctuary</span>
              </button>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="pt-4 border-t border-[#45373C]/40">
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
                  <p className="text-[#A89A98] leading-relaxed">
                    This action will permanently delete all cloud-stored diary entries, drafts, and future letters. This cannot be undone.
                  </p>
                  <p className="text-[#A89A98]">
                    To confirm, please type{" "}
                    <strong className="text-[#F0E8DF] select-all font-mono">DELETE MY ARCHIVE</strong> below:
                  </p>

                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="DELETE MY ARCHIVE"
                    className="w-full bg-[#211A1D] border border-rose-900/60 text-[#F0E8DF] px-3 py-2 text-xs rounded-sm focus:outline-none focus:border-rose-500 font-mono"
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
                      className="text-xs text-[#A89A98] hover:text-[#F0E8DF]"
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
            <div className="flex border-b border-[#45373C] mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("signin");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 pb-3 text-xs font-medium tracking-wide transition-colors border-b-2 -mb-px ${
                  authTab === "signin"
                    ? "border-[#D78A70] text-[#F0E8DF]"
                    : "border-transparent text-[#A89A98] hover:text-[#F0E8DF]"
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
                    ? "border-[#D78A70] text-[#F0E8DF]"
                    : "border-transparent text-[#A89A98] hover:text-[#F0E8DF]"
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
                    ? "border-[#D78A70] text-[#F0E8DF]"
                    : "border-transparent text-[#A89A98] hover:text-[#F0E8DF]"
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
                  <label className="block text-xs text-[#A89A98] mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#A89A98] absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-[#211A1D] border border-[#45373C] text-[#F0E8DF] pl-9 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-[#D78A70]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#A89A98] mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A89A98] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-[#211A1D] border border-[#45373C] text-[#F0E8DF] pl-9 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-[#D78A70]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isConfigured}
                  className="w-full py-2.5 bg-[#D78A70] hover:bg-[#D78A70]/90 text-[#211A1D] font-medium text-xs rounded-sm transition-colors disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Sign In to Cloud Sanctuary"}
                </button>
              </form>
            )}

            {authTab === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#A89A98] mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#A89A98] absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-[#211A1D] border border-[#45373C] text-[#F0E8DF] pl-9 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-[#D78A70]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#A89A98] mb-1.5">Create Secure Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A89A98] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full bg-[#211A1D] border border-[#45373C] text-[#F0E8DF] pl-9 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-[#D78A70]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isConfigured}
                  className="w-full py-2.5 bg-[#D78A70] hover:bg-[#D78A70]/90 text-[#211A1D] font-medium text-xs rounded-sm transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Cloud Sanctuary"}
                </button>
              </form>
            )}

            {authTab === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-[#A89A98] leading-relaxed">
                  Enter your registered email address to receive password reset instructions.
                </p>
                <div>
                  <label className="block text-xs text-[#A89A98] mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#A89A98] absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-[#211A1D] border border-[#45373C] text-[#F0E8DF] pl-9 pr-3 py-2 text-xs rounded-sm focus:outline-none focus:border-[#D78A70]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isConfigured}
                  className="w-full py-2.5 bg-[#D78A70] hover:bg-[#D78A70]/90 text-[#211A1D] font-medium text-xs rounded-sm transition-colors disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Recovery Email"}
                </button>
              </form>
            )}

            {/* Offline Export capability even if not signed in */}
            <div className="pt-6 mt-6 border-t border-[#45373C]/40 flex items-center justify-between">
              <span className="text-xs text-[#A89A98]">Local Offline Archive</span>
              <button
                type="button"
                onClick={exportData}
                className="text-xs text-[#D78A70] hover:underline flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Backup</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

