// constants.ts - Constants and default settings for Viwoods Obsidian Plugin

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
    sourceFolderPathWindows: '',
    sourceFolderPathMacos: '',
    sourceFolderPathLinux: '',
    pollingIntervalMinutes: 5,
    showSyncNotifications: true,
    syncOnStartup: false,

    // Debug settings
    debugMode: false,

    // Folder paths
    imagesFolder: 'Attachments',
    audioFolder: 'Attachments',
    strokesFolder: 'Attachments',
    pdfFolder: 'pdfs',

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

// Auto-sync constants
export const WATCHER_STATE_FILE = '.viwoods-watcher-state.json';
