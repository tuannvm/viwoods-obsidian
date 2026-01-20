// page-processor.ts - Page import processing business logic

import { App, TFile, normalizePath } from 'obsidian';
import type {
    BookResult,
    ImportManifest,
    ImportSummary,
    ViwoodsSettings,
    PageData
} from '../types.js';
import { ensureFolder } from '../utils/file-utils.js';
import { processImageWithBackground } from '../utils/image-utils.js';
import { strokesToSVG } from '../utils/svg-generator.js';
import { log } from '../utils/logger.js';
import { OCRService } from './ocr-service.js';

// Progress modal interface (from ui/modals.ts)
interface ProgressModal {
    open(): void;
    close(): void;
    updateProgress(current: number, message: string): void;
}

type ProgressModalConstructor = new (app: App, totalPages: number) => ProgressModal;

export class PageProcessor {
    private progressModal: ProgressModal | null;
    private ProgressModalClass: ProgressModalConstructor;
    private ocrService: OCRService;

    constructor(
        private app: App,
        private settings: ViwoodsSettings,
        ProgressModalClass: ProgressModalConstructor
    ) {
        this.ProgressModalClass = ProgressModalClass;
        this.progressModal = null;
        this.ocrService = OCRService.getInstance();
    }

    async importSelectedPages(
        bookResult: BookResult,
        pagesToImport: number[],
        existingManifest: ImportManifest | null,
        onImportComplete: (summary: ImportSummary, manifest: ImportManifest) => Promise<void>
    ): Promise<ImportSummary> {
        const bookFolder = `${this.settings.notesFolder}/${bookResult.bookName}`;
        await ensureFolder(this.app, bookFolder);

        const imagesFolder = `${bookFolder}/${this.settings.imagesFolder}`;
        await ensureFolder(this.app, imagesFolder);

        const audioFolder = `${bookFolder}/${this.settings.audioFolder}`;
        await ensureFolder(this.app, audioFolder);

        const strokesFolder = `${bookFolder}/${this.settings.strokesFolder}`;
        await ensureFolder(this.app, strokesFolder);

        const manifest: ImportManifest = existingManifest || {
            bookName: bookResult.bookName,
            totalPages: 0,
            importedPages: {},
            lastImport: new Date().toISOString(),
            sourceFile: bookResult.bookName,
            version: '1.1',
            history: []
        };
        manifest.totalPages = Math.max(manifest.totalPages, bookResult.pages.length);

        const summary: ImportSummary = {
            totalPages: pagesToImport.length,
            newPages: [],
            modifiedPages: [],
            unchangedPages: [],
            deletedPages: [],
            errors: []
        };

        const batchSize = this.settings.batchSize;

        for (let batchStart = 0; batchStart < pagesToImport.length; batchStart += batchSize) {
            const batch = pagesToImport.slice(batchStart, Math.min(batchStart + batchSize, pagesToImport.length));

            await Promise.all(batch.map(async (pageNum) => {
                await this.importPage(
                    bookResult,
                    pageNum,
                    bookFolder,
                    imagesFolder,
                    audioFolder,
                    strokesFolder,
                    manifest,
                    summary,
                    existingManifest
                );
            }));

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        await onImportComplete(summary, manifest);
        return summary;
    }

    private async importPage(
        bookResult: BookResult,
        pageNum: number,
        bookFolder: string,
        imagesFolder: string,
        audioFolder: string,
        strokesFolder: string,
        manifest: ImportManifest,
        summary: ImportSummary,
        existingManifest: ImportManifest | null
    ): Promise<void> {
        const page = bookResult.pages.find(p => p.pageNum === pageNum);
        if (!page) return;

        try {
            const isNew = !existingManifest?.importedPages[pageNum];
            const isModified = existingManifest?.importedPages[pageNum]?.imageHash !== page.image.hash;

            if (isNew) summary.newPages.push(pageNum);
            else if (isModified) summary.modifiedPages.push(pageNum);
            else summary.unchangedPages.push(pageNum);

            // Perform OCR if enabled (before building content)
            let ocrText: string | undefined;
            if (this.settings.enableOcr && (isNew || isModified || !manifest.importedPages[pageNum]?.ocrProcessed)) {
                ocrText = await this.performOCR(page);
            } else if (manifest.importedPages[pageNum]?.ocrText) {
                ocrText = manifest.importedPages[pageNum].ocrText;
            }

            // Save stroke data
            if (page.stroke) {
                await this.saveStrokeData(page.stroke, bookResult.bookName, pageNum, strokesFolder, isNew || isModified);
            }

            // Build page content
            const pageContent = await this.buildPageContent(bookResult, page, pageNum, manifest, isNew, isModified, bookFolder, ocrText);

            // Save the markdown file
            const pageFileName = `Page ${String(pageNum).padStart(3, '0')}.md`;
            const pagePath = `${bookFolder}/${pageFileName}`;
            const existingFile = this.app.vault.getAbstractFileByPath(pagePath);
            if (existingFile instanceof TFile) {
                await this.app.vault.modify(existingFile, pageContent);
            } else {
                await this.app.vault.create(pagePath, pageContent);
            }

            // Save image
            if (this.settings.outputFormat === 'png' || this.settings.outputFormat === 'both') {
                await this.savePageImage(page, bookResult.bookName, pageNum, imagesFolder, isNew, isModified, existingManifest);
            }

            // Save SVG if enabled
            if ((this.settings.outputFormat === 'svg' || this.settings.outputFormat === 'both') && page.stroke) {
                await this.savePageSvg(page.stroke, bookResult.bookName, pageNum, imagesFolder, isNew || isModified);
            }

            // Save audio
            if (page.audio) {
                await this.savePageAudio(page.audio, audioFolder, isNew || isModified);
            }

            // Update manifest
            manifest.importedPages[pageNum] = {
                fileName: pageFileName,
                importDate: new Date().toISOString(),
                imageHash: page.image.hash,
                geminiProcessed: manifest.importedPages[pageNum]?.geminiProcessed || false,
                ocrProcessed: !!ocrText,
                ocrText: ocrText,
                hasAudio: !!page.audio,
                lastModified: new Date().toISOString(),
                size: page.image.blob.size,
                backgroundColor: this.settings.backgroundColor
            };
        } catch (error: unknown) {
            log.error(`Failed to import page ${pageNum}:`, error);
            summary.errors.push({ page: pageNum, error: error instanceof Error ? error.message : String(error) });
        }
    }

    private async saveStrokeData(stroke: number[][] | undefined, bookName: string, pageNum: number, strokesFolder: string, shouldUpdate: boolean): Promise<void> {
        const strokeFileName = `${bookName}_page_${String(pageNum).padStart(3, '0')}_strokes.json`;
        const strokePath = `${strokesFolder}/${strokeFileName}`;
        const normalizedStrokePath = normalizePath(strokePath);
        const existingStroke = this.app.vault.getAbstractFileByPath(normalizedStrokePath);
        const strokeContent = JSON.stringify(stroke, null, 2);

        if (existingStroke instanceof TFile) {
            if (shouldUpdate) await this.app.vault.modify(existingStroke, strokeContent);
        } else {
            await this.app.vault.create(normalizedStrokePath, strokeContent);
        }
    }

    private async savePageImage(
        page: PageData,
        bookName: string,
        pageNum: number,
        imagesFolder: string,
        isNew: boolean,
        isModified: boolean,
        existingManifest: ImportManifest | null
    ): Promise<TFile | undefined> {
        const imageName = `${bookName}_page_${String(pageNum).padStart(3, '0')}.png`;
        const imagePath = `${imagesFolder}/${imageName}`;
        const normalizedImagePath = normalizePath(imagePath);
        const existingImage = this.app.vault.getAbstractFileByPath(normalizedImagePath);

        try {
            const needsImageUpdate = isNew || isModified;
            const backgroundChanged = existingManifest?.importedPages[pageNum]?.backgroundColor !== this.settings.backgroundColor;

            if (existingImage instanceof TFile) {
                if (needsImageUpdate || backgroundChanged) {
                    const processedImage = await processImageWithBackground(page.image.blob, this.settings.backgroundColor);
                    await this.app.fileManager.trashFile(existingImage);
                    return await this.app.vault.createBinary(normalizedImagePath, processedImage);
                }
                return existingImage;
            } else {
                const processedImage = await processImageWithBackground(page.image.blob, this.settings.backgroundColor);
                return await this.app.vault.createBinary(normalizedImagePath, processedImage);
            }
        } catch (imageError) {
            log.error(`Failed to process image for page ${pageNum}:`, imageError);
            return undefined;
        }
    }

    private async savePageSvg(stroke: number[][] | undefined, bookName: string, pageNum: number, imagesFolder: string, shouldUpdate: boolean): Promise<void> {
        if (!stroke) return;
        const svgContent = strokesToSVG(stroke);
        const svgName = `${bookName}_page_${String(pageNum).padStart(3, '0')}.svg`;
        const svgPath = `${imagesFolder}/${svgName}`;
        const normalizedSvgPath = normalizePath(svgPath);
        const existingSvg = this.app.vault.getAbstractFileByPath(normalizedSvgPath);

        if (existingSvg instanceof TFile) {
            if (shouldUpdate) await this.app.vault.modify(existingSvg, svgContent);
        } else {
            await this.app.vault.create(normalizedSvgPath, svgContent);
        }
    }

    private async savePageAudio(audio: { blob: Blob; name: string; originalName: string }, audioFolder: string, shouldUpdate: boolean): Promise<void> {
        const audioPath = `${audioFolder}/${audio.name}`;
        const normalizedAudioPath = normalizePath(audioPath);
        const existingAudio = this.app.vault.getAbstractFileByPath(normalizedAudioPath);

        if (existingAudio instanceof TFile) {
            if (shouldUpdate) {
                await this.app.fileManager.trashFile(existingAudio);
                await this.app.vault.createBinary(normalizedAudioPath, await audio.blob.arrayBuffer());
            }
        } else {
            await this.app.vault.createBinary(normalizedAudioPath, await audio.blob.arrayBuffer());
        }
    }

    /**
     * Perform OCR on a page's image
     */
    private async performOCR(page: PageData): Promise<string | undefined> {
        if (!this.ocrService.isAvailable()) {
            log.debug('OCR not available, skipping OCR for page', page.pageNum);
            return undefined;
        }

        try {
            log.debug('Performing OCR on page', page.pageNum);
            const result = await this.ocrService.performOCROnBlob(page.image.blob, {
                languages: this.settings.ocrLanguages,
                confidenceThreshold: this.settings.ocrConfidenceThreshold
            });

            if (result.success && result.text.trim().length > 0) {
                log.debug('OCR succeeded for page', page.pageNum, 'text length:', result.text.length);
                return result.text;
            } else {
                log.debug('OCR returned no text for page', page.pageNum, 'confidence:', result.confidence);
                return undefined;
            }
        } catch (error) {
            log.warn(`OCR failed for page ${page.pageNum}:`, error);
            return undefined;
        }
    }

    private async buildPageContent(
        bookResult: BookResult,
        page: PageData,
        pageNum: number,
        manifest: ImportManifest,
        isNew: boolean,
        isModified: boolean,
        bookFolder: string,
        ocrText?: string
    ): Promise<string> {
        let pageContent = '';

        // 1. Metadata (frontmatter) - match one-to-one-importer format
        if (this.settings.includeMetadata) {
            pageContent += '---\n';
            pageContent += `title: ${bookResult.bookName}\n`;
            pageContent += `source: ${bookResult.bookName}.note\n`;
            pageContent += `total_pages: ${manifest.totalPages}\n`;
            pageContent += `viwoods: true\n`;

            if (this.settings.includeTimestamps) {
                pageContent += `created: ${new Date().toISOString()}\n`;
                pageContent += `modified: ${new Date().toISOString()}\n`;
            }

            pageContent += '---\n\n';
        }

        // 2. Table of Contents
        pageContent += '# Table of Contents\n\n';
        for (const p of bookResult.pages) {
            pageContent += `- [[#Page ${p.pageNum}]]\n`;
        }
        pageContent += '\n---\n\n';

        // 3. Page content with transclusion format
        pageContent += `## Page ${pageNum}\n\n`;

        // 4. Original Image using transclusion format
        if (this.settings.outputFormat === 'png' || this.settings.outputFormat === 'both') {
            const imageName = `${bookResult.bookName}_page_${String(pageNum).padStart(3, '0')}.png`;
            const imagePath = `${this.settings.imagesFolder}/${imageName}`;
            pageContent += `![Page ${pageNum}](<${imagePath}>)\n\n`;
        }

        // 5. OCR Text (if enabled and available)
        if (ocrText && ocrText.trim().length > 0) {
            pageContent += `## Extracted Text (OCR)\n\n`;
            pageContent += `${ocrText}\n\n`;
            pageContent += '---\n\n';
        }

        return pageContent;
    }

    async createBookIndex(bookFolder: string, bookName: string): Promise<void> {
        const indexPath = `${bookFolder}/Index.md`;
        const bookTag = bookName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
        let indexContent = '---\ncssclasses: cards\n---\n\n';
        indexContent += '```dataview\nTABLE embed(link(image))\n';
        indexContent += `FROM #${bookTag}\nSORT page ASC\n\`\`\`\n`;
        const existingIndex = this.app.vault.getAbstractFileByPath(indexPath);
        if (existingIndex instanceof TFile) {
            await this.app.vault.modify(existingIndex, indexContent);
        } else {
            await this.app.vault.create(indexPath, indexContent);
        }
    }
}
