// page-processor.ts - Page import processing business logic

import { App, TFile, normalizePath } from 'obsidian';
import type {
    BookResult,
    ImportManifest,
    ImportSummary,
    ViwoodsSettings
} from '../types.js';
import { formatDate, ensureFolder } from '../utils/file-utils.js';
import { processImageWithBackground } from '../utils/image-utils.js';
import { strokesToSVG } from '../utils/svg-generator.js';
import { log } from '../utils/logger.js';

export class PageProcessor {
    private progressModal: any;

    constructor(
        private app: App,
        private settings: ViwoodsSettings,
        ProgressModalClass: any
    ) {
        this.progressModal = null;
    }

    async importSelectedPages(
        bookResult: BookResult,
        pagesToImport: number[],
        existingManifest: ImportManifest | null,
        manifestPath: string,
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
            summary.newPages.length + summary.modifiedPages.length + summary.unchangedPages.length;
            const isNew = !existingManifest?.importedPages[pageNum];
            const isModified = existingManifest?.importedPages[pageNum]?.imageHash !== page.image.hash;

            if (isNew) summary.newPages.push(pageNum);
            else if (isModified) summary.modifiedPages.push(pageNum);
            else summary.unchangedPages.push(pageNum);

            // Save stroke data
            if (page.stroke) {
                await this.saveStrokeData(page.stroke, bookResult.bookName, pageNum, strokesFolder, isNew || isModified);
            }

            // Build page content
            const pageContent = await this.buildPageContent(bookResult, page, pageNum, manifest, isNew, isModified, bookFolder);

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
                hasAudio: !!page.audio,
                lastModified: new Date().toISOString(),
                size: page.image.blob.size,
                backgroundColor: this.settings.backgroundColor
            };
        } catch (error: any) {
            log.error(`Failed to import page ${pageNum}:`, error);
            summary.errors.push({ page: pageNum, error: error.message });
        }
    }

    private async saveStrokeData(stroke: any, bookName: string, pageNum: number, strokesFolder: string, shouldUpdate: boolean): Promise<void> {
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
        page: any,
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
                    await this.app.vault.delete(existingImage);
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

    private async savePageSvg(stroke: any, bookName: string, pageNum: number, imagesFolder: string, shouldUpdate: boolean): Promise<void> {
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

    private async savePageAudio(audio: any, audioFolder: string, shouldUpdate: boolean): Promise<void> {
        const audioPath = `${audioFolder}/${audio.name}`;
        const normalizedAudioPath = normalizePath(audioPath);
        const existingAudio = this.app.vault.getAbstractFileByPath(normalizedAudioPath);

        if (existingAudio instanceof TFile) {
            if (shouldUpdate) {
                await this.app.vault.delete(existingAudio);
                await this.app.vault.createBinary(normalizedAudioPath, await audio.blob.arrayBuffer());
            }
        } else {
            await this.app.vault.createBinary(normalizedAudioPath, await audio.blob.arrayBuffer());
        }
    }

    private async buildPageContent(
        bookResult: BookResult,
        page: any,
        pageNum: number,
        manifest: ImportManifest,
        isNew: boolean,
        isModified: boolean,
        bookFolder: string
    ): Promise<string> {
        let pageContent = '';

        // 1. Metadata (frontmatter)
        if (this.settings.includeMetadata) {
            pageContent += '---\n';
            pageContent += `book: "${bookResult.bookName}"\n`;
            pageContent += `page: ${pageNum}\n`;
            pageContent += `total_pages: ${manifest.totalPages}\n`;
            pageContent += `original_image_hash: "${page.image.hash}"\n`;
            if (this.settings.includeTimestamps) {
                const createTime = bookResult.metadata.createTime || bookResult.metadata.creationTime;
                const updateTime = bookResult.metadata.upTime || bookResult.metadata.lastModifiedTime;
                if (createTime) pageContent += `book_created: ${formatDate(createTime, this.settings.dateFormat)}\n`;
                if (updateTime) pageContent += `book_updated: ${formatDate(updateTime, this.settings.dateFormat)}\n`;
            }
            pageContent += `import_date: ${new Date().toISOString()}\n`;
            if (isModified) pageContent += `last_modified: ${new Date().toISOString()}\n`;
            if (page.audio) pageContent += 'has_audio: true\n';
            if (page.stroke) pageContent += 'has_strokes: true\n';
            const imageName = `${bookResult.bookName}_page_${String(pageNum).padStart(3, '0')}.png`;
            pageContent += `image: "${imageName}"\n`;
            const bookTag = bookResult.bookName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
            pageContent += 'tags: [viwoods-import, handwritten, ' + bookTag + ']\n';
            pageContent += '---\n\n';
        }

        // 2. Audio (if exists)
        if (page.audio) {
            pageContent += `## 🎙️ Audio Recording\n\n`;
            pageContent += `![[${page.audio.name}]]\n\n`;
            pageContent += '---\n\n';
        }

        // 3. Original Image
        if (this.settings.outputFormat === 'png' || this.settings.outputFormat === 'both') {
            const imageName = `${bookResult.bookName}_page_${String(pageNum).padStart(3, '0')}.png`;
            pageContent += `## Original Image\n\n`;
            pageContent += `![[${imageName}]]\n\n`;
        }

        // 4. SVG Viewer (if enabled and has strokes)
        if (this.settings.enableSvgViewer && page.stroke) {
            pageContent += `## Vector Viewer\n\n`;
            const strokeFileName = `${bookResult.bookName}_page_${String(pageNum).padStart(3, '0')}_strokes.json`;
            pageContent += `\`\`\`viwoods-svg\n${strokeFileName}\n\`\`\`\n\n`;

            const pdfName = `${bookResult.bookName}_page_${String(pageNum).padStart(3, '0')}.pdf`;
            pageContent += `**Rendered Export**: [[${this.settings.pdfFolder}/${pdfName}]]\n\n`;
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
