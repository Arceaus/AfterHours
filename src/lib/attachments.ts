/**
 * AFTERTHOUGHT Attachment Engine
 * Secure, private attachment handling with dual Cloud (Supabase Storage)
 * and Local (IndexedDB / Base64) storage engines.
 * Zero external image-analysis, zero public URL leaks.
 */

import { MemoryAttachment } from '@/types/entry';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface AttachmentValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAttachmentFile(file: File): AttachmentValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported format. Please upload JPEG, PNG, or WebP images only.',
    };
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds 10MB limit. Please select a smaller photograph.',
    };
  }

  // Reject executable or double-extension tricks
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.exe') || lowerName.endsWith('.sh') || lowerName.endsWith('.bat') || lowerName.includes('.js')) {
    return {
      valid: false,
      error: 'Executable files are strictly forbidden.',
    };
  }

  return { valid: true };
}

// Convert File to Base64 Data URL for local storage
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Local IndexedDB key-value store for offline attachments
const DB_NAME = 'afterthought_attachments_db';
const DB_STORE = 'attachments';

function openAttachmentsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const req = window.indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalAttachment(attachment: MemoryAttachment, dataUrl: string): Promise<void> {
  try {
    const db = await openAttachmentsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      const record = { ...attachment, url: dataUrl };
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to localStorage', err);
    try {
      const key = `afterthought_att_${attachment.id}`;
      localStorage.setItem(key, JSON.stringify({ ...attachment, url: dataUrl }));
    } catch {
      // Storage quota exceeded
    }
  }
}

export async function getLocalAttachmentsForEntry(entryId: string): Promise<MemoryAttachment[]> {
  try {
    const db = await openAttachmentsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const all: MemoryAttachment[] = req.result || [];
        resolve(all.filter((a) => a.entryId === entryId));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    // Fallback scan of localStorage
    const results: MemoryAttachment[] = [];
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('afterthought_att_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '{}');
            if (item.entryId === entryId) results.push(item);
          } catch {
            // Ignore bad items
          }
        }
      }
    }
    return results;
  }
}

export async function deleteLocalAttachment(attachmentId: string): Promise<void> {
  try {
    const db = await openAttachmentsDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      store.delete(attachmentId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`afterthought_att_${attachmentId}`);
    }
  }
}

/**
 * Upload an attachment to Supabase Storage (bucket: diary-attachments)
 * and persist metadata in public.entry_attachments.
 */
export async function uploadCloudAttachment(
  userId: string,
  entryId: string,
  file: File
): Promise<MemoryAttachment> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const validation = validateAttachmentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const attachmentId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const fileExt = file.name.split('.').pop() || 'jpg';
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userId}/${entryId}/${attachmentId}_${cleanFileName}`;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('diary-attachments')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload failed:', uploadError);
    throw new Error(`Failed to upload photograph: ${uploadError.message}`);
  }

  // 2. Generate scoped signed URL (valid for 1 hour)
  const { data: signData, error: signError } = await supabase.storage
    .from('diary-attachments')
    .createSignedUrl(storagePath, 3600);

  const signedUrl = signData?.signedUrl || '';
  if (signError || !signedUrl) {
    console.warn('Could not generate signed URL immediately:', signError);
  }

  // 3. Persist metadata in public.entry_attachments
  const { error: metaError } = await supabase.from('entry_attachments').insert({
    id: attachmentId,
    user_id: userId,
    entry_id: entryId,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    file_size: file.size,
    created_at: new Date().toISOString(),
  });

  if (metaError) {
    // Attempt rollback storage object
    await supabase.storage.from('diary-attachments').remove([storagePath]);
    throw new Error(`Failed to save attachment metadata: ${metaError.message}`);
  }

  return {
    id: attachmentId,
    userId,
    entryId,
    storagePath,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    url: signedUrl,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Fetch signed URLs for Cloud attachments
 */
export async function refreshAttachmentSignedUrl(storagePath: string): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return '';
  const { data, error } = await supabase.storage
    .from('diary-attachments')
    .createSignedUrl(storagePath, 3600);
  if (error || !data) {
    console.warn('Error refreshing signed URL:', error);
    return '';
  }
  return data.signedUrl;
}

/**
 * Delete a Cloud attachment from both storage and database metadata.
 */
export async function deleteCloudAttachment(
  attachmentId: string,
  storagePath: string
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  // 1. Delete from database
  const { error: dbError } = await supabase
    .from('entry_attachments')
    .delete()
    .eq('id', attachmentId);

  if (dbError) {
    console.error('Failed to delete attachment record:', dbError);
  }

  // 2. Delete object from storage
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from('diary-attachments')
      .remove([storagePath]);

    if (storageError) {
      console.warn('Failed to delete storage file (may already be gone):', storageError);
    }
  }
}
