// main.ts - Viwoods Notes Importer Plugin for Obsidian
// Minimal plugin class with lifecycle management only

import {
    App,
    Plugin,
    Notice,
    Modal,
    ButtonComponent
} from 'obsidian';

// Type imports
import type {
    ViwoodsSettings,
    PenMappings
} from './types.js';

// Import settings and defaults
import { DEFAULT_SETTINGS } from './utils/constants.js';

// Import modals
import { ProgressModal } from './ui/modals.js';

// Import services
import { ImporterService } from './services/importer-service.js';
import { PageProcessor } from './services/page-processor.js';
import { ViewerService } from './services/viewer-service.js';
import { ImportWorkflow } from './services/import-workflow.js';
import { AutoSyncService } from './services/auto-sync-service.js';

// Import handlers
import { DragDropHandler } from './handlers/drag-drop-handler.js';

// Import commands
import { registerCommands } from './commands/registry.js';

// Import utilities
import { loadJSZip, loadJsPDF } from './utils/external-libs.js';
import { initPenMappings, getPenMappings } from './utils/pen-mapping-helpers.js';
import { setDebugMode } from './utils/logger.js';

declare global {
    interface Window {
        JSZip: any;
        jspdf: any;
    }
}

// ============================================================================
// MAIN PLUGIN CLASS
// ============================================================================

export default class ViwoodsImporterPlugin extends Plugin {
    settings: ViwoodsSettings;
    importInProgress = false;
    penMappings: PenMappings = {};

    // Services
    private importerService: ImporterService | null = null;
    private pageProcessor: PageProcessor | null = null;
    private viewerService: ViewerService | null = null;
    private importWorkflow: ImportWorkflow | null = null;
    private autoSyncService: AutoSyncService | null = null;

    // Handlers
    private dragDropHandler: DragDropHandler | null = null;

    // Status bar
    private statusBarItem: HTMLElement | null = null;

    async onload() {
        try {
            await this.loadSettings();
            setDebugMode(this.settings.debugMode);

            await loadJSZip();
            await loadJsPDF();
            await this.loadPenMappings();

            // Initialize services
            this.importerService = new ImporterService(this.app, this.settings, this.penMappings);
            this.pageProcessor = new PageProcessor(this.app, this.settings, ProgressModal);
            this.viewerService = new ViewerService(this.app, this.settings);
            this.importWorkflow = new ImportWorkflow(this.app, this.settings, this.importerService, this.pageProcessor);
            this.autoSyncService = new AutoSyncService(this.app, this.settings, this.importWorkflow, this);

            // Initialize handlers
            this.dragDropHandler = new DragDropHandler((file: File) => this.importWorkflow!.processNoteFile(file));

            // Register all commands and processors via registry
            registerCommands(this, {
                app: this.app,
                settings: this.settings,
                penMappings: this.penMappings,
                importerService: this.importerService,
                pageProcessor: this.pageProcessor,
                viewerService: this.viewerService,
                importWorkflow: this.importWorkflow,
                dragDropHandler: this.dragDropHandler,
                plugin: this
            });

            // Initialize auto-sync
            await this.initAutoSync();

            // Register auto-sync commands
            this.registerSyncCommands();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            new Notice(`Failed to initialize Viwoods plugin: ${message}`);
            console.error('[Viwoods] Plugin initialization error:', error);
        }
    }

