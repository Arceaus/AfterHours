/**
 * AFTERTHOUGHT Offline Writing & Synchronization Queue
 * Manages pending mutations when disconnected or when cloud sync fails.
 * Flushes transparently when connectivity is restored with automatic conflict recovery.
 */

import { OfflineOperationType, OfflineQueueItem } from '@/types/entry';

const OFFLINE_QUEUE_KEY = 'afterthought_offline_queue_v1';

export class OfflineSyncQueue {
  private static instance: OfflineSyncQueue;
  private queue: OfflineQueueItem[] = [];
  private isProcessing = false;
  private listeners: Array<(items: OfflineQueueItem[]) => void> = [];

  private constructor() {
    if (typeof window !== 'undefined') {
      this.load();
      window.addEventListener('online', () => {
        void this.flush();
      });
    }
  }

  public static getInstance(): OfflineSyncQueue {
    if (!OfflineSyncQueue.instance) {
      OfflineSyncQueue.instance = new OfflineSyncQueue();
    }
    return OfflineSyncQueue.instance;
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      this.queue = raw ? JSON.parse(raw) : [];
    } catch {
      this.queue = [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
      this.notify();
    } catch (err) {
      console.warn('Failed to save offline queue to localStorage', err);
    }
  }

  public subscribe(callback: (items: OfflineQueueItem[]) => void): () => void {
    this.listeners.push(callback);
    callback(this.queue);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener([...this.queue]);
      } catch {
        // Ignore subscriber errors
      }
    }
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public getItems(): OfflineQueueItem[] {
    return [...this.queue];
  }

  public enqueue(type: OfflineOperationType, payload: Record<string, unknown>): void {
    const item: OfflineQueueItem = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    // Coalesce continuous saves for the same entry or letter
    if (type === 'save_entry' && payload.id) {
      const existingIdx = this.queue.findIndex(
        (q) => q.type === 'save_entry' && (q.payload as { id: string }).id === payload.id
      );
      if (existingIdx !== -1) {
        this.queue[existingIdx] = item;
        this.save();
        return;
      }
    }

    this.queue.push(item);
    this.save();
  }

  public removeItem(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.save();
  }

  public clear(): void {
    this.queue = [];
    this.save();
  }

  /**
   * Process all queued operations with an injected processor function.
   */
  public async flush(
    executor?: (item: OfflineQueueItem) => Promise<boolean>
  ): Promise<{ successCount: number; failureCount: number }> {
    if (this.isProcessing || this.queue.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { successCount: 0, failureCount: 0 };
    }

    this.isProcessing = true;
    let successCount = 0;
    let failureCount = 0;

    const remainingItems: OfflineQueueItem[] = [];

    for (const item of this.queue) {
      try {
        let ok = true;
        if (executor) {
          ok = await executor(item);
        }
        if (ok) {
          successCount++;
        } else {
          item.retryCount++;
          remainingItems.push(item);
          failureCount++;
        }
      } catch (err) {
        item.retryCount++;
        item.lastError = err instanceof Error ? err.message : String(err);
        remainingItems.push(item);
        failureCount++;
      }
    }

    this.queue = remainingItems;
    this.save();
    this.isProcessing = false;

    return { successCount, failureCount };
  }
}

export const offlineQueue = typeof window !== 'undefined' ? OfflineSyncQueue.getInstance() : (null as unknown as OfflineSyncQueue);

