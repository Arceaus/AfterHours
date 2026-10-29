"use client";

import React from "react";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { RepositoryProvider } from "@/lib/repository/RepositoryContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RepositoryProvider>{children}</RepositoryProvider>
    </AuthProvider>
  );
}
