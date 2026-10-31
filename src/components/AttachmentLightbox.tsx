"use client";

import React, { useEffect } from "react";
import { MemoryAttachment } from "@/types/entry";
import { X, Trash2, Download, Image as ImageIcon } from "lucide-react";

interface AttachmentLightboxProps {
  attachment: MemoryAttachment | null;
  onClose: () => void;
  onDelete?: (attachment: MemoryAttachment) => void;
}

export function AttachmentLightbox({
  attachment,
  onClose,
  onDelete,
}: AttachmentLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!attachment) return null;

  const formattedSize = (attachment.fileSize / (1024 * 1024)).toFixed(2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-[#181315]/90 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photograph viewer"
    >
      <div
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center bg-[#211A1D] border border-[#45373C] rounded-lg shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="w-full flex items-center justify-between px-5 py-3 border-b border-[#45373C]/60 bg-[#2B2226]/80 text-[#F0E8DF]">
          <div className="flex items-center gap-2.5 truncate max-w-[70%]">
            <ImageIcon className="w-4 h-4 text-[#D78A70] shrink-0" />
            <span className="text-xs font-sans font-medium truncate">
              {attachment.fileName}
            </span>
            <span className="text-[11px] text-[#A89A98] shrink-0">
              ({formattedSize} MB)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {attachment.url && (
              <a
                href={attachment.url}
                download={attachment.fileName}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-[#A89A98] hover:text-[#F0E8DF] transition-colors rounded hover:bg-[#36292E]"
                title="Download photograph"
                aria-label="Download photograph"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Remove this photograph from your entry?")) {
                    onDelete(attachment);
                    onClose();
                  }
                }}
                className="p-1.5 text-[#A89A98] hover:text-[#D78A70] transition-colors rounded hover:bg-[#36292E]"
                title="Delete photograph"
                aria-label="Delete photograph"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#A89A98] hover:text-[#F0E8DF] transition-colors rounded hover:bg-[#36292E] ml-2"
              title="Close viewer"
              aria-label="Close viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image viewport */}
        <div className="relative flex items-center justify-center p-2 max-h-[calc(90vh-60px)] overflow-auto bg-[#181315]/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={attachment.fileName}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded select-none shadow-md"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
