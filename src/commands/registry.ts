// commands/registry.ts - Centralized command registration for Viwoods Notes Importer

import { Plugin, Notice, MarkdownView, App } from 'obsidian';
import type { ViwoodsSettings, PenMappings } from '../types.js';
import { ImportModal, ExportModal } from '../ui/modals.js';
import { ViewerService } from '../services/viewer-service.js';
import { ImportWorkflow } from '../services/import-workflow.js';
import { DragDropHandler } from '../handlers/drag-drop-handler.js';
import { exportCurrentPageToPDF } from './export-pdf-command.js';
import { resetBookHashes } from './reset-hashes-command.js';
import { ViwoodsSettingTab } from '../settings.js';
import type { ImporterService } from '../services/importer-service.js';
import type { PageProcessor } from '../services/page-processor.js';

// Minimal interface for plugin to avoid circular dependency
export interface IViwoodsPlugin {
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
    importerService: ImporterService;
    pageProcessor: PageProcessor;
    viewerService: ViewerService;
    importWorkflow: ImportWorkflow;
    dragDropHandler: DragDropHandler;
    plugin: IViwoodsPlugin;
}

export function registerCommands(plugin: Plugin, deps: CommandRegistryDependencies): void {
    const { app, settings, penMappings, viewerService, importWorkflow, dragDropHandler, plugin: pluginInstance } = deps;

    // Register commands
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

    plugin.addCommand({
        id: 'export-viwoods-book',
        name: 'Export Viwoods book',
        callback: () => {
            new ExportModal(app, pluginInstance).open();
        }
    });

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

    plugin.addCommand({
        id: 'reset-book-hashes',
        name: 'Reset book hashes (fix change detection)',
        callback: async () => {
            await resetBookHashes(app, settings);
        }
    });

    // Register markdown code block processor
    plugin.registerMarkdownCodeBlockProcessor('viwoods-svg', async (source, el, _ctx) => {
        await viewerService.renderSvgViewer(source, el);
    });

    // Register drag and drop handlers
    plugin.registerDomEvent(document, 'drop', (evt: DragEvent) => dragDropHandler.handleDrop(evt));
    plugin.registerDomEvent(document, 'dragover', (evt: DragEvent) => dragDropHandler.handleDragOver(evt));

    // Add settings tab
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ViwoodsSettingTab requires full plugin type
    plugin.addSettingTab(new ViwoodsSettingTab(app, pluginInstance as any));
}
