// services/import-workflow.ts - Import workflow orchestration for Viwoods Notes Importer

import { App, Notice, TFolder } from 'obsidian';
import type { ViwoodsSettings, BookResult, ImportManifest, PageChange, ImportSummary } from '../types.js';
import { ImporterService } from './importer-service.js';
import { PageProcessor } from './page-processor.js';
import { OneToOneImporter } from './one-to-one-importer.js';
import { ImportSummaryModal, EnhancedImportModal } from '../ui/modals.js';
import { loadManifest, saveManifest, addHistoryEntry, recoverManifestFromExistingFiles, ensureFolder, analyzeChanges } from '../utils/file-utils.js';
import { hasJSZip } from '../utils/external-libs.js';
import { ExternalFileAccess } from '../utils/external-file-access.js';
import { log } from '../utils/logger.js';

export class ImportWorkflow {
    private app: App;
    private settings: ViwoodsSettings;
    private importerService: ImporterService;
    private pageProcessor: PageProcessor;
    private importInProgress = false;

    constructor(
        app: App,
        settings: ViwoodsSettings,
        importerService: ImporterService,
        pageProcessor: PageProcessor
    ) {
        this.app = app;
        this.settings = settings;
        this.importerService = importerService;
        this.pageProcessor = pageProcessor;
    }

    getImportInProgress(): boolean {
        return this.importInProgress;
    }

    async processNoteFile(file: File): Promise<void> {
        if (this.importInProgress) {
            new Notice('Import already in progress');
            return;
        }
        this.importInProgress = true;
        try {
            if (!hasJSZip()) {
                new Notice('JSZip library not loaded. Please restart Obsidian.');
                return;
            }

            const zip = await (window as any).JSZip.loadAsync(file);
            const files = Object.keys(zip.files);
            const isNewFormat = files.some((f: string) => f.includes('NoteFileInfo.json'));
            const bookResult = await this.importerService.convertNoteToBook(zip, files, file.name, isNewFormat);

            const bookFolder = `${this.settings.notesFolder}/${bookResult.bookName}`;
            const manifestPath = `${bookFolder}/.import-manifest.json`;

            let existingManifest = await loadManifest(this.app, manifestPath);
            if (!existingManifest) {
                const folderExists = this.app.vault.getAbstractFileByPath(bookFolder);
                if (folderExists instanceof TFolder) {
                    log.debug('Book folder exists but no manifest, attempting recovery...');
                    existingManifest = await recoverManifestFromExistingFiles(
                        this.app,
                        bookFolder,
                        bookResult.bookName,
                        this.settings,
                        addHistoryEntry,
                        (app, path, manifest) => saveManifest(app, path, manifest, ensureFolder)
                    );
                }
            }

            // Note: Backups removed in simplified version

            let analysis: { changes: PageChange[], summary: ImportSummary } | null = null;
            // Note: Auto-detect changes simplified - always analyze if manifest exists
            if (existingManifest) {
                analysis = await analyzeChanges(this.app, bookResult, existingManifest, this.settings);
            }

            const pagesToImport = await this.showEnhancedImportDialog(bookResult, existingManifest, analysis);
            if (pagesToImport.length === 0) {
                new Notice('Import cancelled or no pages selected');
                return;
            }

            const summary = await this.pageProcessor.importSelectedPages(
                bookResult,
                pagesToImport,
                existingManifest,
                manifestPath,
                async (summary, manifest) => {
                    const historyMessage = `Imported ${summary.newPages.length} new, ${summary.modifiedPages.length} modified pages`;
                    addHistoryEntry(manifest, 'import', pagesToImport, historyMessage, 10); // Default history entries
                    // Note: Index creation removed in simplified version
                    await saveManifest(this.app, manifestPath, manifest, ensureFolder);
                }
            );

            new ImportSummaryModal(this.app, summary, null).open();
        } catch (error: any) {
            log.error('Error processing note file:', error);
            new Notice(`Failed to import: ${file.name}\n${error.message}`);
        } finally {
            this.importInProgress = false;
        }
    }

