// constants.ts - Constants and default settings for Viwoods Notes Importer Plugin

import { ViwoodsSettings } from '../types.js';

export const DEFAULT_SETTINGS: ViwoodsSettings = {
    // Basic settings
    notesFolder: 'Viwoods Notes',
    includeMetadata: true,
    includeTimestamps: true,

    // Import format
    outputFormat: 'png',
    backgroundColor: '#FFFFFF',

    // Auto-sync settings
    enableAutoSync: false,
    sourceFolderPath: '',
    pollingIntervalMinutes: 5,
    showSyncNotifications: true,
    syncOnStartup: false,

    // Debug settings
    debugMode: false,

    // Folder paths
    imagesFolder: 'Attachments',
    audioFolder: 'Attachments',
    strokesFolder: 'Attachments',
    pdfFolder: 'PDFs',

    // Import options
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    filePrefix: '',
    includeThumbnails: false,
    batchSize: 10,

    // SVG viewer settings
    showSvgViewer: true,
    enableSvgViewer: false,
    defaultSmoothness: 0.5,
    defaultReplaySpeed: 1.0,
    maxHistoryEntries: 10,

    // PDF export
    enablePdfExport: false
};

export const PEN_MAPPING_PATH = 'Attachments/pen_mapping.json';

export const JSZIP_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
export const JSPDF_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

// Auto-sync constants
export const WATCHER_STATE_FILE = '.viwoods-watcher-state.json';
export const MIN_POLLING_INTERVAL = 1; // minutes
export const MAX_POLLING_INTERVAL = 60; // minutes
