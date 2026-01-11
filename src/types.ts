// types.ts - Type definitions for Viwoods Notes Importer Plugin

export interface ImportManifest {
    bookName: string;
    totalPages: number;
    importedPages: {
        [pageNumber: number]: {
            fileName: string;
            importDate: string;
            imageHash: string;
            displayImageHash?: string;
            geminiProcessed: boolean;
            hasAudio?: boolean;
            lastModified?: string;
            size?: number;
            backgroundColor?: string;
        }
    };
    lastImport: string;
    sourceFile: string;
    version: string;
    history?: ImportHistory[];
}

export interface ImportHistory {
    date: string;
    action: 'import' | 'update' | 'delete';
    pages: number[];
    summary: string;
}

export interface PageData {
    pageNum: number;
    image: {
        blob: Blob;
        hash: string;
    };
    stroke?: any;
    audio?: {
        blob: Blob;
        originalName: string;
        name: string;
    };
}

export interface BookResult {
    bookName: string;
    metadata: any;
    pages: PageData[];
    thumbnail: Blob | null;
}

export interface PageChange {
    pageNum: number;
    type: 'new' | 'modified' | 'unchanged' | 'deleted';
    oldHash?: string;
    newHash?: string;
    hasAudioChange?: boolean;
}

export interface ImportSummary {
    totalPages: number;
    newPages: number[];
    modifiedPages: number[];
    unchangedPages: number[];
    deletedPages: number[];
    errors: { page: number; error: string }[];
}

export interface ViwoodsSettings {
    notesFolder: string;
    imagesFolder: string;
    audioFolder: string;
    strokesFolder: string;
    pdfFolder: string;
    outputFormat: 'png' | 'svg' | 'both';
    backgroundColor: string;
    includeMetadata: boolean;
    includeTimestamps: boolean;
    includeThumbnails: boolean;
    createIndex: boolean;
    dateFormat: 'iso' | 'us' | 'eu';
    filePrefix: string;
    processWithGemini: boolean;
    organizationMode: 'flat' | 'book';
    skipDuplicates: boolean;
    overwriteExisting: boolean;
    createBackups: boolean;
    batchSize: number;
    enableProgressBar: boolean;
    autoDetectChanges: boolean;
    keepHistory: boolean;
    maxHistoryEntries: number;
    enablePdfExport: boolean;
    enableSvgViewer: boolean;
    defaultSmoothness: number;
    defaultSvgWidth: number;
    autoCreatePDF: boolean;
    showSvgViewer: boolean;
    defaultReplaySpeed: number;
    autoCreatePdfOnImport: boolean;
    // Auto-sync settings
    enableAutoSync: boolean;
    sourceFolderPath: string;
    pollingIntervalMinutes: number;
    showSyncNotifications: boolean;
    syncOnStartup: boolean;
}

export interface PenMapping {
    type: string;
    color: string;
    thickness: string;
    opacity: number;
}

export interface PenMappings {
    [penId: number]: PenMapping;
}

// ============================================================================
// Auto-Sync Types
// ============================================================================

/**
 * State of a single watched file in the source folder
 */
export interface WatchedFileState {
    fileName: string;
    filePath: string;
    lastModified: number;
    fileSize: number;
    hash?: string;
    lastImported?: string;
    bookName: string;
}

/**
 * Persisted watcher state
 */
export interface WatcherStateData {
    sourceFolder: string;
    knownFiles: Record<string, WatchedFileState>;
    lastScan: number;
    isEnabled: boolean;
}

/**
 * Detected change for import
 */
export interface DetectedChange {
    fileName: string;
    filePath: string;
    changeType: 'new' | 'modified';
    lastModified: number;
    estimatedPages?: number;
}
