/**
 * APEX Electronics — Offline-First Synchronization Engine
 * Designed for Android and Mobile Web field sales employees in low-connectivity areas.
 */

export interface OfflineSalesLine {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  standardPrice: number;
  unitPrice: number;
  lineTotal: number;
  isManualPrice: boolean;
  priceOverrideReason?: string;
}

export type SyncStatus =
  | 'DRAFT'
  | 'SAVED_OFFLINE'
  | 'WAITING_TO_SYNC'
  | 'UPLOADING'
  | 'SYNC_FAILED'
  | 'SUBMITTED_SUCCESSFULLY';

export interface OfflineVisitRecord {
  id: string; // Client-side generated UUID
  idempotencyKey: string;
  createdAt: string;
  retailerId: string;
  retailerName: string;
  retailerCity?: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  googleMapsUrl: string;
  shopFrontPhoto?: {
    dataUrl: string;
    captureMethod?: string;
  };
  shopInteractionPhoto?: {
    dataUrl: string;
    captureMethod?: string;
    consentGiven?: boolean;
    declinedReason?: string;
  };
  salesLines: OfflineSalesLine[];
  totalSalesAmount: number;
  visitRemarks?: string;
  status: SyncStatus;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  serverVisitId?: string;
  serverConfirmationNumber?: string;
}

const STORAGE_KEYS = {
  QUEUE: 'apex_offline_visits_queue_v1',
  SHOPS_CACHE: 'apex_cached_shops_v1',
  CATALOG_CACHE: 'apex_cached_catalog_v1',
};

// Generate UUID v4
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retrieve all pending or drafted offline records
 */
export function getOfflineQueue(): OfflineVisitRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEYS.QUEUE);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('[OfflineSyncEngine] Failed to read queue:', err);
    return [];
  }
}

/**
 * Save or update a visit in the offline queue
 */
export function saveOfflineVisit(record: OfflineVisitRecord): OfflineVisitRecord {
  if (typeof window === 'undefined') return record;
  try {
    const queue = getOfflineQueue();
    const existingIndex = queue.findIndex((item) => item.id === record.id);
    if (existingIndex >= 0) {
      queue[existingIndex] = record;
    } else {
      queue.unshift(record);
    }
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    notifyQueueChange();
    return record;
  } catch (err) {
    console.error('[OfflineSyncEngine] Failed to save offline visit:', err);
    return record;
  }
}

/**
 * Delete a specific record from the offline queue
 */
export function removeOfflineRecord(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const queue = getOfflineQueue().filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    notifyQueueChange();
  } catch (err) {
    console.error('[OfflineSyncEngine] Failed to remove record:', err);
  }
}

/**
 * Cache assigned retail shops for offline browsing
 */
export function cacheAssignedShops(shops: any[]): void {
  if (typeof window === 'undefined' || !shops) return;
  try {
    localStorage.setItem(STORAGE_KEYS.SHOPS_CACHE, JSON.stringify({ timestamp: Date.now(), data: shops }));
  } catch (e) {
    console.warn('[OfflineSyncEngine] Shop cache storage failed', e);
  }
}

export function getCachedAssignedShops(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const item = localStorage.getItem(STORAGE_KEYS.SHOPS_CACHE);
    return item ? JSON.parse(item).data || [] : [];
  } catch {
    return [];
  }
}

/**
 * Cache product catalog items for offline product selection
 */
export function cacheProductCatalog(products: any[]): void {
  if (typeof window === 'undefined' || !products) return;
  try {
    localStorage.setItem(STORAGE_KEYS.CATALOG_CACHE, JSON.stringify({ timestamp: Date.now(), data: products }));
  } catch (e) {
    console.warn('[OfflineSyncEngine] Product catalog cache storage failed', e);
  }
}

export function getCachedProductCatalog(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const item = localStorage.getItem(STORAGE_KEYS.CATALOG_CACHE);
    return item ? JSON.parse(item).data || [] : [];
  } catch {
    return [];
  }
}

