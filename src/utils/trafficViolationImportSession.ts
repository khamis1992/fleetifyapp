import type { EnrichableViolation } from '@/hooks/useViolationMatching';
import type { TrafficFileImportResult } from '@/services/trafficViolationDocumentService';
import type { ImportProcessingResult, ImportSource } from '@/types/violations';

export type TrafficViolationImportTab = 'upload' | 'process' | 'enrich' | 'review' | 'stats';
export type TrafficViolationReviewFilter = 'all' | 'matched' | 'duplicates' | 'partial' | 'errors';

export interface TrafficViolationImportSessionState {
  activeTab: TrafficViolationImportTab;
  processingResult: ImportProcessingResult | null;
  selectedViolationIds: string[];
  reviewFilter: TrafficViolationReviewFilter;
  activeImportSource: ImportSource;
  enrichableViolations: EnrichableViolation[];
  selectedEnrichmentIds: string[];
}

interface StoredSession extends TrafficViolationImportSessionState {
  companyId: string;
  matchingVersion?: string;
  savedAt: string;
}

interface StoredFile {
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
}

interface StoredFiles {
  companyId: string;
  files: StoredFile[];
  savedAt: string;
}

export interface TrafficFilesImportReport {
  results: TrafficFileImportResult[];
  savedAt: string;
}

interface StoredTrafficFilesImportReport extends TrafficFilesImportReport {
  companyId: string;
}

const DATABASE_NAME = 'fleetify-traffic-violation-import';
const DATABASE_VERSION = 3;
const SESSION_STORE = 'sessions';
const FILE_STORE = 'files';
const TRAFFIC_FILE_STORE = 'traffic-files';
const TRAFFIC_FILE_REPORT_STORE = 'traffic-file-reports';

export const TRAFFIC_VIOLATION_MATCHING_VERSION = '2026-07-17-contract-overlap-v2';

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(SESSION_STORE)) {
      database.createObjectStore(SESSION_STORE, { keyPath: 'companyId' });
    }
    if (!database.objectStoreNames.contains(FILE_STORE)) {
      database.createObjectStore(FILE_STORE, { keyPath: 'companyId' });
    }
    if (!database.objectStoreNames.contains(TRAFFIC_FILE_STORE)) {
      database.createObjectStore(TRAFFIC_FILE_STORE, { keyPath: 'companyId' });
    }
    if (!database.objectStoreNames.contains(TRAFFIC_FILE_REPORT_STORE)) {
      database.createObjectStore(TRAFFIC_FILE_REPORT_STORE, { keyPath: 'companyId' });
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Failed to open import session database'));
});

const waitForTransaction = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error || new Error('Import session transaction failed'));
  transaction.onabort = () => reject(transaction.error || new Error('Import session transaction aborted'));
});

const getRecord = <T>(store: IDBObjectStore, key: string): Promise<T | null> => new Promise((resolve, reject) => {
  const request = store.get(key);
  request.onsuccess = () => resolve((request.result as T | undefined) || null);
  request.onerror = () => reject(request.error || new Error('Failed to read import session'));
});

export const loadTrafficViolationImportSession = async (
  companyId: string
): Promise<{
  state: TrafficViolationImportSessionState | null;
  files: File[];
  requiresRematch: boolean;
}> => {
  if (typeof indexedDB === 'undefined') {
    return { state: null, files: [], requiresRematch: false };
  }

  const database = await openDatabase();
  try {
    const transaction = database.transaction([SESSION_STORE, FILE_STORE], 'readonly');
    const transactionDone = waitForTransaction(transaction);
    const [storedSession, storedFiles] = await Promise.all([
      getRecord<StoredSession>(transaction.objectStore(SESSION_STORE), companyId),
      getRecord<StoredFiles>(transaction.objectStore(FILE_STORE), companyId),
    ]);
    await transactionDone;

    const files = (storedFiles?.files || []).map(file => new File([file.blob], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    }));

    if (!storedSession) return { state: null, files, requiresRematch: false };

    const state: TrafficViolationImportSessionState = {
      activeTab: storedSession.activeTab,
      processingResult: storedSession.processingResult,
      selectedViolationIds: storedSession.selectedViolationIds,
      reviewFilter: storedSession.reviewFilter,
      activeImportSource: storedSession.activeImportSource,
      enrichableViolations: storedSession.enrichableViolations,
      selectedEnrichmentIds: storedSession.selectedEnrichmentIds,
    };
    return {
      state,
      files,
      requiresRematch: Boolean(
        storedSession.processingResult &&
        storedSession.matchingVersion !== TRAFFIC_VIOLATION_MATCHING_VERSION
      ),
    };
  } finally {
    database.close();
  }
};

