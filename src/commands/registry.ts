// commands/registry.ts - Centralized command registration for Viwoods Obsidian

import { Plugin, MarkdownView, App } from 'obsidian';
import type { ViwoodsSettings, PenMappings } from '../types.js';
import { ViewerService } from '../services/viewer-service.js';
import { DragDropHandler } from '../handlers/drag-drop-handler.js';
import { exportCurrentPageToPDF } from './export-pdf-command.js';
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
        name: 'Export current page to pdf',
        editorCallback: async (_editor, view) => {
            const markdownView = view instanceof MarkdownView ? view : app.workspace.getActiveViewOfType(MarkdownView);
            if (markdownView) {
                await exportCurrentPageToPDF(app, settings, penMappings, markdownView);
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
