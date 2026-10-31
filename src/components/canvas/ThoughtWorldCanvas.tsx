"use client";

import React from "react";

interface ThoughtWorldCanvasProps {
  isWriting?: boolean;
}

export function ThoughtWorldCanvas({
  isWriting = false,
}: ThoughtWorldCanvasProps) {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0D0B0E]"
    >
      {/* 1. Calm, completely still ambient warm aura (Zero dizziness, zero motion sickness) */}
      <div
        className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[700px] h-[700px] rounded-full blur-[140px] pointer-events-none transition-opacity duration-1000 ${
          isWriting ? "opacity-25" : "opacity-45"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(200, 122, 100, 0.22) 0%, rgba(124, 139, 130, 0.08) 50%, transparent 75%)",
        }}
      />

      {/* 2. Soft, restful bottom ambient glow */}
      <div
        className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[900px] h-[450px] rounded-full blur-[160px] pointer-events-none opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(200, 122, 100, 0.25) 0%, transparent 70%)",
        }}
      />

      {/* 3. Ultra-subtle analog grain for tactile luxury */}
      <div className="absolute inset-0 noir-grain opacity-25 pointer-events-none" />
    </div>
  );
}
