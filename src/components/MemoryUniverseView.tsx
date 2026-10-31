"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  DiaryEntry,
  MemoryEntity,
  MemoryMention,
  UniverseConnection,
  MeaningfulMoment,
  GraphNode,
  GraphEdge,
  EntityType,
  ConfirmationStatus,
} from "@/types/entry";
import { useRepository } from "@/lib/repository/RepositoryContext";
import {
  extractHeuristicEntities,
  buildGraphLayout,
  getStoredAiConsent,
  setStoredAiConsent,
} from "@/lib/universe";
import {
  Orbit,
  Users,
  MapPin,
  Tag,
  Clock,
  Link as LinkIcon,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Check,
  X,
  Edit2,
  Trash2,
  Star,
  ArrowRight,
  Shield,
  Layers,
  List,
  Network,
  HelpCircle,
  ExternalLink,
  Plus,
} from "lucide-react";

interface MemoryUniverseViewProps {
  entries: DiaryEntry[];
  onOpenEntry: (entry: DiaryEntry) => void;
  onReturnToTonight: () => void;
}

type UniverseTab = "graph" | "people" | "places" | "topics" | "timeline" | "connections";

export function MemoryUniverseView({
  entries,
  onOpenEntry,
  onReturnToTonight,
}: MemoryUniverseViewProps) {
  const {
    entities,
    mentions,
    connections,
    meaningfulMoments,
    saveEntity,
    deleteEntity,
    saveConnection,
    deleteConnection,
    toggleMeaningfulMoment,
    refreshUniverseData,
  } = useRepository();

  const [activeTab, setActiveTab] = useState<UniverseTab>("graph");
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");
  const [graphFilter, setGraphFilter] = useState<
    "all" | "entry" | "person" | "place" | "topic" | "project"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Pan & Zoom state for SVG graph
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPointerDownRef = useRef(false);
  const dragDistanceRef = useRef(0);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Modals & Drawers
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Manual Connection Form State
  const [connSourceId, setConnSourceId] = useState("");
  const [connTargetId, setConnTargetId] = useState("");
  const [connNote, setConnNote] = useState("");

  // Rename entity state
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Merge entity state
  const [mergingEntityId, setMergingEntityId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");

  // Relationship label edit state
  const [editingRelEntityId, setEditingRelEntityId] = useState<string | null>(null);
  const [editingRelLabel, setEditingRelLabel] = useState("");

  // Meaningful moment note modal
  const [momentEntryId, setMomentEntryId] = useState<string | null>(null);
  const [momentNote, setMomentNote] = useState("");

  // Timeline filters
  const [timelineOnlyMeaningful, setTimelineOnlyMeaningful] = useState(false);
  const [timelineYearFilter, setTimelineYearFilter] = useState<string>("all");

  // Initial local heuristic scan if no entities exist yet and we have entries
  useEffect(() => {
    if (entities.length === 0 && entries.length > 0) {
      const result = extractHeuristicEntities(entries);
      if (result.entities.length > 0) {
        Promise.all([
          ...result.entities.map((e) => saveEntity(e)),
          ...result.connections.map((c) => saveConnection(c)),
        ]).then(() => refreshUniverseData());
      }
    }
  }, [entries.length, entities.length]);

  // Compute graph nodes and edges
  const { nodes, edges } = useMemo(() => {
    return buildGraphLayout(
      entries,
      entities,
      mentions,
      connections,
      meaningfulMoments,
      graphFilter,
      searchQuery
    );
  }, [entries, entities, mentions, connections, meaningfulMoments, graphFilter, searchQuery]);

  // Handle Graph SVG mouse/pointer drag and pan with distance threshold
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return; // Primary button only
    isPointerDownRef.current = true;
    dragDistanceRef.current = 0;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    dragDistanceRef.current = Math.hypot(dx, dy);

    // Only pan if the pointer actually moved more than 4px
    if (dragDistanceRef.current > 4) {
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
  };

  // Wheel zoom: ONLY zoom if user holds Ctrl / Meta key, allowing completely natural page scrolling
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      // Gentle exponential damping so graph never jumps too fast
      const factor = Math.exp(-e.deltaY * 0.0015);
      setZoom((prev) => Math.min(Math.max(0.4, prev * factor), 2.5));
    }
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(2.5, z * 1.15));
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.4, z * 0.85));
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setSelectedNode(null);
  };

  const handleNodeClick = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    // If user dragged more than 5px, don't trigger click
    if (dragDistanceRef.current > 5) return;
    setSelectedNode(node);
  };

  // Perform AI / Heuristic Scan
  const handlePerformScan = async (useAI: boolean) => {
    setIsScanning(true);
    setScanMessage(null);

    try {
      if (useAI) {
        setStoredAiConsent(true);
        // Excerpts from entries
        const excerpts = entries.slice(0, 10).map((e) => ({
          id: e.id,
          entryDate: e.entryDate,
          title: e.title,
          excerpt: e.content.slice(0, 280),
        }));

        const res = await fetch("/api/universe/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            excerpts,
            consentGiven: true,
          }),
        });

        const data = await res.json();
        if (data.entities && data.entities.length > 0) {
          for (const rawEnt of data.entities) {
            const norm = rawEnt.displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
            await saveEntity({
              id: `ent_${rawEnt.entityType}_${norm}_${Math.random().toString(36).substring(2, 7)}`,
              entityType: rawEnt.entityType,
              displayName: rawEnt.displayName,
              normalizedName: norm,
              confirmationStatus: "suggested",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        if (data.connections && data.connections.length > 0) {
          for (const rawConn of data.connections) {
            await saveConnection({
              id: `conn_ai_${Math.random().toString(36).substring(2, 9)}`,
              sourceEntryId: rawConn.sourceEntryId,
              targetEntryId: rawConn.targetEntryId,
              connectionType: rawConn.connectionType || "theme",
              explanation: rawConn.explanation || "Related themes in entries",
              supportingEvidence: [
                {
                  entryId: rawConn.sourceEntryId,
                  entryDate: "",
                  excerpt: rawConn.excerptSource || "",
                },
                {
                  entryId: rawConn.targetEntryId,
                  entryDate: "",
                  excerpt: rawConn.excerptTarget || "",
                },
              ],
              origin: "ai",
              status: "suggested",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        setScanMessage(
          `Scan completed. Discovered ${data.entities?.length || 0} candidate entities and ${
            data.connections?.length || 0
          } suggested connections.`
        );
      } else {
        // Run Local Heuristic Extraction
        const result = extractHeuristicEntities(entries);
        for (const ent of result.entities) {
          await saveEntity(ent);
        }
        for (const conn of result.connections) {
          await saveConnection(conn);
        }
        setScanMessage(
          `Local heuristic scan completed. Found ${result.entities.length} entities and ${result.connections.length} connections.`
        );
      }

      await refreshUniverseData();
    } catch (err: any) {
      setScanMessage(err?.message || "Scan failed. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  // Entity operations
  const handleConfirmEntity = async (entity: MemoryEntity) => {
    await saveEntity({
      ...entity,
      confirmationStatus: "confirmed",
    });
  };

  const handleDismissEntity = async (entity: MemoryEntity) => {
    await saveEntity({
      ...entity,
      confirmationStatus: "dismissed",
    });
  };

  const handleSaveRename = async (entity: MemoryEntity) => {
    if (!editingName.trim()) return;
    await saveEntity({
      ...entity,
      displayName: editingName.trim(),
      normalizedName: editingName.toLowerCase().replace(/[^a-z0-9]/g, ""),
    });
    setEditingEntityId(null);
    setEditingName("");
  };

  const handleSaveRelationshipLabel = async (entity: MemoryEntity) => {
    await saveEntity({
      ...entity,
      relationshipLabel: editingRelLabel.trim() || undefined,
    });
    setEditingRelEntityId(null);
    setEditingRelLabel("");
  };

  const handleMergeEntities = async (primaryId: string, secondaryId: string) => {
    const primary = entities.find((e) => e.id === primaryId);
    const secondary = entities.find((e) => e.id === secondaryId);
    if (!primary || !secondary) return;

    // Delete secondary entity
    await deleteEntity(secondary.id);
    setMergingEntityId(null);
    setMergeTargetId("");
    await refreshUniverseData();
  };

  // Manual Connection Creator
  const handleCreateUserConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connSourceId || !connTargetId || connSourceId === connTargetId) return;

    const src = entries.find((en) => en.id === connSourceId);
    const tgt = entries.find((en) => en.id === connTargetId);
    if (!src || !tgt) return;

    await saveConnection({
      id: `conn_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sourceEntryId: src.id,
      targetEntryId: tgt.id,
      connectionType: "user_link",
      explanation: connNote.trim() || "User connected these memories.",
      supportingEvidence: [
        {
          entryId: src.id,
          entryDate: src.entryDate,
          title: src.title,
          excerpt: src.content.slice(0, 150),
        },
        {
          entryId: tgt.id,
          entryDate: tgt.entryDate,
          title: tgt.title,
          excerpt: tgt.content.slice(0, 150),
        },
      ],
      origin: "user",
      status: "accepted",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setConnSourceId("");
    setConnTargetId("");
    setConnNote("");
    setIsConnectModalOpen(false);
  };

  // Connection acceptance
  const handleAcceptConnection = async (conn: UniverseConnection) => {
    await saveConnection({
      ...conn,
      status: "accepted",
    });
  };

  const handleDismissConnection = async (conn: UniverseConnection) => {
    await saveConnection({
      ...conn,
      status: "dismissed",
    });
  };

  // Meaningful moment toggle
  const handleToggleMomentWithNote = async (entryId: string) => {
    await toggleMeaningfulMoment(entryId, momentNote.trim() || undefined);
    setMomentEntryId(null);
    setMomentNote("");
  };

  // Filtered timeline entries
  const timelineEntries = useMemo(() => {
    const meaningfulSet = new Set(meaningfulMoments.map((m) => m.entryId));
    return [...entries]
      .filter((e) => {
        if (timelineOnlyMeaningful && !meaningfulSet.has(e.id)) return false;
        if (timelineYearFilter !== "all") {
          return e.entryDate.startsWith(timelineYearFilter);
        }
        return true;
      })
      .sort((a, b) => b.entryDate.localeCompare(a.entryDate));
  }, [entries, meaningfulMoments, timelineOnlyMeaningful, timelineYearFilter]);

  // Distinct years for timeline filter
  const distinctYears = useMemo(() => {
    const years = new Set(entries.map((e) => e.entryDate.substring(0, 4)));
    return Array.from(years).sort().reverse();
  }, [entries]);

  // People, Places, Topics lists
  const peopleEntities = entities.filter((e) => e.entityType === "person");
  const placesEntities = entities.filter((e) => e.entityType === "place");
  const topicEntities = entities.filter((e) => e.entityType === "topic" || e.entityType === "project");

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-8 pb-16 animate-fadeIn">
      {/* 1. Header & Introduction */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#45373C]/40 pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-[#D78A70] mb-1.5">
            <Orbit className="w-4 h-4 stroke-[1.8]" />
            <span className="text-xs uppercase tracking-widest font-sans font-medium">
              Memory Universe
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif text-[#F0E8DF] font-normal tracking-tight">
            Your memories, connected.
          </h1>
          <p className="text-sm text-[#A89A98] font-sans mt-1 max-w-2xl leading-relaxed">
            Explore the people, places, ideas, and moments that appear throughout your writing.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setIsConnectModalOpen(true)}
            className="px-4 py-2 bg-[#2B2226] hover:bg-[#45373C]/50 border border-[#45373C] text-[#F0E8DF] rounded-md text-xs font-sans transition-all flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5 text-[#D78A70]" />
            <span>Connect Memories</span>
          </button>

          <button
            type="button"
            onClick={() => setIsScanModalOpen(true)}
            className="px-4 py-2 bg-[#D78A70] hover:bg-[#D78A70]/90 text-[#211A1D] font-medium rounded-md text-xs font-sans transition-all flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Scan Universe</span>
          </button>

          <button
            type="button"
            onClick={onReturnToTonight}
            className="px-3.5 py-2 text-[#A89A98] hover:text-[#F0E8DF] text-xs font-sans transition-colors"
          >
            Back to Tonight
          </button>
        </div>
      </header>

      {/* 2. Sub-Navigation Tabs */}
      <nav aria-label="Universe Navigation" className="flex items-center gap-2 border-b border-[#45373C]/30 pb-3 overflow-x-auto">
        {[
          { id: "graph", label: "Memory Graph", icon: <Network className="w-3.5 h-3.5" /> },
          { id: "people", label: `People (${peopleEntities.length})`, icon: <Users className="w-3.5 h-3.5" /> },
          { id: "places", label: `Places (${placesEntities.length})`, icon: <MapPin className="w-3.5 h-3.5" /> },
          { id: "topics", label: `Topic Clusters (${topicEntities.length})`, icon: <Tag className="w-3.5 h-3.5" /> },
          { id: "timeline", label: "Timeline", icon: <Clock className="w-3.5 h-3.5" /> },
          { id: "connections", label: `Connections (${connections.filter(c => c.status !== 'dismissed').length})`, icon: <LinkIcon className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as UniverseTab)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-sans transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-[#D78A70]/15 text-[#D78A70] border border-[#D78A70]/30 font-medium"
                : "text-[#A89A98] hover:text-[#F0E8DF] hover:bg-[#2B2226]"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* TAB 1: MEMORY GRAPH */}
      {activeTab === "graph" && (
        <section aria-label="Memory Graph" className="flex flex-col gap-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#2B2226]/50 p-3 rounded-lg border border-[#45373C]/40">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-[#A89A98] font-sans mr-1">Filter:</span>
              {[
                { id: "all", label: "All" },
                { id: "entry", label: "Entries" },
                { id: "person", label: "People" },
                { id: "place", label: "Places" },
                { id: "topic", label: "Topics" },
                { id: "project", label: "Projects" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setGraphFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded text-xs font-sans transition-colors ${
                    graphFilter === f.id
                      ? "bg-[#45373C] text-[#F0E8DF] font-medium"
                      : "text-[#A89A98] hover:text-[#F0E8DF]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search & View Mode Toggle */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#A89A98] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search universe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#211A1D] border border-[#45373C]/60 rounded-md pl-8 pr-3 py-1 text-xs text-[#F0E8DF] placeholder-[#A89A98]/60 focus:outline-none focus:border-[#D78A70]/60 w-36 sm:w-48"
                />
              </div>

              {/* Toggle Canvas vs List Mode */}
              <div className="flex items-center bg-[#211A1D] border border-[#45373C]/60 rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("graph")}
                  className={`p-1 rounded text-xs transition-colors ${
                    viewMode === "graph" ? "bg-[#45373C] text-[#F0E8DF]" : "text-[#A89A98]"
                  }`}
                  title="Interactive Graph View"
                  aria-label="Interactive Graph View"
                >
                  <Network className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`p-1 rounded text-xs transition-colors ${
                    viewMode === "list" ? "bg-[#45373C] text-[#F0E8DF]" : "text-[#A89A98]"
                  }`}
                  title="Accessible List View"
                  aria-label="Accessible List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {entries.length === 0 ? (
            <div className="p-12 text-center bg-[#2B2226]/30 border border-[#45373C]/40 rounded-xl my-6">
              <Orbit className="w-10 h-10 text-[#A89A98]/40 mx-auto mb-3 stroke-[1.2]" />
              <h3 className="font-serif text-xl text-[#F0E8DF] mb-2">A quiet beginning</h3>
              <p className="text-xs text-[#A89A98] max-w-md mx-auto leading-relaxed">
                The Memory Universe will develop as your diary grows. Start writing in Tonight to see your memories, people, and ideas connect.
              </p>
            </div>
          ) : viewMode === "graph" ? (
            /* INTERACTIVE SVG GRAPH CANVAS */
            <div className="relative w-full h-[620px] bg-[#211A1D] border border-[#45373C]/40 rounded-xl overflow-hidden select-none">
              {/* Zoom Controls Overlay */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-[#2B2226]/90 border border-[#45373C] rounded-lg p-1.5 backdrop-blur-sm shadow-md">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 text-[#A89A98] hover:text-[#F0E8DF] hover:bg-[#45373C]/40 rounded transition-colors"
                  title="Zoom In (or use Ctrl + Scroll)"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 text-[#A89A98] hover:text-[#F0E8DF] hover:bg-[#45373C]/40 rounded transition-colors"
                  title="Zoom Out (or use Ctrl + Scroll)"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={resetView}
                  className="p-1.5 text-[#A89A98] hover:text-[#F0E8DF] hover:bg-[#45373C]/40 rounded transition-colors"
                  title="Reset View"
                  aria-label="Reset View"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Interaction guidance pill */}
              <div className="absolute top-4 left-4 z-10 bg-[#2B2226]/85 border border-[#45373C]/50 rounded-full px-3 py-1 backdrop-blur-sm text-[11px] font-sans text-[#A89A98] pointer-events-none hidden sm:flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D78A70] animate-pulse" />
                <span>Drag to explore • Ctrl + scroll to zoom • Click any memory to visit</span>
              </div>

              {/* Legend Overlay */}
              <div className="absolute bottom-4 left-4 z-10 bg-[#2B2226]/90 border border-[#45373C]/50 rounded-lg p-2.5 backdrop-blur-sm text-[11px] font-sans flex flex-col gap-1 text-[#A89A98]">
                <div className="text-[10px] uppercase tracking-wider text-[#A89A98]/80 font-medium mb-0.5">
                  Node Types
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full border border-[#D78A70] bg-[#2B2226]" /> Entry
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D78A70]/60" /> Person
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rotate-45 border border-[#A89A98]" /> Place
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded border border-[#D78A70]/40" /> Topic
                  </span>
                </div>
                <div className="mt-1 pt-1 border-t border-[#45373C]/40 flex items-center gap-3 text-[10px]">
                  <span>— Confirmed</span>
                  <span>--- Suggested</span>
                  <span className="text-[#D78A70]">━ User link</span>
                </div>
              </div>

              {/* SVG Surface with distance-checked pointer dragging */}
              <svg
                ref={svgRef}
                className="w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
                viewBox="0 0 1000 800"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onWheel={handleWheel}
              >
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Subtle orbital guideline rings */}
                  <circle cx="500" cy="400" r="140" fill="none" stroke="#45373C" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                  <circle cx="500" cy="400" r="280" fill="none" stroke="#45373C" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.25" />

                  {/* EDGES */}
                  {edges.map((edge) => {
                    const srcNode = nodes.find((n) => n.id === edge.source);
                    const tgtNode = nodes.find((n) => n.id === edge.target);
                    if (!srcNode || !tgtNode) return null;

                    let strokeColor = "#45373C";
                    let strokeDash = "none";
                    let strokeWidth = 1.2;

                    if (edge.origin === "user") {
                      strokeColor = "#D78A70";
                      strokeWidth = 2;
                    } else if (edge.status === "confirmed") {
                      strokeColor = "#A89A98";
                      strokeWidth = 1.4;
                    } else if (edge.status === "suggested") {
                      strokeColor = "#45373C";
                      strokeDash = "4 4";
                    }

                    return (
                      <line
                        key={edge.id}
                        x1={srcNode.x}
                        y1={srcNode.y}
                        x2={tgtNode.x}
                        y2={tgtNode.y}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={strokeDash}
                        opacity={selectedNode && (selectedNode.id === srcNode.id || selectedNode.id === tgtNode.id) ? 1 : 0.6}
                      />
                    );
                  })}

                  {/* NODES */}
                  {nodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={(e) => handleNodeClick(e, node)}
                        className="group cursor-pointer select-none"
                      >
                        {/* Stationary generous hit area with NO scale transform to eliminate cursor jitter */}
                        <circle r={32} fill="transparent" pointerEvents="all" />

                        {/* Subtle velvet halo that fades in smoothly without moving the node */}
                        <circle
                          r={node.type === "entry" ? 24 : 22}
                          fill="#D78A70"
                          opacity="0"
                          className="transition-opacity duration-200 group-hover:opacity-20"
                          pointerEvents="none"
                        />

                        {/* Entry Node */}
                        {node.type === "entry" && (
                          <>
                            <circle
                              r={isSelected ? 18 : 14}
                              fill="#2B2226"
                              stroke={node.isMeaningful ? "#D78A70" : isSelected ? "#F0E8DF" : "#A89A98"}
                              strokeWidth={node.isMeaningful || isSelected ? 2.5 : 1.5}
                              className="transition-all duration-200 group-hover:stroke-[#D78A70] group-hover:stroke-[2.5px]"
                              pointerEvents="none"
                            />
                            {node.isMeaningful && (
                              <circle r="4" fill="#D78A70" pointerEvents="none" />
                            )}
                            <text
                              y={26}
                              textAnchor="middle"
                              fill="#F0E8DF"
                              fontSize="10"
                              fontFamily="sans-serif"
                              opacity={isSelected ? 1 : 0.85}
                              className="transition-colors group-hover:fill-[#FAF6F0]"
                              pointerEvents="none"
                            >
                              {node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label}
                            </text>
                            <text
                              y={38}
                              textAnchor="middle"
                              fill="#A89A98"
                              fontSize="8"
                              fontFamily="sans-serif"
                              opacity="0.6"
                              pointerEvents="none"
                            >
                              {node.sublabel}
                            </text>
                          </>
                        )}

                        {/* Person Node */}
                        {node.type === "person" && (
                          <>
                            <circle
                              r={isSelected ? 16 : 13}
                              fill="#D78A70"
                              fillOpacity={node.status === "confirmed" ? 0.9 : 0.4}
                              stroke="#D78A70"
                              strokeWidth={isSelected ? 2 : 1}
                              className="transition-all duration-200 group-hover:stroke-[#F0E8DF] group-hover:fill-opacity-100"
                              pointerEvents="none"
                            />
                            <text
                              y="3.5"
                              textAnchor="middle"
                              fill="#211A1D"
                              fontSize="9"
                              fontWeight="bold"
                              fontFamily="sans-serif"
                              pointerEvents="none"
                            >
                              {node.label.slice(0, 2).toUpperCase()}
                            </text>
                            <text
                              y={25}
                              textAnchor="middle"
                              fill="#F0E8DF"
                              fontSize="10"
                              fontFamily="sans-serif"
                              pointerEvents="none"
                            >
                              {node.label}
                            </text>
                          </>
                        )}

                        {/* Place Node */}
                        {node.type === "place" && (
                          <>
                            <rect
                              x="-10"
                              y="-10"
                              width="20"
                              height="20"
                              transform="rotate(45)"
                              fill="#2B2226"
                              stroke={node.status === "confirmed" ? "#D78A70" : "#A89A98"}
                              strokeWidth={isSelected ? 2 : 1.2}
                              className="transition-all duration-200 group-hover:stroke-[#D78A70] group-hover:stroke-[2px]"
                              pointerEvents="none"
                            />
                            <text
                              y={26}
                              textAnchor="middle"
                              fill="#F0E8DF"
                              fontSize="10"
                              fontFamily="sans-serif"
                              pointerEvents="none"
                            >
                              {node.label}
                            </text>
                          </>
                        )}

                        {/* Topic or Project Node */}
                        {(node.type === "topic" || node.type === "project") && (
                          <>
                            <rect
                              x="-22"
                              y="-10"
                              width="44"
                              height="20"
                              rx="10"
                              fill="#2B2226"
                              stroke={isSelected ? "#F0E8DF" : "#45373C"}
                              strokeWidth={isSelected ? 2 : 1}
                              className="transition-all duration-200 group-hover:stroke-[#D78A70] group-hover:stroke-[1.5px]"
                              pointerEvents="none"
                            />
                            <text
                              y="3"
                              textAnchor="middle"
                              fill="#D78A70"
                              fontSize="9"
                              fontFamily="sans-serif"
                              pointerEvents="none"
                            >
                              #{node.label.length > 10 ? node.label.slice(0, 8) + "…" : node.label}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* ANIMATED OVERVIEW BOX & VISIT REDIRECT MODAL */}
              {selectedNode && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fadeIn"
                  onClick={() => setSelectedNode(null)}
                >
                  <div
                    className="relative bg-[#2B2226] border border-[#D78A70]/50 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl flex flex-col gap-5 animate-scaleUp"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header with Type, Title, and Close */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-[#D78A70] bg-[#D78A70]/10 px-2 py-0.5 rounded border border-[#D78A70]/20 font-semibold">
                            {selectedNode.type === "entry" ? "Diary Memory" : selectedNode.type}
                          </span>
                          {selectedNode.date && (
                            <span className="text-xs text-[#A89A98] font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#A89A98]/70" />
                              <span>{selectedNode.date}</span>
                            </span>
                          )}
                        </div>

                        <h3 className="font-serif text-2xl text-[#F0E8DF] leading-snug">
                          {selectedNode.label}
                        </h3>

                        {selectedNode.sublabel && (
                          <p className="text-xs text-[#A89A98] font-sans mt-0.5">
                            {selectedNode.sublabel}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedNode(null)}
                        className="text-[#A89A98] hover:text-[#F0E8DF] p-1.5 rounded-lg hover:bg-[#45373C]/40 transition-colors"
                        aria-label="Close overview"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* OVERVIEW CONTENT FOR DIARY ENTRY */}
                    {selectedNode.type === "entry" && selectedNode.entryId && (
                      <div className="flex flex-col gap-4">
                        {(() => {
                          const targetEntry = entries.find((e) => e.id === selectedNode.entryId);
                          if (!targetEntry) return null;
                          const isMeaningful = meaningfulMoments.some((m) => m.entryId === targetEntry.id);

                          return (
                            <>
                              <div className="bg-[#211A1D]/80 border border-[#45373C]/60 rounded-xl p-4 flex flex-col gap-2">
                                <span className="text-[10px] uppercase tracking-wider font-mono text-[#A89A98]/80 font-medium">
                                  Memory Excerpt
                                </span>
                                <p className="text-xs sm:text-sm text-[#F0E8DF]/90 font-sans italic leading-relaxed line-clamp-4">
                                  "{targetEntry.content.slice(0, 260)}{targetEntry.content.length > 260 ? "…" : ""}"
                                </p>
                              </div>

                              {/* Tags */}
                              {targetEntry.tags && targetEntry.tags.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {targetEntry.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="px-2 py-0.5 rounded text-[11px] bg-[#211A1D] text-[#A89A98] border border-[#45373C]/40 font-mono"
                                    >
                                      #{t.replace(/^#/, "")}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* VISIT MEMORY ACTION BUTTON */}
                              <div className="flex flex-col gap-2 pt-2 border-t border-[#45373C]/40">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedNode(null);
                                    onOpenEntry(targetEntry);
                                  }}
                                  className="w-full py-3 px-5 bg-[#D78A70] hover:bg-[#D78A70]/90 text-[#211A1D] rounded-xl font-sans text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-[#D78A70]/20 transition-all duration-150 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                                >
                                  <span>Visit Memory</span>
                                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                                </button>

                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isMeaningful) {
                                        toggleMeaningfulMoment(targetEntry.id);
                                      } else {
                                        setMomentEntryId(targetEntry.id);
                                        setMomentNote("");
                                      }
                                    }}
                                    className={`text-xs font-sans flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                                      isMeaningful
                                        ? "text-[#D78A70] bg-[#D78A70]/10 border border-[#D78A70]/30"
                                        : "text-[#A89A98] hover:text-[#F0E8DF]"
                                    }`}
                                  >
                                    <Star className={`w-3.5 h-3.5 ${isMeaningful ? "fill-[#D78A70]" : ""}`} />
                                    <span>{isMeaningful ? "Meaningful Moment marked" : "Mark as Meaningful Moment"}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setSelectedNode(null)}
                                    className="text-xs text-[#A89A98] hover:text-[#F0E8DF] px-2 py-1"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* OVERVIEW CONTENT FOR ENTITY (PERSON, PLACE, TOPIC, PROJECT) */}
                    {selectedNode.type !== "entry" && selectedNode.entityId && (
                      <div className="flex flex-col gap-4">
                        {(() => {
                          const targetEntity = entities.find((e) => e.id === selectedNode.entityId);
                          if (!targetEntity) return null;
                          const entityMentions = mentions.filter((m) => m.entityId === targetEntity.id);

                          return (
                            <>
                              <div className="flex items-center justify-between text-xs font-sans pb-2 border-b border-[#45373C]/40">
                                <span className="text-[#A89A98]">
                                  Appears in {entityMentions.length} {entityMentions.length === 1 ? "memory" : "memories"}:
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium ${
                                    targetEntity.confirmationStatus === "confirmed"
                                      ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                                      : "bg-[#45373C]/60 text-[#F0E8DF]"
                                  }`}
                                >
                                  {targetEntity.confirmationStatus}
                                </span>
                              </div>

                              {/* List of associated memories with Visit buttons */}
                              <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-1">
                                {entityMentions.map((m) => {
                                  const parentEntry = entries.find((e) => e.id === m.entryId);
                                  if (!parentEntry) return null;

                                  return (
                                    <div
                                      key={m.id}
                                      className="bg-[#211A1D]/80 border border-[#45373C]/50 rounded-xl p-3 flex flex-col gap-2"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono text-[#D78A70]">
                                          {parentEntry.entryDate}
                                        </span>
                                        <span className="font-serif text-xs text-[#F0E8DF] truncate max-w-[180px]">
                                          {parentEntry.title || "Untitled"}
                                        </span>
                                      </div>
                                      <p className="text-xs text-[#A89A98] font-sans italic line-clamp-2">
                                        "{m.excerpt || parentEntry.content.slice(0, 100)}..."
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedNode(null);
                                          onOpenEntry(parentEntry);
                                        }}
                                        className="self-end px-3 py-1 bg-[#D78A70] hover:bg-[#D78A70]/90 text-[#211A1D] rounded-md font-sans text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                      >
                                        <span>Visit Memory</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Entity Confirmation Actions */}
                              <div className="flex items-center gap-2 pt-2 border-t border-[#45373C]/40">
                                {targetEntity.confirmationStatus !== "confirmed" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmEntity(targetEntity)}
                                    className="flex-1 py-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/50 text-emerald-300 rounded-lg text-xs font-sans transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Confirm Identity</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleDismissEntity(targetEntity)}
                                    className="flex-1 py-2 bg-[#45373C]/40 hover:bg-[#45373C] text-[#A89A98] hover:text-[#F0E8DF] rounded-lg text-xs font-sans transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ACCESSIBLE LIST VIEW ALTERNATIVE */
            <div className="flex flex-col gap-4 bg-[#2B2226]/40 border border-[#45373C]/40 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl text-[#F0E8DF]">Connected Memories (Accessible List)</h3>
                <span className="text-xs text-[#A89A98] font-sans">{nodes.length} nodes recorded</span>
              </div>
              <p className="text-xs text-[#A89A98] font-sans">
                A screen-reader friendly and linear hierarchy of all recorded diary nodes, topics, people, and places.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-4 bg-[#211A1D] border border-[#45373C]/50 rounded-lg flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono text-[#D78A70]">
                          {node.type}
                        </span>
                        {node.sublabel && (
                          <span className="text-[10px] text-[#A89A98] font-sans">{node.sublabel}</span>
                        )}
                      </div>
                      <h4 className="font-serif text-base text-[#F0E8DF] mt-1">{node.label}</h4>
                    </div>

                    {node.entryId && (
                      <button
                        type="button"
                        onClick={() => {
                          const entry = entries.find((e) => e.id === node.entryId);
                          if (entry) onOpenEntry(entry);
                        }}
                        className="text-left text-xs text-[#D78A70] hover:underline font-sans flex items-center gap-1"
                      >
                        <span>Open diary entry</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: PEOPLE EXPLORER */}
      {activeTab === "people" && (
        <section aria-label="People Explorer" className="flex flex-col gap-6">
          <div className="bg-[#2B2226]/40 p-5 rounded-xl border border-[#45373C]/40">
            <h2 className="font-serif text-2xl text-[#F0E8DF] mb-1">People in Your Diary</h2>
            <p className="text-xs text-[#A89A98] font-sans max-w-2xl leading-relaxed">
              Names mentioned across your memories. Identities remain tentative until you confirm them.
              AFTERTHOUGHT never synchronizes contacts or assumes personal relationships without your guidance.
            </p>
          </div>

          {peopleEntities.length === 0 ? (
            <div className="p-12 text-center bg-[#2B2226]/20 border border-[#45373C]/30 rounded-xl">
              <Users className="w-8 h-8 text-[#A89A98]/40 mx-auto mb-2.5 stroke-[1.2]" />
              <p className="text-sm text-[#F0E8DF] font-serif mb-1">No people recorded yet</p>
              <p className="text-xs text-[#A89A98]">
                Mention friends or mentors in Tonight or use "Scan Universe" to discover candidates.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {peopleEntities.map((person) => {
                const personMentions = mentions.filter((m) => m.entityId === person.id);

                return (
                  <div
                    key={person.id}
                    className="p-5 bg-[#2B2226] border border-[#45373C]/50 rounded-xl flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#D78A70]/20 border border-[#D78A70]/40 flex items-center justify-center text-xs font-bold text-[#D78A70]">
                            {person.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            {editingEntityId === person.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="bg-[#211A1D] border border-[#D78A70] rounded px-2 py-0.5 text-xs text-[#F0E8DF]"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRename(person)}
                                  className="p-1 text-emerald-400 hover:text-emerald-300"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEntityId(null)}
                                  className="p-1 text-[#A89A98]"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <h3 className="font-serif text-lg text-[#F0E8DF]">
                                {person.displayName}
                              </h3>
                            )}

                            {/* Relationship Label Tag */}
                            {editingRelEntityId === person.id ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <input
                                  type="text"
                                  placeholder="e.g. Mentor, Friend"
                                  value={editingRelLabel}
                                  onChange={(e) => setEditingRelLabel(e.target.value)}
                                  className="bg-[#211A1D] border border-[#45373C] rounded px-1.5 py-0.5 text-[11px] text-[#F0E8DF] w-28"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRelationshipLabel(person)}
                                  className="p-1 text-emerald-400"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingRelEntityId(null)}
                                  className="p-1 text-[#A89A98]"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRelEntityId(person.id);
                                  setEditingRelLabel(person.relationshipLabel || "");
                                }}
                                className="text-[11px] text-[#A89A98] hover:text-[#D78A70] font-sans flex items-center gap-1 mt-0.5"
                              >
                                <span>{person.relationshipLabel || "+ Add relationship label"}</span>
                                <Edit2 className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            )}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium tracking-wide ${
                            person.confirmationStatus === "confirmed"
                              ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                              : person.confirmationStatus === "dismissed"
                              ? "bg-red-950/60 text-red-300 border border-red-800/40"
                              : "bg-[#45373C]/60 text-[#F0E8DF]"
                          }`}
                        >
                          {person.confirmationStatus}
                        </span>
                      </div>

                      {/* Excerpts Preview */}
                      <div className="mt-4 flex flex-col gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-[#A89A98]/70 font-sans">
                          Mentions ({personMentions.length})
                        </span>
                        {personMentions.slice(0, 2).map((m) => (
                          <div
                            key={m.id}
                            className="text-xs text-[#F0E8DF]/80 font-sans bg-[#211A1D]/50 p-2 rounded border border-[#45373C]/30"
                          >
                            <p className="line-clamp-2 italic">"{m.excerpt || m.originalText}"</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#45373C]/40 text-xs font-sans">
                      <div className="flex items-center gap-2">
                        {person.confirmationStatus !== "confirmed" ? (
                          <button
                            type="button"
                            onClick={() => handleConfirmEntity(person)}
                            className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/50 text-emerald-300 rounded text-xs transition-colors"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDismissEntity(person)}
                            className="px-2 py-1 text-[#A89A98] hover:text-[#F0E8DF]"
                          >
                            Dismiss
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setEditingEntityId(person.id);
                            setEditingName(person.displayName);
                          }}
                          className="px-2 py-1 text-[#A89A98] hover:text-[#F0E8DF]"
                        >
                          Rename
                        </button>
                      </div>

                      {/* Open first entry */}
                      {personMentions[0] && (
                        <button
                          type="button"
                          onClick={() => {
                            const entry = entries.find((e) => e.id === personMentions[0].entryId);
                            if (entry) onOpenEntry(entry);
                          }}
                          className="text-[#D78A70] hover:underline text-xs flex items-center gap-1"
                        >
                          <span>View Entry</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: PLACES EXPLORER */}
      {activeTab === "places" && (
        <section aria-label="Places Explorer" className="flex flex-col gap-6">
          <div className="bg-[#2B2226]/40 p-5 rounded-xl border border-[#45373C]/40">
            <h2 className="font-serif text-2xl text-[#F0E8DF] mb-1">Places & Destinations</h2>
            <p className="text-xs text-[#A89A98] font-sans max-w-2xl leading-relaxed">
              Locations, cities, and spaces mentioned in your diary entries.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-200/80 bg-amber-950/20 border border-amber-800/30 px-3 py-1.5 rounded-md w-fit">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Privacy protected: AFTERTHOUGHT never uses GPS tracking or geocodes your private writings.</span>
            </div>
          </div>

          {placesEntities.length === 0 ? (
            <div className="p-12 text-center bg-[#2B2226]/20 border border-[#45373C]/30 rounded-xl">
              <MapPin className="w-8 h-8 text-[#A89A98]/40 mx-auto mb-2.5 stroke-[1.2]" />
              <p className="text-sm text-[#F0E8DF] font-serif mb-1">No places recorded yet</p>
              <p className="text-xs text-[#A89A98]">
                Write about trips, cafes, or hometowns in Tonight to populate this explorer.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {placesEntities.map((place) => {
                const placeMentions = mentions.filter((m) => m.entityId === place.id);

                return (
                  <div
                    key={place.id}
                    className="p-5 bg-[#2B2226] border border-[#45373C]/50 rounded-xl flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <MapPin className="w-4 h-4 text-[#D78A70]" />
                          <h3 className="font-serif text-lg text-[#F0E8DF]">{place.displayName}</h3>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium ${
                            place.confirmationStatus === "confirmed"
                              ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                              : "bg-[#45373C]/60 text-[#F0E8DF]"
                          }`}
                        >
                          {place.confirmationStatus}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-[#A89A98]/70 font-sans">
                          Mentions ({placeMentions.length})
                        </span>
                        {placeMentions.slice(0, 2).map((m) => (
                          <div
                            key={m.id}
                            className="text-xs text-[#F0E8DF]/80 font-sans bg-[#211A1D]/50 p-2 rounded border border-[#45373C]/30"
                          >
                            <p className="line-clamp-2 italic">"{m.excerpt || m.originalText}"</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#45373C]/40 text-xs font-sans">
                      <div className="flex items-center gap-2">
                        {place.confirmationStatus !== "confirmed" ? (
                          <button
                            type="button"
                            onClick={() => handleConfirmEntity(place)}
                            className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/50 text-emerald-300 rounded text-xs transition-colors"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDismissEntity(place)}
                            className="px-2 py-1 text-[#A89A98] hover:text-[#F0E8DF]"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>

                      {placeMentions[0] && (
                        <button
                          type="button"
                          onClick={() => {
                            const entry = entries.find((e) => e.id === placeMentions[0].entryId);
                            if (entry) onOpenEntry(entry);
                          }}
                          className="text-[#D78A70] hover:underline text-xs flex items-center gap-1"
                        >
                          <span>View Entry</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: TOPIC CLUSTERS */}
      {activeTab === "topics" && (
        <section aria-label="Topic Clusters" className="flex flex-col gap-6">
          <div className="bg-[#2B2226]/40 p-5 rounded-xl border border-[#45373C]/40">
            <h2 className="font-serif text-2xl text-[#F0E8DF] mb-1">Topic Clusters & Themes</h2>
            <p className="text-xs text-[#A89A98] font-sans max-w-2xl leading-relaxed">
              Topics grouped from your diary tags, recurring projects, and thematic subjects.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {topicEntities.map((topic) => {
              const topicMentions = mentions.filter((m) => m.entityId === topic.id);

              return (
                <div
                  key={topic.id}
                  className="p-5 bg-[#2B2226] border border-[#45373C]/50 rounded-xl flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-[#D78A70]" />
                        <h3 className="font-serif text-lg text-[#F0E8DF]">#{topic.displayName}</h3>
                      </div>
                      <span className="text-xs text-[#A89A98] font-mono">
                        {topicMentions.length} {topicMentions.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                      {topicMentions.slice(0, 2).map((m) => (
                        <div
                          key={m.id}
                          className="text-xs text-[#F0E8DF]/80 font-sans bg-[#211A1D]/50 p-2 rounded border border-[#45373C]/30"
                        >
                          <p className="line-clamp-2 italic">"{m.excerpt || m.originalText}"</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#45373C]/40 text-xs font-sans">
                    <span className="text-[#A89A98]">
                      {topic.confirmationStatus === "confirmed" ? "Confirmed theme" : "Discovered tag"}
                    </span>
                    {topicMentions[0] && (
                      <button
                        type="button"
                        onClick={() => {
                          const entry = entries.find((e) => e.id === topicMentions[0].entryId);
                          if (entry) onOpenEntry(entry);
                        }}
                        className="text-[#D78A70] hover:underline text-xs flex items-center gap-1"
                      >
                        <span>Open Entry</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 5: PERSONAL TIMELINE */}
      {activeTab === "timeline" && (
        <section aria-label="Personal Timeline" className="flex flex-col gap-6">
          {/* Timeline Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#2B2226]/40 p-4 rounded-xl border border-[#45373C]/40">
            <div>
              <h2 className="font-serif text-2xl text-[#F0E8DF]">Personal Timeline</h2>
              <p className="text-xs text-[#A89A98] font-sans mt-0.5">
                A chronological stream of your written memories and user-marked meaningful moments.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Year Filter */}
              <select
                value={timelineYearFilter}
                onChange={(e) => setTimelineYearFilter(e.target.value)}
                className="bg-[#211A1D] border border-[#45373C] text-[#F0E8DF] rounded-md px-3 py-1.5 text-xs font-sans focus:outline-none"
              >
                <option value="all">All Years</option>
                {distinctYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Only Meaningful Moments Filter */}
              <button
                type="button"
                onClick={() => setTimelineOnlyMeaningful(!timelineOnlyMeaningful)}
                className={`px-3 py-1.5 rounded-md text-xs font-sans transition-all flex items-center gap-1.5 border ${
                  timelineOnlyMeaningful
                    ? "bg-[#D78A70]/15 text-[#D78A70] border-[#D78A70]/40 font-medium"
                    : "bg-[#211A1D] border-[#45373C] text-[#A89A98] hover:text-[#F0E8DF]"
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${timelineOnlyMeaningful ? "fill-[#D78A70]" : ""}`} />
                <span>Meaningful Moments Only</span>
              </button>
            </div>
          </div>

          {/* Timeline Stream */}
          <div className="relative pl-6 sm:pl-8 border-l border-[#45373C]/60 flex flex-col gap-8 ml-3 sm:ml-4 my-2">
            {timelineEntries.map((entry) => {
              const moment = meaningfulMoments.find((m) => m.entryId === entry.id);
              const isMeaningful = !!moment;

              return (
                <div key={entry.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 transition-transform group-hover:scale-125 flex items-center justify-center ${
                      isMeaningful
                        ? "bg-[#D78A70] border-[#F0E8DF] shadow-md shadow-[#D78A70]/30"
                        : "bg-[#211A1D] border-[#A89A98]"
                    }`}
                  >
                    {isMeaningful && <span className="w-1.5 h-1.5 rounded-full bg-[#211A1D]" />}
                  </div>

                  {/* Entry Card */}
                  <div className="bg-[#2B2226] border border-[#45373C]/50 rounded-xl p-5 hover:border-[#D78A70]/40 transition-all flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#D78A70]">{entry.entryDate}</span>
                          {isMeaningful && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-[#D78A70]/20 text-[#D78A70] border border-[#D78A70]/40 font-sans font-medium flex items-center gap-1">
                              <Star className="w-3 h-3 fill-[#D78A70]" />
                              <span>Meaningful Moment</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-serif text-xl text-[#F0E8DF] mt-1">
                          {entry.title || "Untitled Echo"}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (isMeaningful) {
                              toggleMeaningfulMoment(entry.id);
                            } else {
                              setMomentEntryId(entry.id);
                              setMomentNote("");
                            }
                          }}
                          className={`p-1.5 rounded text-xs transition-colors ${
                            isMeaningful
                              ? "text-[#D78A70] hover:text-[#D78A70]/70"
                              : "text-[#A89A98] hover:text-[#F0E8DF]"
                          }`}
                          title={isMeaningful ? "Remove Meaningful Moment" : "Mark as Meaningful Moment"}
                        >
                          <Star className={`w-4 h-4 ${isMeaningful ? "fill-[#D78A70]" : ""}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenEntry(entry)}
                          className="px-3 py-1 bg-[#211A1D] hover:bg-[#45373C]/40 border border-[#45373C] text-[#F0E8DF] rounded text-xs font-sans transition-colors flex items-center gap-1.5"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-[#F0E8DF]/80 font-sans leading-relaxed line-clamp-3">
                      {entry.content}
                    </p>

                    {/* Personal Reflection Note if marked */}
                    {moment?.note && (
                      <div className="bg-[#211A1D]/70 border-l-2 border-[#D78A70] p-2.5 rounded-r text-xs text-[#A89A98] font-sans italic">
                        "{moment.note}"
                      </div>
                    )}

                    {/* Entry Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {entry.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded text-[10px] bg-[#211A1D] text-[#A89A98] border border-[#45373C]/40 font-mono"
                          >
                            #{t.replace(/^#/, "")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 6: MEMORY CONNECTIONS */}
      {activeTab === "connections" && (
        <section aria-label="Memory Connections" className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#2B2226]/40 p-5 rounded-xl border border-[#45373C]/40">
            <div>
              <h2 className="font-serif text-2xl text-[#F0E8DF]">Memory Connections</h2>
              <p className="text-xs text-[#A89A98] font-sans max-w-xl mt-0.5">
                Relationships discovered between your memories. You decide which connections are accepted, dismissed, or created by hand.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsConnectModalOpen(true)}
              className="px-4 py-2 bg-[#D78A70] hover:bg-[#D78A70]/90 text-[#211A1D] rounded-md text-xs font-sans font-medium transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Two Memories</span>
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {connections
              .filter((c) => c.status !== "dismissed")
              .map((conn) => {
                const src = entries.find((e) => e.id === conn.sourceEntryId);
                const tgt = entries.find((e) => e.id === conn.targetEntryId);

                return (
                  <div
                    key={conn.id}
                    className="p-5 bg-[#2B2226] border border-[#45373C]/50 rounded-xl flex flex-col gap-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-medium ${
                              conn.origin === "user"
                                ? "bg-[#D78A70]/20 text-[#D78A70] border border-[#D78A70]/40"
                                : conn.status === "accepted"
                                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                                : "bg-[#45373C]/60 text-[#F0E8DF]"
                            }`}
                          >
                            {conn.origin === "user" ? "User Connection" : conn.status === "accepted" ? "Accepted" : "Suggested Link"}
                          </span>
                          <span className="text-xs text-[#A89A98] font-mono">
                            Type: {conn.connectionType}
                          </span>
                        </div>
                        <h4 className="font-serif text-base text-[#F0E8DF] mt-1.5">
                          {conn.explanation}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {conn.status !== "accepted" && (
                          <button
                            type="button"
                            onClick={() => handleAcceptConnection(conn)}
                            className="px-3 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/50 text-emerald-300 rounded text-xs transition-colors"
                          >
                            Accept
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDismissConnection(conn)}
                          className="px-2.5 py-1 text-[#A89A98] hover:text-[#F0E8DF] text-xs transition-colors"
                        >
                          Dismiss
                        </button>
                        {conn.origin === "user" && (
                          <button
                            type="button"
                            onClick={() => deleteConnection(conn.id)}
                            className="p-1 text-red-400 hover:text-red-300"
                            title="Remove connection"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Excerpt comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#45373C]/40">
                      <div className="bg-[#211A1D]/60 p-3 rounded border border-[#45373C]/30 flex flex-col justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-[#D78A70] font-mono">
                            {src?.entryDate || "Source Entry"}
                          </span>
                          <h5 className="font-serif text-sm text-[#F0E8DF]">
                            {src?.title || "Untitled"}
                          </h5>
                          <p className="text-xs text-[#A89A98] italic mt-1 line-clamp-2">
                            "{conn.supportingEvidence?.[0]?.excerpt || src?.content.slice(0, 100)}..."
                          </p>
                        </div>
                        {src && (
                          <button
                            type="button"
                            onClick={() => onOpenEntry(src)}
                            className="text-[11px] text-[#D78A70] hover:underline self-start flex items-center gap-1"
                          >
                            <span>Open entry</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

                      <div className="bg-[#211A1D]/60 p-3 rounded border border-[#45373C]/30 flex flex-col justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-[#D78A70] font-mono">
                            {tgt?.entryDate || "Target Entry"}
                          </span>
                          <h5 className="font-serif text-sm text-[#F0E8DF]">
                            {tgt?.title || "Untitled"}
                          </h5>
                          <p className="text-xs text-[#A89A98] italic mt-1 line-clamp-2">
                            "{conn.supportingEvidence?.[1]?.excerpt || tgt?.content.slice(0, 100)}..."
                          </p>
                        </div>
                        {tgt && (
                          <button
                            type="button"
                            onClick={() => onOpenEntry(tgt)}
                            className="text-[11px] text-[#D78A70] hover:underline self-start flex items-center gap-1"
                          >
                            <span>Open entry</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* MODAL: MANUAL CONNECTION CREATOR */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#2B2226] border border-[#45373C] rounded-xl max-w-lg w-full p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-2xl text-[#F0E8DF]">Connect Two Memories</h3>
                <p className="text-xs text-[#A89A98] font-sans mt-0.5">
                  Link any two diary entries and record what connects them in your mind.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(false)}
                className="text-[#A89A98] hover:text-[#F0E8DF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserConnection} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-sans text-[#F0E8DF]">First Memory (Source)</label>
                <select
                  value={connSourceId}
                  onChange={(e) => setConnSourceId(e.target.value)}
                  required
                  className="bg-[#211A1D] border border-[#45373C] text-[#F0E8DF] rounded-md p-2 text-xs font-sans focus:outline-none focus:border-[#D78A70]"
                >
                  <option value="">Select an entry...</option>
                  {entries.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.entryDate} — {e.title || "Untitled"} ({e.content.slice(0, 30)}…)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-sans text-[#F0E8DF]">Second Memory (Target)</label>
                <select
                  value={connTargetId}
                  onChange={(e) => setConnTargetId(e.target.value)}
                  required
                  className="bg-[#211A1D] border border-[#45373C] text-[#F0E8DF] rounded-md p-2 text-xs font-sans focus:outline-none focus:border-[#D78A70]"
                >
                  <option value="">Select an entry...</option>
                  {entries
                    .filter((e) => e.id !== connSourceId)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.entryDate} — {e.title || "Untitled"} ({e.content.slice(0, 30)}…)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-sans text-[#F0E8DF]">Why do these entries connect?</label>
                <textarea
                  rows={3}
                  value={connNote}
                  onChange={(e) => setConnNote(e.target.value)}
                  placeholder="e.g. This entry reminded me of how much my confidence grew since that earlier project..."
                  className="bg-[#211A1D] border border-[#45373C] text-[#F0E8DF] rounded-md p-2.5 text-xs font-sans focus:outline-none focus:border-[#D78A70] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#45373C]/40">
                <button
                  type="button"
                  onClick={() => setIsConnectModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#A89A98] hover:text-[#F0E8DF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!connSourceId || !connTargetId || connSourceId === connTargetId}
                  className="px-4 py-2 bg-[#D78A70] hover:bg-[#D78A70]/90 text-[#211A1D] font-medium rounded text-xs transition-colors disabled:opacity-50"
                >
                  Save Connection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AI / HEURISTIC SCAN & CONSENT */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#2B2226] border border-[#45373C] rounded-xl max-w-md w-full p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-2xl text-[#F0E8DF]">Scan Memory Universe</h3>
                <p className="text-xs text-[#A89A98] font-sans mt-0.5">
                  Notice recurring people, places, topics, and connections.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScanModalOpen(false)}
                className="text-[#A89A98] hover:text-[#F0E8DF]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs text-[#A89A98] font-sans leading-relaxed">
              <div className="bg-[#211A1D] p-3 rounded border border-[#45373C]/40 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[#D78A70] font-medium">
                  <Shield className="w-4 h-4" />
                  <span>Privacy First Architecture</span>
                </div>
                <p className="text-[11px]">
                  • Only selected excerpts are scanned; never your full diary.<br />
                  • Letters to your future self are NEVER transmitted.<br />
                  • Suggestions remain tentative until you confirm them.
                </p>
              </div>

              {scanMessage && (
                <div className="p-3 bg-[#45373C]/30 text-[#F0E8DF] border border-[#45373C] rounded text-xs">
                  {scanMessage}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                disabled={isScanning}
                onClick={() => handlePerformScan(true)}
                className="w-full py-2.5 bg-[#D78A70] hover:bg-[#D78A70]/90 text-[#211A1D] font-medium rounded text-xs font-sans transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isScanning ? "Scanning with AI..." : "Scan with Gemini AI (Requires Consent)"}</span>
              </button>

              <button
                type="button"
                disabled={isScanning}
                onClick={() => handlePerformScan(false)}
                className="w-full py-2 bg-[#211A1D] hover:bg-[#45373C]/40 border border-[#45373C] text-[#F0E8DF] rounded text-xs font-sans transition-colors flex items-center justify-center gap-2"
              >
                <span>Scan with Local Heuristics (100% Offline)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MEANINGFUL MOMENT NOTE */}
      {momentEntryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#2B2226] border border-[#45373C] rounded-xl max-w-sm w-full p-5 flex flex-col gap-4 shadow-2xl">
            <h3 className="font-serif text-xl text-[#F0E8DF]">Mark as Meaningful Moment</h3>
            <p className="text-xs text-[#A89A98] font-sans">
              Add an optional personal note explaining why this moment was meaningful to you.
            </p>

            <textarea
              rows={3}
              value={momentNote}
              onChange={(e) => setMomentNote(e.target.value)}
              placeholder="e.g. The night I realized what direction I wanted my career to go in..."
              className="bg-[#211A1D] border border-[#45373C] text-[#F0E8DF] rounded p-2.5 text-xs font-sans focus:outline-none focus:border-[#D78A70] resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#45373C]/40">
              <button
                type="button"
                onClick={() => setMomentEntryId(null)}
                className="px-3 py-1.5 text-xs text-[#A89A98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleMomentWithNote(momentEntryId)}
                className="px-3 py-1.5 bg-[#D78A70] hover:bg-[#D78A70]/90 text-[#211A1D] font-medium rounded text-xs font-sans"
              >
                Save Moment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

