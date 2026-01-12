// services/auto-sync-service.ts - Core polling and change detection service for Viwoods Auto-Sync

import { App, Notice } from 'obsidian';
import type {
    ViwoodsSettings,
    WatcherStateData,
    DetectedChange
} from '../types.js';
import { ExternalFileAccess, ExternalFileInfo } from '../utils/external-file-access.js';
import { WATCHER_STATE_FILE } from '../utils/constants.js';
import { log } from '../utils/logger.js';

// Forward declaration to avoid circular dependency
export interface IImportWorkflow {
    processNoteFromPath(filePath: string): Promise<void>;
    processNoteFromPathAuto(filePath: string, relativePath?: string): Promise<{ success: boolean; filename: string; pagesImported: number }>;
    getImportInProgress(): boolean;
}

/**
 * Auto-Sync Service - Manages polling, file scanning, and change detection
 */
export class AutoSyncService {
    private app: App;
    private settings: ViwoodsSettings;
    private importWorkflow: IImportWorkflow;
    private pluginInstance: any; // ViwoodsImporterPlugin

    // State
    private state: WatcherStateData;
    private detectedChanges: DetectedChange[] = [];
    private pollingIntervalId: number | null = null;
    private isEnabled = false;

    // File access
    private fileAccess: ExternalFileAccess;

