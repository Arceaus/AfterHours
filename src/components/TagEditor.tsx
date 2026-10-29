"use client";

import React, { useState, useRef, useEffect } from "react";
import { Tag as TagIcon, X, Plus } from "lucide-react";
import { getAllUniqueTags } from "@/lib/storage";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagEditor({ tags, onChange, disabled }: TagEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvailableTags(getAllUniqueTags());
  }, [tags]);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleAddTag = (rawTag: string) => {
    const clean = rawTag.trim().replace(/^#+/, "");
    if (!clean) return;

    if (!tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      onChange([...tags, clean]);
    }
    setInputValue("");
    setIsAdding(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setInputValue("");
    }
  };

  // Filter available suggestions (existing tags not already on this entry)
  const suggestions = availableTags.filter(
    (t) =>
      !tags.some((cur) => cur.toLowerCase() === t.toLowerCase()) &&
      (inputValue ? t.toLowerCase().includes(inputValue.toLowerCase()) : true)
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
      {/* Existing Tags */}
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#2B2226] border border-[#45373C]/60 text-[#F0E8DF]/90 text-[11px] group transition-colors"
        >
          <span className="text-[#D78A70]/70">#</span>
          <span>{tag}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="text-[#A89A98]/60 hover:text-red-400 p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70] rounded"
              title={`Remove #${tag}`}
              aria-label={`Remove #${tag}`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </span>
      ))}

      {/* Add Tag Flow */}
      {!disabled && (
        <div className="relative">
          {isAdding ? (
            <div className="flex items-center gap-1">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    // Small delay so click on suggestion registers
                    setTimeout(() => {
                      if (inputValue.trim()) {
                        handleAddTag(inputValue);
                      } else {
                        setIsAdding(false);
                      }
                    }, 180);
                  }}
                  placeholder="tag name..."
                  className="w-28 bg-[#211A1D] border border-[#D78A70]/60 rounded px-2 py-0.5 text-[11px] text-[#F0E8DF] placeholder-[#A89A98]/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
                  maxLength={25}
                />

                {/* Suggestions Dropdown */}
                {suggestions.length > 0 && isAdding && (
                  <div className="absolute left-0 top-full mt-1 w-36 max-h-36 overflow-y-auto bg-[#2B2226] border border-[#45373C] rounded shadow-lg z-20 py-1">
                    <div className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#A89A98]/60">
                      Existing tags
                    </div>
                    {suggestions.slice(0, 5).map((sugg) => (
                      <button
                        key={sugg}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAddTag(sugg);
                        }}
                        className="w-full text-left px-2 py-1 text-xs text-[#F0E8DF] hover:bg-[#342A2F] flex items-center justify-between"
                      >
                        <span>#{sugg}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (inputValue.trim()) handleAddTag(inputValue);
                  else setIsAdding(false);
                }}
                className="text-[11px] text-[#D78A70] hover:text-[#FAF6F0] px-1 py-0.5"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setInputValue("");
                }}
                className="text-[11px] text-[#A89A98] hover:text-[#F0E8DF] px-1 py-0.5"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-[#A89A98]/70 hover:text-[#F0E8DF] hover:bg-[#2B2226] border border-dashed border-[#45373C]/60 hover:border-[#D78A70]/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D78A70]"
              title="Add a tag"
            >
              <Plus className="w-2.5 h-2.5 text-[#D78A70]" />
              <span>{tags.length === 0 ? "Add tag" : "tag"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