    async showEnhancedImportDialog(
        bookResult: BookResult,
        existingManifest: ImportManifest | null,
        analysis: { changes: PageChange[], summary: ImportSummary } | null
    ): Promise<number[]> {
        return new Promise((resolve) => {
            const modal = new EnhancedImportModal(this.app, bookResult, existingManifest, analysis, this.settings);
            modal.onChoose = (pages: number[]) => resolve(pages);
            modal.open();
        });
    }

    /**
     * Process a note file from an external file path (for auto-sync)
     * @param filePath - Absolute path to the .note file
     */
    async processNoteFromPath(filePath: string): Promise<void> {
        if (this.importInProgress) {
            new Notice('Import already in progress');
            return;
        }

        try {
            // Use ExternalFileAccess to read the file
            const fileAccess = new ExternalFileAccess();
            const blob = await fileAccess.readFileAsBlob(filePath);

            // Extract filename from path
            const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'note.note';

            // Create a File object from the Blob
            const file = new File([blob], fileName, {
                type: 'application/zip'
            });

            // Use existing processNoteFile method
            await this.processNoteFile(file);
        } catch (error: any) {
            log.error('Error importing from path:', error);
            new Notice(`Failed to import from ${filePath}: ${error.message}`);
        }
    }

    /**
     * Auto-import a note file using simplified one-to-one mode (skips modal dialogs)
     * @param file - File object to import
     * @param relativePath - Relative path from source folder (for folder structure)
     * @returns Import result
     */
    async processNoteFileAuto(file: File, relativePath?: string): Promise<{ success: boolean; filename: string; pagesImported: number }> {
        if (this.importInProgress) {
            log.warn('Import already in progress');
            return { success: false, filename: file.name, pagesImported: 0 };
        }
        this.importInProgress = true;
        try {
            if (!hasJSZip()) {
                new Notice('JSZip library not loaded. Please restart Obsidian.');
                return { success: false, filename: file.name, pagesImported: 0 };
            }

            // Parse the .note file
            const zip = await (window as any).JSZip.loadAsync(file);
            const files = Object.keys(zip.files);
            const isNewFormat = files.some((f: string) => f.includes('NoteFileInfo.json'));
            const bookResult = await this.importerService.convertNoteToBook(zip, files, file.name, isNewFormat);

            // Use OneToOneImporter for simplified import
            const oneToOneImporter = new OneToOneImporter(this.app, this.settings);
            const result = await oneToOneImporter.importNote(bookResult, relativePath);

            if (result.success) {
                log.debug(`Auto-imported ${result.filename} with ${result.pagesImported} pages`);
                return { success: true, filename: result.filename, pagesImported: result.pagesImported };
            } else {
                log.error('Auto-import failed:', result.error);
                new Notice(`Import failed: ${result.error}`);
                return { success: false, filename: file.name, pagesImported: 0 };
            }
        } catch (error: any) {
            log.error('Error in auto-import:', error);
            new Notice(`Failed to auto-import: ${file.name}\n${error.message}`);
            return { success: false, filename: file.name, pagesImported: 0 };
        } finally {
            this.importInProgress = false;
        }
    }

    /**
     * Auto-import a note file from an external file path (for auto-sync)
     * @param filePath - Absolute path to the .note file
     * @param relativePath - Relative path from source folder (for folder structure)
     * @returns Import result
     */
    async processNoteFromPathAuto(filePath: string, relativePath?: string): Promise<{ success: boolean; filename: string; pagesImported: number }> {
        if (this.importInProgress) {
            log.warn('Import already in progress');
            return { success: false, filename: filePath, pagesImported: 0 };
        }

        try {
            // Use ExternalFileAccess to read the file
            const fileAccess = new ExternalFileAccess();
            const blob = await fileAccess.readFileAsBlob(filePath);

            // Extract filename from path
            const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'note.note';

            // Create a File object from the Blob
            const file = new File([blob], fileName, {
                type: 'application/zip'
            });

            // Use auto-import method with relative path
            return await this.processNoteFileAuto(file, relativePath);
        } catch (error: any) {
            log.error('Error importing from path:', error);
            return { success: false, filename: filePath, pagesImported: 0 };
        }
    }
}