    constructor(
        app: App,
        settings: ViwoodsSettings,
        importWorkflow: IImportWorkflow,
        pluginInstance: any
    ) {
        this.app = app;
        this.settings = settings;
        this.importWorkflow = importWorkflow;
        this.pluginInstance = pluginInstance;
        this.fileAccess = new ExternalFileAccess();

        // Initialize empty state
        this.state = {
            sourceFolder: '',
            knownFiles: {},
            lastScan: 0,
            isEnabled: false
        };
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /**
     * Start the auto-sync service
     */
    async start(): Promise<void> {
        if (this.isEnabled) {
            log.debug('Auto-sync service already running');
            return;
        }

        if (!this.settings.sourceFolderPath) {
            new Notice('Please set a source folder first');
            return;
        }

        // Validate the source folder
        const isValid = await this.fileAccess.validatePath(this.settings.sourceFolderPath);
        if (!isValid) {
            new Notice(`Source folder not accessible: ${this.settings.sourceFolderPath}`);
            return;
        }

        this.isEnabled = true;
        this.state.sourceFolder = this.settings.sourceFolderPath;
        this.state.isEnabled = true;

        // Start polling
        this.startPolling();

        // Initial scan
        await this.scanForChanges();

        new Notice('Viwoods auto-sync enabled');
        log.debug('Auto-sync service started');
    }

    /**
     * Stop the auto-sync service
     */
    stop(): void {
        if (!this.isEnabled) {
            return;
        }

        this.isEnabled = false;
        this.state.isEnabled = false;

        // Stop polling
        if (this.pollingIntervalId !== null) {
            window.clearInterval(this.pollingIntervalId);
            this.pollingIntervalId = null;
        }

        this.saveState();
        new Notice('Viwoods auto-sync disabled');
        log.debug('Auto-sync service stopped');
    }

    /**
     * Restart the auto-sync service with new settings
     */
    async restart(): Promise<void> {
        this.stop();
        await this.start();
    }

    // ========================================================================
    // POLLING
    // ========================================================================

    private startPolling(): void {
        // Stop any existing interval
        if (this.pollingIntervalId !== null) {
            window.clearInterval(this.pollingIntervalId);
        }

        // Calculate interval in milliseconds
        const intervalMs = this.settings.pollingIntervalMinutes * 60 * 1000;

        // Start polling
        this.pollingIntervalId = window.setInterval(async () => {
            await this.scanForChanges();
        }, intervalMs);

        log.debug(`Polling started: interval ${this.settings.pollingIntervalMinutes} minutes`);
    }

    // ========================================================================
    // SCANNING & CHANGE DETECTION
    // ========================================================================

    /**
     * Scan source folder for changes
     * @returns Array of detected changes
     */
    async scanForChanges(): Promise<DetectedChange[]> {
        if (!this.settings.sourceFolderPath) {
            return [];
        }

        log.debug(`Scanning source folder: ${this.settings.sourceFolderPath}`);

        try {
            // Scan directory
            const files = await this.fileAccess.scanDirectory(this.settings.sourceFolderPath);
            log.debug(`Found ${files.length} .note files`);

            // Detect changes
            const changes = this.detectChanges(files);
            this.detectedChanges = changes;

            // Update known files
            this.updateKnownFiles(files);

            // Update last scan time
            this.state.lastScan = Date.now();

            // Save state
            await this.saveState();

            // Update status
            this.updateStatus();

            // Show notification if changes detected
            if (changes.length > 0 && this.settings.showSyncNotifications) {
                this.showChangesNotification(changes);
            }

            return changes;
        } catch (error: unknown) {
            log.error('Error scanning source folder:', error);
            // Don't show notice for every scan error - could be temporary
            return [];
        }
    }

    /**
     * Detect changes by comparing file metadata
     */
    private detectChanges(files: ExternalFileInfo[]): DetectedChange[] {
        const changes: DetectedChange[] = [];

        for (const file of files) {
            const knownFile = this.state.knownFiles[file.fileName];

            if (!knownFile) {
                // New file
                changes.push({
                    fileName: file.fileName,
                    filePath: file.filePath,
                    relativePath: file.relativePath,
                    changeType: 'new',
                    lastModified: file.lastModified
                });
                log.debug(`New file detected: ${file.relativePath}`);
            } else if (file.lastModified > (knownFile.lastImported || 0)) {
                // Modified file
                changes.push({
                    fileName: file.fileName,
                    filePath: file.filePath,
                    relativePath: file.relativePath,
                    changeType: 'modified',
                    lastModified: file.lastModified
                });
                log.debug(`Modified file detected: ${file.relativePath}`);
            }
        }

        return changes;
    }

    /**
     * Update known files state
     */
    private updateKnownFiles(files: ExternalFileInfo[]): void {
        for (const file of files) {
            const existing = this.state.knownFiles[file.fileName];

            if (existing) {
                // Update existing entry
                existing.lastModified = file.lastModified;
                existing.fileSize = file.fileSize;
            } else {
                // Add new entry
                this.state.knownFiles[file.fileName] = {
                    fileName: file.fileName,
                    filePath: file.filePath,
                    lastModified: file.lastModified,
                    fileSize: file.fileSize,
                    bookName: file.fileName.replace(/\.(note|zip)$/, '')
                };
            }
        }
    }

    // ========================================================================
    // IMPORT
    // ========================================================================

    /**
     * Import all detected changes
     */
    async importDetectedChanges(): Promise<void> {
        if (this.detectedChanges.length === 0) {
            new Notice('No changes to import');
            return;
        }

        if (this.importWorkflow.getImportInProgress()) {
            new Notice('Import already in progress');
            return;
        }

        log.debug(`Importing ${this.detectedChanges.length} detected changes`);

        let successCount = 0;
        let failCount = 0;

        for (const change of this.detectedChanges) {
            try {
                // Use auto-import mode (skips modal dialogs, uses one-to-one import)
                const result = await this.importWorkflow.processNoteFromPathAuto(change.filePath, change.relativePath);

                if (result.success) {
                    // Mark as imported
                    const knownFile = this.state.knownFiles[change.fileName];
                    if (knownFile) {
                        knownFile.lastImported = new Date().toISOString();
                    }
                    successCount++;
                    log.debug(`Imported ${result.filename} (${result.pagesImported} pages)`);
                } else {
                    failCount++;
                }
            } catch (error: unknown) {
                log.error(`Failed to import ${change.fileName}:`, error);
                failCount++;
            }
        }

        // Clear detected changes after import
        this.detectedChanges = [];
        await this.saveState();
        this.updateStatus();

        if (failCount > 0) {
            new Notice(`Imported ${successCount} files, ${failCount} failed`);
        } else {
            new Notice(`Imported ${successCount} file${successCount > 1 ? 's' : ''}`);
        }
    }

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    /**
     * Load watcher state from plugin data
     */
    async loadState(): Promise<void> {
        try {
            const adapter = this.app.vault.adapter;
            const statePath = this.getWatcherStatePath();

            if (await adapter.exists(statePath)) {
                const content = await adapter.read(statePath);
                this.state = JSON.parse(content);
                log.debug('Watcher state loaded:', this.state);
            } else {
                log.debug('No existing watcher state found');
            }
        } catch (error) {
            log.error('Error loading watcher state:', error);
        }
    }

    /**
     * Save watcher state to plugin data
     */
    async saveState(): Promise<void> {
        try {
            const adapter = this.app.vault.adapter;
            const statePath = this.getWatcherStatePath();
            const content = JSON.stringify(this.state, null, 2);

            await adapter.write(statePath, content);
            log.debug('Watcher state saved');
        } catch (error) {
            log.error('Error saving watcher state:', error);
        }
    }

    /**
     * Get the path to the watcher state file
     */
    private getWatcherStatePath(): string {
        // Use plugin data directory
        return `.obsidian/plugins/viwoods-notes-importer/${WATCHER_STATE_FILE}`;
    }

    // ========================================================================
    // STATUS & NOTIFICATIONS
    // ========================================================================

    /**
     * Update the status bar
     */
    private updateStatus(): void {
        if (this.pluginInstance.updateSyncStatusBar) {
            this.pluginInstance.updateSyncStatusBar();
        }
    }

    /**
     * Show notification for detected changes
     */
    private showChangesNotification(changes: DetectedChange[]): void {
        const newCount = changes.filter(c => c.changeType === 'new').length;
        const modifiedCount = changes.filter(c => c.changeType === 'modified').length;

        let message = `Viwoods: ${changes.length} change${changes.length > 1 ? 's' : ''} detected`;
        if (newCount > 0) message += ` (${newCount} new)`;
        if (modifiedCount > 0) message += ` (${modifiedCount} modified)`;

        new Notice(message);
    }

    // ========================================================================
    // GETTERS
    // ========================================================================

    /**
     * Check if auto-sync is enabled
     */
    isActive(): boolean {
        return this.isEnabled;
    }

    /**
     * Get the last scan time
     */
    getLastScanTime(): number {
        return this.state.lastScan;
    }

    /**
     * Get the number of pending changes
     */
    getPendingChangesCount(): number {
        return this.detectedChanges.length;
    }

    /**
     * Get all detected changes
     */
    getDetectedChanges(): DetectedChange[] {
        return [...this.detectedChanges];
    }

    /**
     * Get the current state
     */
    getState(): WatcherStateData {
        return { ...this.state };
    }

    /**
     * Clear all sync state (for re-importing everything)
     * This resets known files, last scan time, and pending changes
     */
    async clearState(): Promise<void> {
        log.debug('Clearing sync state...');

        // Reset state to initial values
        this.state = {
            sourceFolder: this.state.sourceFolder, // Keep the source folder
            knownFiles: {},  // Clear all known files
            lastScan: 0,     // Reset last scan time
            isEnabled: this.isEnabled  // Keep enabled status
        };

        // Clear pending changes
        this.detectedChanges = [];

        // Save the cleared state
        await this.saveState();

        // Update status bar
        this.updateStatus();

        log.debug('Sync state cleared');
    }
}