/**
 * Sync Engine: Synchronizes all pending offline visits when online
 */
export async function syncPendingVisits(): Promise<{
  synced: number;
  failed: number;
  results: { id: string; success: boolean; message: string }[];
}> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { synced: 0, failed: 0, results: [] };
  }

  const queue = getOfflineQueue();
  const eligible = queue.filter(
    (item) => item.status === 'SAVED_OFFLINE' || item.status === 'WAITING_TO_SYNC' || item.status === 'SYNC_FAILED'
  );

  if (eligible.length === 0) {
    return { synced: 0, failed: 0, results: [] };
  }

  let synced = 0;
  let failed = 0;
  const results: { id: string; success: boolean; message: string }[] = [];

  for (const item of eligible) {
    try {
      // Mark as uploading
      item.status = 'UPLOADING';
      item.attempts += 1;
      item.lastAttemptAt = new Date().toISOString();
      saveOfflineVisit(item);

      // 1. Submit the visit record with idempotency key
      const submitRes = await fetch('/api/v1/field-sales/visits/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': item.idempotencyKey,
        },
        body: JSON.stringify({
          clientOperationId: item.id,
          retailerId: item.retailerId,
          visitDate: item.createdAt.split('T')[0],
          checkInTime: item.createdAt,
          checkOutTime: new Date().toISOString(),
          latitude: item.latitude,
          longitude: item.longitude,
          accuracyMeters: item.accuracyMeters,
          googleMapsUrl: item.googleMapsUrl,
          salesLines: item.salesLines,
          totalSalesAmount: item.totalSalesAmount,
          remarks: item.visitRemarks || 'Offline synchronized field visit',
        }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        throw new Error(submitData.error || submitData.message || 'Server rejected visit submission');
      }

      const serverVisitId = submitData.data?.visitId || submitData.data?._id || submitData.visitId;

      // 2. Upload photographs if attached
      if (serverVisitId && (item.shopFrontPhoto?.dataUrl || item.shopInteractionPhoto?.dataUrl)) {
        await fetch(`/api/v1/field-sales/visits/${serverVisitId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopFrontPhoto: item.shopFrontPhoto?.dataUrl
              ? {
                  photoUrl: item.shopFrontPhoto.dataUrl,
                  captureMethod: item.shopFrontPhoto.captureMethod || 'CAMERA_OFFLINE',
                  capturedAt: item.createdAt,
                }
              : undefined,
            shopInteractionPhoto: item.shopInteractionPhoto?.dataUrl
              ? {
                  photoUrl: item.shopInteractionPhoto.dataUrl,
                  captureMethod: item.shopInteractionPhoto.captureMethod || 'CAMERA_OFFLINE',
                  interactionConsentGiven: item.shopInteractionPhoto.consentGiven !== false,
                  declinedReason: item.shopInteractionPhoto.declinedReason || '',
                  capturedAt: item.createdAt,
                }
              : undefined,
          }),
        });
      }

      // 3. Mark as successfully submitted with server confirmation
      item.status = 'SUBMITTED_SUCCESSFULLY';
      item.serverVisitId = serverVisitId;
      item.serverConfirmationNumber = submitData.data?.confirmationNumber || `CONF-${serverVisitId.slice(-6).toUpperCase()}`;
      item.lastError = undefined;
      saveOfflineVisit(item);

      synced++;
      results.push({ id: item.id, success: true, message: `Synced as ${item.serverConfirmationNumber}` });
    } catch (err: any) {
      console.error('[OfflineSyncEngine] Sync failed for record', item.id, err);
      item.status = 'SYNC_FAILED';
      item.lastError = err.message || 'Network error during synchronization';
      saveOfflineVisit(item);
      failed++;
      results.push({ id: item.id, success: false, message: item.lastError || 'Network error during synchronization' });
    }
  }

  notifyQueueChange();
  return { synced, failed, results };
}

// Custom Event for UI reactiveness
function notifyQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('apex_offline_queue_changed'));
  }
}
