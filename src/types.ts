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
    stroke?: number[][];  // Stroke data: array of [x, y, timestamp] points
    audio?: {
        blob: Blob;
        originalName: string;
        name: string;
    };
}

export interface BookResult {
    bookName: string;
    metadata: Record<string, unknown>;  // Flexible metadata from note file
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
    // Basic settings (3)
    notesFolder: string;
    includeMetadata: boolean;
    includeTimestamps: boolean;

    // Import format (3)
    outputFormat: 'png' | 'svg' | 'both';
    backgroundColor: string;

    // Auto-sync settings (5)
    enableAutoSync: boolean;
    sourceFolderPath: string;
    pollingIntervalMinutes: number;
    showSyncNotifications: boolean;
    syncOnStartup: boolean;

    // Debug settings (1)
    debugMode: boolean;

    // Folder paths (4)
    imagesFolder: string;
    audioFolder: string;
    strokesFolder: string;
    pdfFolder: string;

    // Import options (4)
    dateFormat: string;
    filePrefix: string;
    includeThumbnails: boolean;
    batchSize: number;

    // SVG viewer settings (5)
    showSvgViewer: boolean;
    enableSvgViewer: boolean;
    defaultSmoothness: number;
    defaultReplaySpeed: number;
    maxHistoryEntries: number;

    // PDF export (1)
    enablePdfExport: boolean;
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
    lastImported?: number;  // Numeric timestamp for consistent comparison with file.lastModified
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
    relativePath: string;  // Relative path from source folder
    changeType: 'new' | 'modified';
    lastModified: number;
    estimatedPages?: number;
}