    async onunload() {
        // Stop auto-sync on unload
        if (this.autoSyncService) {
            this.autoSyncService.stop();
        }
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    async loadPenMappings() {
        this.penMappings = await initPenMappings(this.app);
    }

    getKnownPenMappings(): PenMappings {
        return getPenMappings();
    }

    // ========================================================================
    // IMPORT WORKFLOW (delegates to ImportWorkflow service)
    // ========================================================================

    async processNoteFile(file: File): Promise<void> {
        if (!this.importWorkflow) {
            new Notice('Import workflow not initialized');
            return;
        }
        await this.importWorkflow.processNoteFile(file);
    }

    // ========================================================================
    // SETTINGS
    // ========================================================================

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // ========================================================================
    // AUTO-SYNC
    // ========================================================================

    async initAutoSync(): Promise<void> {
        if (!this.autoSyncService) return;
        await this.autoSyncService.loadState();
        this.statusBarItem = this.addStatusBarItem();
        this.updateSyncStatusBar();
        if (this.settings.enableAutoSync && this.settings.sourceFolderPath) {
            await this.autoSyncService.start();
            if (this.settings.syncOnStartup) {
                // Use setTimeout directly for initial scan, not registerInterval
                window.setTimeout(() => {
                    this.autoSyncService?.scanForChanges();
                }, 5000);
            }
        }
    }

    updateSyncStatusBar(): void {
        if (!this.statusBarItem || !this.autoSyncService) return;
        if (!this.settings.enableAutoSync) {
            this.statusBarItem.textContent = '';
            return;
        }
        const lastScan = this.autoSyncService.getLastScanTime();
        const pendingChanges = this.autoSyncService.getPendingChangesCount();
        let icon = '🔄';
        let text = '';
        if (pendingChanges > 0) {
            icon = '📝';
            text = `${pendingChanges} change${pendingChanges > 1 ? 's' : ''}`;
        } else if (lastScan > 0) {
            icon = '✅';
            const minutesAgo = Math.floor((Date.now() - lastScan) / 60000);
            text = minutesAgo < 1 ? 'Just now' : minutesAgo < 60 ? `${minutesAgo}m ago` : `${Math.floor(minutesAgo / 60)}h ago`;
        } else {
            text = 'Syncing...';
        }
        this.statusBarItem.textContent = `${icon} ${text}`;
    }

    registerSyncCommands(): void {
        this.addCommand({
            id: 'viwoods-scan-folder',
            name: 'Scan Viwoods folder for changes',
            checkCallback: (checking) => {
                if (this.settings.enableAutoSync && this.settings.sourceFolderPath) {
                    if (!checking) this.autoSyncService?.scanForChanges();
                    return true;
                }
                return false;
            }
        });
        this.addCommand({
            id: 'viwoods-import-detected',
            name: 'Import detected changes',
            checkCallback: (checking) => {
                const pendingCount = this.autoSyncService?.getPendingChangesCount() || 0;
                if (pendingCount > 0) {
                    if (!checking) this.autoSyncService?.importDetectedChanges();
                    return true;
                }
                return false;
            }
        });
        this.addCommand({
            id: 'viwoods-set-source-folder',
            name: 'Set Viwoods source folder',
            callback: () => new Notice('Please set the source folder in plugin settings')
        });
        this.addCommand({
            id: 'viwoods-toggle-auto-sync',
            name: 'Enable/disable auto-sync',
            checkCallback: (checking) => {
                if (!checking) {
                    this.settings.enableAutoSync = !this.settings.enableAutoSync;
                    this.saveSettings();
                    if (this.settings.enableAutoSync) {
                        if (!this.settings.sourceFolderPath) {
                            new Notice('Please set a source folder in settings first');
                            this.settings.enableAutoSync = false;
                            this.saveSettings();
                        } else {
                            this.autoSyncService?.start();
                            new Notice('Auto-sync enabled');
                        }
                    } else {
                        this.autoSyncService?.stop();
                        new Notice('Auto-sync disabled');
                    }
                    this.updateSyncStatusBar();
                }
                return true;
            }
        });
        this.addCommand({
            id: 'viwoods-sync-status',
            name: 'View sync status',
            callback: () => {
                const pendingCount = this.autoSyncService?.getPendingChangesCount() || 0;
                const lastScan = this.autoSyncService?.getLastScanTime() || 0;
                let message = `Viwoods Auto-Sync\n\nSource: ${this.settings.sourceFolderPath || 'Not set'}\n`;
                message += `Status: ${this.settings.enableAutoSync ? 'Enabled' : 'Disabled'}\n`;
                message += `Pending: ${pendingCount}\n`;
                message += `Last scan: ${lastScan ? new Date(lastScan).toLocaleString() : 'Never'}`;
                new Notice(message);
            }
        });
        this.addCommand({
            id: 'viwoods-clear-sync-state',
            name: 'Clear sync state (re-import all)',
            callback: async () => {
                if (!this.autoSyncService) {
                    new Notice('Auto-sync service not available');
                    return;
                }

                // Get current state info
                const state = this.autoSyncService.getState();
                const knownFilesCount = Object.keys(state.knownFiles || {}).length;

                // Confirmation notice
                const confirmMsg = `This will clear all sync state including ${knownFilesCount} tracked files. ` +
                    `All files will be treated as new on next scan and will be re-imported/overwritten. ` +
                    `Continue?`;

                // Show confirmation modal
                const confirmed = await this.confirmAction(
                    'Clear Sync State',
                    confirmMsg,
                    'Clear State',
                    'Cancel'
                );

                if (confirmed) {
                    await this.autoSyncService.clearState();
                    new Notice('Sync state cleared. All files will be re-imported on next scan.');
                    this.updateSyncStatusBar();
                }
            }
        });
    }

    async startAutoSync(): Promise<void> {
        if (!this.settings.sourceFolderPath) {
            new Notice('Please set a source folder first');
            return;
        }
        await this.autoSyncService?.start();
        this.updateSyncStatusBar();
    }

    /**
     * Show a confirmation modal for destructive actions
     */
    private async confirmAction(title: string, message: string, confirmText: string, cancelText: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new ConfirmationModal(this.app, title, message, confirmText, cancelText, (confirmed) => {
                resolve(confirmed);
            });
            modal.open();
        });
    }

    stopAutoSync(): void {
        this.autoSyncService?.stop();
        this.updateSyncStatusBar();
    }

    async restartAutoSync(): Promise<void> {
        this.autoSyncService?.stop();
        await this.autoSyncService?.start();
        this.updateSyncStatusBar();
    }
}

/**
 * Simple confirmation modal for destructive actions
 */
class ConfirmationModal extends Modal {
    private confirmed = false;
    private onConfirm: (confirmed: boolean) => void;

    constructor(
        app: App,
        private title: string,
        private message: string,
        private confirmText: string,
        private cancelText: string,
        onConfirm: (confirmed: boolean) => void
    ) {
        super(app);
        this.onConfirm = onConfirm;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.addClass('viwoods-confirmation-modal');

        contentEl.createEl('h2', { text: this.title });
        contentEl.createEl('p', { text: this.message });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

        const confirmBtn = new ButtonComponent(buttonContainer);
        confirmBtn.setButtonText(this.confirmText);
        confirmBtn.setWarning();
        confirmBtn.onClick(() => {
            this.confirmed = true;
            this.close();
        });

        const cancelBtn = new ButtonComponent(buttonContainer);
        cancelBtn.setButtonText(this.cancelText);
        cancelBtn.onClick(() => {
            this.confirmed = false;
            this.close();
        });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
        this.onConfirm(this.confirmed);
    }
}
