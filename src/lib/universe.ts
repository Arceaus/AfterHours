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
  ConnectionOrigin,
  ConnectionStatus,
  EvidenceItem,
} from "@/types/entry";

export const UNIVERSE_STORAGE_KEYS = {
  ENTITIES: "afterthought_universe_entities_v1",
  MENTIONS: "afterthought_universe_mentions_v1",
  CONNECTIONS: "afterthought_universe_connections_v1",
  MOMENTS: "afterthought_meaningful_moments_v1",
  AI_CONSENT: "afterthought_universe_ai_consent_v1",
};

// Check if window is available
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

// Storage helpers
export function getStoredEntities(): MemoryEntity[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(UNIVERSE_STORAGE_KEYS.ENTITIES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredEntities(entities: MemoryEntity[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(UNIVERSE_STORAGE_KEYS.ENTITIES, JSON.stringify(entities));
  } catch (err) {
    console.warn("Failed to save universe entities to localStorage", err);
  }
}

export function getStoredMentions(): MemoryMention[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(UNIVERSE_STORAGE_KEYS.MENTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredMentions(mentions: MemoryMention[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(UNIVERSE_STORAGE_KEYS.MENTIONS, JSON.stringify(mentions));
  } catch (err) {
    console.warn("Failed to save universe mentions to localStorage", err);
  }
}

export function getStoredConnections(): UniverseConnection[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(UNIVERSE_STORAGE_KEYS.CONNECTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredConnections(conns: UniverseConnection[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(UNIVERSE_STORAGE_KEYS.CONNECTIONS, JSON.stringify(conns));
  } catch (err) {
    console.warn("Failed to save universe connections to localStorage", err);
  }
}

export function getStoredMeaningfulMoments(): MeaningfulMoment[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(UNIVERSE_STORAGE_KEYS.MOMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredMeaningfulMoments(moments: MeaningfulMoment[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(UNIVERSE_STORAGE_KEYS.MOMENTS, JSON.stringify(moments));
  } catch (err) {
    console.warn("Failed to save meaningful moments to localStorage", err);
  }
}

export function getStoredAiConsent(): boolean {
  if (!isBrowser()) return false;
  try {
    return localStorage.getItem(UNIVERSE_STORAGE_KEYS.AI_CONSENT) === "true";
  } catch {
    return false;
  }
}

export function setStoredAiConsent(consent: boolean): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(UNIVERSE_STORAGE_KEYS.AI_CONSENT, consent ? "true" : "false");
  } catch (err) {
    console.warn("Failed to save AI consent to localStorage", err);
  }
}

// Disallowed proper nouns that are common diary words
const IGNORE_WORDS = new Set([
  "today", "tonight", "tomorrow", "yesterday", "afterthought", "i", "me", "my", "we", "our",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
  "morning", "afternoon", "evening", "night", "god", "lord", "the", "a", "an", "this", "that",
  "here", "there", "home", "work", "life", "time", "day", "week", "month", "year"
]);

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Built-in grounded heuristic entity extractor
 * Scans diary entries for people, places, topics, and projects using cautious textual patterns.
 */
export function extractHeuristicEntities(entries: DiaryEntry[]): {
  entities: MemoryEntity[];
  mentions: MemoryMention[];
  connections: UniverseConnection[];
} {
  const existingEntities = getStoredEntities();
  const existingEntityMap = new Map<string, MemoryEntity>();
  for (const ent of existingEntities) {
    existingEntityMap.set(`${ent.entityType}:${ent.normalizedName}`, ent);
  }

  const newEntities: MemoryEntity[] = [...existingEntities];
  const newMentions: MemoryMention[] = [];
  const entityOccurrences = new Map<string, { entity: MemoryEntity; entryIds: Set<string>; excerpts: EvidenceItem[] }>();

  function registerEntity(name: string, type: EntityType, entry: DiaryEntry, excerpt: string): MemoryEntity {
    const norm = normalizeName(name);
    const key = `${type}:${norm}`;
    let ent = existingEntityMap.get(key);

    if (!ent) {
      ent = {
        id: `ent_${type}_${norm}_${Math.random().toString(36).substring(2, 9)}`,
        entityType: type,
        displayName: name.trim(),
        normalizedName: norm,
        confirmationStatus: "suggested",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      existingEntityMap.set(key, ent);
      newEntities.push(ent);
    }

    // Record mention
    newMentions.push({
      id: `men_${entry.id}_${ent.id}_${Math.random().toString(36).substring(2, 7)}`,
      entryId: entry.id,
      entityId: ent.id,
      originalText: name.trim(),
      excerpt: excerpt.trim(),
      confidence: 0.75,
      confirmationStatus: ent.confirmationStatus,
      createdAt: new Date().toISOString(),
    });

    // Record occurrence for connection generation
    if (!entityOccurrences.has(ent.id)) {
      entityOccurrences.set(ent.id, {
        entity: ent,
        entryIds: new Set(),
        excerpts: [],
      });
    }
    const occ = entityOccurrences.get(ent.id)!;
    occ.entryIds.add(entry.id);
    if (occ.excerpts.length < 3) {
      occ.excerpts.push({
        entryId: entry.id,
        entryDate: entry.entryDate,
        title: entry.title,
        excerpt: excerpt.trim(),
      });
    }

    return ent;
  }

  // Regex patterns
  const personPattern = /\b(?:with|met|spoke with|talked to|called|visited|saw)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
  const placePattern = /\b(?:in|at|flew to|traveled to|traveling to|moved to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
  const projectPattern = /\b(?:working on|building|finishing|developing|project)\s+([A-Za-z0-9_\-\s]{3,20})\b/gi;

  for (const entry of entries) {
    const text = `${entry.title || ""} ${entry.content}`;
    const sentences = text.split(/(?<=[.!?])\s+/);

    // 1. Tags as Topics
    for (const tag of entry.tags || []) {
      const cleanTag = tag.replace(/^#/, "").trim();
      if (cleanTag.length >= 2) {
        registerEntity(cleanTag, "topic", entry, sentences[0] || entry.content.slice(0, 100));
      }
    }

    // 2. People Mentions
    for (const s of sentences) {
      let match: RegExpExecArray | null;
      while ((match = personPattern.exec(s)) !== null) {
        const candidate = match[1].trim();
        const norm = normalizeName(candidate);
        if (norm && !IGNORE_WORDS.has(norm) && candidate.length > 2) {
          registerEntity(candidate, "person", entry, s);
        }
      }
    }

    // 3. Places Mentions
    for (const s of sentences) {
      let match: RegExpExecArray | null;
      while ((match = placePattern.exec(s)) !== null) {
        const candidate = match[1].trim();
        const norm = normalizeName(candidate);
        if (norm && !IGNORE_WORDS.has(norm) && candidate.length > 2) {
          registerEntity(candidate, "place", entry, s);
        }
      }
    }

    // 4. Project Mentions
    for (const s of sentences) {
      let match: RegExpExecArray | null;
      while ((match = projectPattern.exec(s)) !== null) {
        const candidate = match[1].trim();
        const norm = normalizeName(candidate);
        if (norm && !IGNORE_WORDS.has(norm) && candidate.length > 2 && candidate.split(" ").length <= 3) {
          registerEntity(candidate, "project", entry, s);
        }
      }
    }
  }

  // 5. Generate candidate connections between entries sharing entities
  const existingConns = getStoredConnections();
  const connKeySet = new Set(
    existingConns.map((c) => `${c.sourceEntryId}:${c.targetEntryId}:${c.connectionType}`)
  );
  const newConnections: UniverseConnection[] = [...existingConns];

  for (const [, occ] of entityOccurrences) {
    if (occ.entity.confirmationStatus === "dismissed") continue;
    const entryIds = Array.from(occ.entryIds);
    if (entryIds.length >= 2) {
      for (let i = 0; i < entryIds.length; i++) {
        for (let j = i + 1; j < entryIds.length; j++) {
          const src = entryIds[i];
          const tgt = entryIds[j];
          const key1 = `${src}:${tgt}:${occ.entity.entityType}`;
          const key2 = `${tgt}:${src}:${occ.entity.entityType}`;

          if (!connKeySet.has(key1) && !connKeySet.has(key2)) {
            connKeySet.add(key1);
            connKeySet.add(key2);

            let explanation = `Both entries discuss the topic "${occ.entity.displayName}".`;
            if (occ.entity.entityType === "person") {
              explanation = `Both entries mention ${occ.entity.displayName}.`;
            } else if (occ.entity.entityType === "place") {
              explanation = `Both entries are associated with ${occ.entity.displayName}.`;
            } else if (occ.entity.entityType === "project") {
              explanation = `Both entries relate to project "${occ.entity.displayName}".`;
            }

            newConnections.push({
              id: `conn_${src}_${tgt}_${Math.random().toString(36).substring(2, 7)}`,
              sourceEntryId: src,
              targetEntryId: tgt,
              connectionType: occ.entity.entityType,
              explanation,
              supportingEvidence: occ.excerpts.filter((e) => e.entryId === src || e.entryId === tgt),
              origin: "heuristic",
              status: "suggested",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  return {
    entities: newEntities,
    mentions: newMentions,
    connections: newConnections,
  };
}

/**
 * Builds layout nodes and edges for the SVG Memory Graph
 * Layout: Center origin with organic radial/concentric force simulation.
 */
export function buildGraphLayout(
  entries: DiaryEntry[],
  entities: MemoryEntity[],
  mentions: MemoryMention[],
  connections: UniverseConnection[],
  meaningfulMoments: MeaningfulMoment[],
  filterType: 'all' | 'entry' | 'person' | 'place' | 'topic' | 'project' = 'all',
  searchQuery: string = ""
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();

  const meaningfulSet = new Set(meaningfulMoments.map((m) => m.entryId));
  const activeEntities = entities.filter((e) => e.confirmationStatus !== "dismissed");
  const queryLower = searchQuery.trim().toLowerCase();

  // 1. Entry Nodes
  const sortedEntries = [...entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  const entryCount = sortedEntries.length;
  const entryRadius = Math.max(220, Math.min(380, 150 + entryCount * 14));

  sortedEntries.forEach((entry, idx) => {
    if (filterType !== 'all' && filterType !== 'entry') return;

    // Filter by search query if present
    const matchesSearch = !queryLower ||
      (entry.title || "").toLowerCase().includes(queryLower) ||
      entry.content.toLowerCase().includes(queryLower) ||
      entry.entryDate.includes(queryLower);

    if (searchQuery && !matchesSearch) return;

    const angle = entryCount > 1 ? (idx / entryCount) * 2 * Math.PI - Math.PI / 2 : 0;
    // Add small organic jitter
    const jitter = ((idx % 3) - 1) * 15;
    const r = entryRadius + jitter;
    const x = 500 + r * Math.cos(angle);
    const y = 400 + r * Math.sin(angle);

    const node: GraphNode = {
      id: `node_entry_${entry.id}`,
      type: 'entry',
      label: entry.title?.trim() || `Entry on ${entry.entryDate}`,
      sublabel: entry.entryDate,
      entryId: entry.id,
      date: entry.entryDate,
      isMeaningful: meaningfulSet.has(entry.id),
      x,
      y,
    };
    nodes.push(node);
    nodeMap.set(node.id, node);
  });

  // 2. Entity Nodes (Topics, People, Places, Projects)
  const allowedEntities = activeEntities.filter((e) => {
    if (filterType !== 'all' && filterType !== e.entityType) return false;
    if (queryLower) {
      return e.displayName.toLowerCase().includes(queryLower);
    }
    return true;
  });

  const entCount = allowedEntities.length;
  const innerRadius = Math.max(100, Math.min(180, 70 + entCount * 8));

  allowedEntities.forEach((entity, idx) => {
    const angle = entCount > 1 ? (idx / entCount) * 2 * Math.PI : 0;
    const jitter = ((idx % 2) - 0.5) * 20;
    const r = innerRadius + jitter;
    const x = 500 + r * Math.cos(angle);
    const y = 400 + r * Math.sin(angle);

    const entityMentions = mentions.filter((m) => m.entityId === entity.id);

    const node: GraphNode = {
      id: `node_entity_${entity.id}`,
      type: entity.entityType,
      label: entity.displayName,
      sublabel: entity.relationshipLabel || (entity.confirmationStatus === 'confirmed' ? 'Confirmed' : 'Suggested'),
      entityId: entity.id,
      entryCount: entityMentions.length,
      status: entity.confirmationStatus,
      x,
      y,
    };
    nodes.push(node);
    nodeMap.set(node.id, node);

    // Create Edges between Entity Node and its Entry Nodes
    entityMentions.forEach((m) => {
      const entryNodeId = `node_entry_${m.entryId}`;
      if (nodeMap.has(entryNodeId)) {
        edges.push({
          id: `edge_${node.id}_${entryNodeId}`,
          source: node.id,
          target: entryNodeId,
          label: entity.displayName,
          origin: "heuristic",
          status: entity.confirmationStatus === 'confirmed' ? 'confirmed' : 'suggested',
          explanation: `Mentioned in this entry`,
        });
      }
    });
  });

  // 3. Entry-to-Entry Connections (User links & AI/heuristic links)
  connections.forEach((conn) => {
    if (conn.status === "dismissed") return;
    const srcNodeId = `node_entry_${conn.sourceEntryId}`;
    const tgtNodeId = `node_entry_${conn.targetEntryId}`;

    if (nodeMap.has(srcNodeId) && nodeMap.has(tgtNodeId)) {
      edges.push({
        id: `edge_conn_${conn.id}`,
        source: srcNodeId,
        target: tgtNodeId,
        label: conn.connectionType,
        origin: conn.origin,
        status: conn.status,
        explanation: conn.explanation,
      });
    }
  });

  return { nodes, edges };
}
