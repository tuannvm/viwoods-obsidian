// constants.ts - Constants and default settings for Viwoods Notes Importer Plugin

import { ViwoodsSettings } from '../types.js';

export const DEFAULT_SETTINGS: ViwoodsSettings = {
    notesFolder: 'Viwoods Notes',
    imagesFolder: 'Images',
    audioFolder: 'Audio',
    strokesFolder: 'Strokes',
    pdfFolder: 'Attachments/PDF',
    outputFormat: 'png',
    backgroundColor: '#FFFFFF',
    includeMetadata: true,
    includeTimestamps: true,
    includeThumbnails: false,
    createIndex: true,
    dateFormat: 'iso',
    filePrefix: '',
    processWithGemini: false,
    organizationMode: 'book',
    skipDuplicates: true,
    overwriteExisting: false,
    createBackups: true,
    batchSize: 10,
    enableProgressBar: true,
    autoDetectChanges: true,
    keepHistory: true,
    maxHistoryEntries: 50,
    enablePdfExport: true,
    enableSvgViewer: true,
    defaultSmoothness: 0,
    defaultSvgWidth: 100,
    autoCreatePDF: false,
    showSvgViewer: true,
    defaultReplaySpeed: 10,
    autoCreatePdfOnImport: true,
    // Auto-sync settings
    enableAutoSync: false,
    sourceFolderPath: '',
    pollingIntervalMinutes: 5,
    showSyncNotifications: true,
    syncOnStartup: false
};

export const PEN_MAPPING_PATH = 'Attachments/pen_mapping.json';

export const JSZIP_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
export const JSPDF_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

// Auto-sync constants
export const WATCHER_STATE_FILE = '.viwoods-watcher-state.json';
export const MIN_POLLING_INTERVAL = 1; // minutes
export const MAX_POLLING_INTERVAL = 60; // minutes
