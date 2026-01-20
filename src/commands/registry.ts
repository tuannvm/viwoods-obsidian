// commands/registry.ts - Centralized command registration for Viwoods Obsidian

import { Plugin, MarkdownView, App, Notice } from 'obsidian';
import type { ViwoodsSettings, PenMappings } from '../types.js';
import { ViewerService } from '../services/viewer-service.js';
import { DragDropHandler } from '../handlers/drag-drop-handler.js';
import { exportCurrentPageToPDF } from './export-pdf-command.js';
import { runOCROnAllNotes, runOCROnCurrentNote } from './run-ocr-command.js';
import { ViwoodsSettingTab } from '../settings.js';

// Minimal interface for plugin to avoid circular dependency
export interface IViwoodsPlugin extends Plugin {
    settings: ViwoodsSettings;
    processNoteFile(file: File): Promise<void>;
    saveSettings(): Promise<void>;
    startAutoSync(): Promise<void>;
    stopAutoSync(): void;
    restartAutoSync(): Promise<void>;
}

export interface CommandRegistryDependencies {
    app: App;
    settings: ViwoodsSettings;
    penMappings: PenMappings;
    viewerService: ViewerService;
    dragDropHandler: DragDropHandler;
    plugin: IViwoodsPlugin;
}

export function registerCommands(plugin: Plugin, deps: CommandRegistryDependencies): void {
    const { app, settings, penMappings, viewerService, dragDropHandler, plugin: pluginInstance } = deps;

    // Register commands
    /*
    // Disabled - Import handled via auto-sync and drag-drop
    plugin.addCommand({
        id: 'import-viwoods-note',
        name: 'Import Viwoods .note file',
        callback: () => {
            if (importWorkflow.getImportInProgress()) {
                new Notice('Import already in progress');
                return;
            }
            new ImportModal(app, pluginInstance).open();
        }
    });
    */

    /*
    // Disabled - Export feature removed from UI
    plugin.addCommand({
        id: 'export-viwoods-book',
        name: 'Export Viwoods book',
        callback: () => {
            new ExportModal(app, pluginInstance).open();
        }
    });
    */

    plugin.addCommand({
        id: 'export-page-to-pdf',
        name: 'Export current page to PDF',
        editorCallback: async (_editor, view) => {
            const markdownView = view instanceof MarkdownView ? view : app.workspace.getActiveViewOfType(MarkdownView);
            if (markdownView) {
                await exportCurrentPageToPDF(app, settings, penMappings, markdownView);
            }
        }
    });

    // OCR Commands
    plugin.addCommand({
        id: 'run-ocr-current-note',
        name: 'Run OCR on current note',
        checkCallback: (checking: boolean) => {
            const activeFile = app.workspace.getActiveFile();
            if (activeFile && activeFile.extension === 'md') {
                if (!checking) {
                    runOCROnCurrentNote(app, settings).then(result => {
                        if (result.error) {
                            new Notice(result.error);
                        } else if (result.textExtracted) {
                            new Notice('OCR text extracted and added to note');
                        } else {
                            new Notice('No text found or already processed');
                        }
                    });
                }
                return true;
            }
            return false;
        }
    });

    plugin.addCommand({
        id: 'run-ocr-all-notes',
        name: 'Run OCR on all Viwoods notes',
        callback: async () => {
            const summary = await runOCROnAllNotes(app, settings);
            const message = `OCR completed: ${summary.processedNotes}/${summary.totalNotes} notes processed`;
            new Notice(message);
            if (summary.errors.length > 0) {
                console.log('OCR errors:', summary.errors);
            }
        }
    });

    /*
    // Disabled - Reset hashes removed from UI
    plugin.addCommand({
        id: 'reset-book-hashes',
        name: 'Reset book hashes (fix change detection)',
        callback: async () => {
            await resetBookHashes(app, settings);
        }
    });
    */

    // Register markdown code block processor
    plugin.registerMarkdownCodeBlockProcessor('viwoods-svg', async (source, el, _ctx) => {
        await viewerService.renderSvgViewer(source, el);
    });

    // Register drag and drop handlers
    plugin.registerDomEvent(document, 'drop', (evt: DragEvent) => dragDropHandler.handleDrop(evt));
    plugin.registerDomEvent(document, 'dragover', (evt: DragEvent) => dragDropHandler.handleDragOver(evt));

    // Add settings tab
    plugin.addSettingTab(new ViwoodsSettingTab(app, pluginInstance));
}