export const saveTrafficViolationImportState = async (
  companyId: string,
  state: TrafficViolationImportSessionState
): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;

  const database = await openDatabase();
  try {
    const transaction = database.transaction(SESSION_STORE, 'readwrite');
    transaction.objectStore(SESSION_STORE).put({
      ...state,
      companyId,
      matchingVersion: TRAFFIC_VIOLATION_MATCHING_VERSION,
      savedAt: new Date().toISOString(),
    } satisfies StoredSession);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
};

export const saveTrafficViolationImportFiles = async (
  companyId: string,
  files: File[]
): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;

  const database = await openDatabase();
  try {
    const transaction = database.transaction(FILE_STORE, 'readwrite');
    transaction.objectStore(FILE_STORE).put({
      companyId,
      savedAt: new Date().toISOString(),
      files: files.map(file => ({
        blob: file.slice(0, file.size, file.type),
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
      })),
    } satisfies StoredFiles);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
};

export const loadTrafficFilesImportQueue = async (companyId: string): Promise<File[]> => {
  if (typeof indexedDB === 'undefined') return [];

  const database = await openDatabase();
  try {
    const transaction = database.transaction(TRAFFIC_FILE_STORE, 'readonly');
    const transactionDone = waitForTransaction(transaction);
    const storedFiles = await getRecord<StoredFiles>(
      transaction.objectStore(TRAFFIC_FILE_STORE),
      companyId
    );
    await transactionDone;

    return (storedFiles?.files || []).map(file => new File([file.blob], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    }));
  } finally {
    database.close();
  }
};

export const saveTrafficFilesImportQueue = async (
  companyId: string,
  files: File[]
): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;

  const database = await openDatabase();
  try {
    const transaction = database.transaction(TRAFFIC_FILE_STORE, 'readwrite');
    transaction.objectStore(TRAFFIC_FILE_STORE).put({
      companyId,
      savedAt: new Date().toISOString(),
      files: files.map(file => ({
        blob: file.slice(0, file.size, file.type),
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
      })),
    } satisfies StoredFiles);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
};

export const clearTrafficFilesImportQueue = async (companyId: string): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;

  const database = await openDatabase();
  try {
    const transaction = database.transaction(TRAFFIC_FILE_STORE, 'readwrite');
    transaction.objectStore(TRAFFIC_FILE_STORE).delete(companyId);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
};

export const loadTrafficFilesImportReport = async (
  companyId: string
): Promise<TrafficFilesImportReport | null> => {
  if (typeof indexedDB === 'undefined') return null;

  const database = await openDatabase();
  try {
    const transaction = database.transaction(TRAFFIC_FILE_REPORT_STORE, 'readonly');
    const transactionDone = waitForTransaction(transaction);
    const storedReport = await getRecord<StoredTrafficFilesImportReport>(
      transaction.objectStore(TRAFFIC_FILE_REPORT_STORE),
      companyId
    );
    await transactionDone;

    if (!storedReport) return null;
    return {
      results: storedReport.results,
      savedAt: storedReport.savedAt,
    };
  } finally {
    database.close();
  }
};

export const saveTrafficFilesImportReport = async (
  companyId: string,
  results: TrafficFileImportResult[]
): Promise<string> => {
  const savedAt = new Date().toISOString();
  if (typeof indexedDB === 'undefined') return savedAt;

  const database = await openDatabase();
  try {
    const transaction = database.transaction(TRAFFIC_FILE_REPORT_STORE, 'readwrite');
    transaction.objectStore(TRAFFIC_FILE_REPORT_STORE).put({
      companyId,
      results,
      savedAt,
    } satisfies StoredTrafficFilesImportReport);
    await waitForTransaction(transaction);
    return savedAt;
  } finally {
    database.close();
  }
};

export const clearTrafficFilesImportReport = async (companyId: string): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;

  const database = await openDatabase();
  try {
    const transaction = database.transaction(TRAFFIC_FILE_REPORT_STORE, 'readwrite');
    transaction.objectStore(TRAFFIC_FILE_REPORT_STORE).delete(companyId);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
};

export const clearTrafficViolationImportSession = async (companyId: string): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;

  const database = await openDatabase();
  try {
    const transaction = database.transaction([SESSION_STORE, FILE_STORE], 'readwrite');
    transaction.objectStore(SESSION_STORE).delete(companyId);
    transaction.objectStore(FILE_STORE).delete(companyId);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
};
