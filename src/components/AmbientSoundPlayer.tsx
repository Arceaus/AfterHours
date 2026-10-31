"use client";

import React, { useEffect, useState } from "react";
import {
  ambientSound,
  SOUNDSCAPE_TRACKS,
  loadSoundPreferences,
  saveSoundPreferences,
} from "@/lib/ambientSound";
import { SoundscapeId } from "@/types/entry";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  CloudRain,
  CloudDrizzle,
  Moon,
  Wind,
  Waves,
  Flame,
  Disc,
  Sliders,
  ChevronUp,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  CloudRain,
  CloudDrizzle,
  Moon,
  Wind,
  Waves,
  Flame,
  Disc,
};

interface AmbientSoundPlayerProps {
  compact?: boolean;
}

export function AmbientSoundPlayer({ compact = false }: AmbientSoundPlayerProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeTrack, setActiveTrack] = useState<SoundscapeId>("rain");
  const [volume, setVolume] = useState<number>(0.4);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const prefs = loadSoundPreferences();
    setVolume(prefs.volume);
    setIsMuted(prefs.isMuted);
    if (prefs.activeTrackId) {
      setActiveTrack(prefs.activeTrackId);
    }
  }, []);

  const handleTogglePlay = () => {
    if (!ambientSound) return;
    if (isPlaying) {
      ambientSound.pause();
      setIsPlaying(false);
    } else {
      ambientSound.play(activeTrack);
      setIsPlaying(true);
    }
  };

  const handleSelectTrack = (trackId: SoundscapeId) => {
    setActiveTrack(trackId);
    saveSoundPreferences({ activeTrackId: trackId });
    if (ambientSound) {
      if (isPlaying) {
        ambientSound.play(trackId);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    saveSoundPreferences({ volume: val });
    if (ambientSound) {
      ambientSound.setVolume(val, isMuted);
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    saveSoundPreferences({ isMuted: nextMuted });
    if (ambientSound) {
      ambientSound.setVolume(volume, nextMuted);
    }
  };

  const CurrentIcon = ICON_MAP[SOUNDSCAPE_TRACKS.find((t) => t.id === activeTrack)?.iconName || "CloudRain"] || CloudRain;

  return (
    <div className="relative select-none">
      {/* Mini trigger pill */}
      <div className="flex items-center gap-1.5 bg-[#2B2226] border border-[#45373C]/60 rounded-full px-2.5 py-1 text-xs text-[#A89A98] hover:border-[#D78A70]/50 transition-colors shadow-sm">
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`p-1 rounded-full transition-colors ${
            isPlaying
              ? "text-[#211A1D] bg-[#D78A70]"
              : "text-[#A89A98] hover:text-[#F0E8DF] hover:bg-[#36292E]"
          }`}
          title={isPlaying ? "Pause ambient sound" : "Play ambient sound"}
          aria-label={isPlaying ? "Pause ambient sound" : "Play ambient sound"}
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-1 hover:text-[#F0E8DF] transition-colors"
          title="Soundscape settings"
          aria-expanded={isOpen}
        >
          <CurrentIcon className={`w-3.5 h-3.5 ${isPlaying ? "text-[#D78A70]" : "text-[#A89A98]"}`} />
          {!compact && (
            <span className="text-[11px] font-sans truncate max-w-[100px]">
              {SOUNDSCAPE_TRACKS.find((t) => t.id === activeTrack)?.name || "Sound"}
            </span>
          )}
          <Sliders className="w-3 h-3 opacity-60 ml-0.5" />
        </button>

        <button
          type="button"
          onClick={handleToggleMute}
          className="p-1 hover:text-[#F0E8DF] transition-colors rounded"
          title={isMuted ? "Unmute" : "Mute"}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-3 h-3 text-[#D78A70]" /> : <Volume2 className="w-3 h-3" />}
        </button>
      </div>

      {/* Expanded popover panel */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-72 p-4 bg-[#211A1D] border border-[#45373C] rounded-lg shadow-2xl z-40 animate-scaleUp">
          <div className="flex items-center justify-between pb-3 border-b border-[#45373C]/50 mb-3">
            <div className="flex items-center gap-2">
              <CurrentIcon className="w-4 h-4 text-[#D78A70]" />
              <span className="font-serif text-sm text-[#F0E8DF] tracking-wide">
                Ambient Soundscape
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-[#A89A98] hover:text-[#F0E8DF] transition-colors rounded hover:bg-[#2B2226]"
              aria-label="Close soundscape settings"
            >
              <ChevronUp className="w-4 h-4 rotate-180" />
            </button>
          </div>

          {/* Track options */}
          <div className="space-y-1 mb-4 max-h-48 overflow-y-auto pr-1">
            {SOUNDSCAPE_TRACKS.map((track) => {
              const TrackIcon = ICON_MAP[track.iconName] || CloudRain;
              const isSelected = track.id === activeTrack;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handleSelectTrack(track.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors text-xs ${
                    isSelected
                      ? "bg-[#2B2226] text-[#FAF6F0] font-medium border border-[#D78A70]/40"
                      : "text-[#A89A98] hover:text-[#F0E8DF] hover:bg-[#2B2226]/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <TrackIcon className={`w-3.5 h-3.5 ${isSelected ? "text-[#D78A70]" : "text-[#A89A98]/60"}`} />
                    <span>{track.name}</span>
                  </div>
                  {isSelected && isPlaying && (
                    <span className="flex gap-0.5 items-end h-3">
                      <span className="w-0.5 h-full bg-[#D78A70] animate-pulse" />
                      <span className="w-0.5 h-2/3 bg-[#D78A70] animate-pulse delay-75" />
                      <span className="w-0.5 h-4/5 bg-[#D78A70] animate-pulse delay-150" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Volume control */}
          <div className="pt-2 border-t border-[#45373C]/40">
            <div className="flex items-center justify-between text-[11px] text-[#A89A98] mb-1.5 font-sans">
              <span>Volume</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMute}
                className="text-[#A89A98] hover:text-[#F0E8DF] transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#D78A70]" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-[#36292E] rounded-lg appearance-none cursor-pointer accent-[#D78A70]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
