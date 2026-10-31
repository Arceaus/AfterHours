"use client";

import React, { useRef, useState } from "react";
import { MemoryAttachment } from "@/types/entry";
import { ImagePlus, Loader2, X, Eye } from "lucide-react";
import { AttachmentLightbox } from "./AttachmentLightbox";
import { validateAttachmentFile } from "@/lib/attachments";

interface AttachmentTrayProps {
  attachments: MemoryAttachment[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (attachment: MemoryAttachment) => Promise<void>;
  disabled?: boolean;
}

export function AttachmentTray({
  attachments,
  onUpload,
  onDelete,
  disabled = false,
}: AttachmentTrayProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeLightboxAttachment, setActiveLightboxAttachment] = useState<MemoryAttachment | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const validation = validateAttachmentFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to attach photograph.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="pt-4 border-t border-[#45373C]/30 mt-6 select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-sans uppercase tracking-[0.12em] text-[#A89A98]/60">
          Photographs & Visual Echoes ({attachments.length})
        </span>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-sans text-[#D78A70] hover:text-[#FAF6F0] bg-[#2B2226] hover:bg-[#36292E] border border-[#45373C]/60 rounded transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Attaching...</span>
            </>
          ) : (
            <>
              <ImagePlus className="w-3.5 h-3.5" />
              <span>Add photograph</span>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {errorMessage && (
        <div className="mb-3 px-3 py-2 bg-[#D78A70]/10 border border-[#D78A70]/30 rounded text-xs text-[#D78A70] flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:text-[#FAF6F0]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative aspect-video bg-[#2B2226] border border-[#45373C]/60 rounded overflow-hidden shadow-sm hover:border-[#D78A70]/60 transition-all cursor-pointer"
              onClick={() => setActiveLightboxAttachment(att)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={att.url}
                alt={att.fileName}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#181315]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                <span className="text-[10px] text-[#F0E8DF] truncate max-w-[80%] font-sans">
                  {att.fileName}
                </span>
                <div className="flex items-center gap-1">
                  <span className="p-1 bg-[#211A1D]/80 rounded text-[#F0E8DF] hover:text-[#D78A70]">
                    <Eye className="w-3 h-3" />
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Remove this photograph?")) {
                    void onDelete(att);
                  }
                }}
                className="absolute top-1.5 right-1.5 p-1 bg-[#211A1D]/80 hover:bg-[#D78A70] text-[#A89A98] hover:text-[#211A1D] rounded opacity-0 group-hover:opacity-100 transition-all shadow"
                title="Remove photograph"
                aria-label="Remove photograph"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {activeLightboxAttachment && (
        <AttachmentLightbox
          attachment={activeLightboxAttachment}
          onClose={() => setActiveLightboxAttachment(null)}
          onDelete={(att) => {
            void onDelete(att);
            setActiveLightboxAttachment(null);
          }}
        />
      )}
    </div>
  );
}
