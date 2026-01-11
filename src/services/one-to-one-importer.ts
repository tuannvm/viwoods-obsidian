// services/one-to-one-importer.ts - Simplified one-to-one import service

import { App, TFile } from 'obsidian';
import type { ViwoodsSettings, BookResult } from '../types.js';
import { ensureFolder } from '../utils/file-utils.js';

/**
 * Result of a one-to-one import operation
 */
export interface ImportResult {
    success: boolean;
    filename: string;
    pagesImported: number;
    attachments: string[];
    error?: string;
}

/**
 * Simplified importer that creates one .md file per .note file
 * with all pages as sections and attachments in a subfolder
 */
export class OneToOneImporter {
    private app: App;
    private settings: ViwoodsSettings;

    constructor(app: App, settings: ViwoodsSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * Import a note file as a single markdown document
     */
    async importNote(book: BookResult): Promise<ImportResult> {
        try {
            // Create attachments folder
            const attachmentsFolder = '_attachments';
            await ensureFolder(this.app, `${this.settings.notesFolder}/${attachmentsFolder}`);

            // Save all attachments and get their filenames
            const attachments = await this.saveAttachments(book, attachmentsFolder);

            // Build the single markdown content
            const markdown = this.buildSingleMarkdown(book, attachments);

            // Save the markdown file
            const filename = `${book.bookName}.md`;
            await this.saveMarkdown(markdown, filename);

            return {
                success: true,
                filename,
                pagesImported: book.pages.length,
                attachments
            };
        } catch (error: any) {
            console.error('Error importing note:', error);
            return {
                success: false,
                filename: book.bookName + '.md',
                pagesImported: 0,
                attachments: [],
                error: error.message
            };
        }
    }

    /**
     * Build a single markdown file with all pages
     */
    private buildSingleMarkdown(book: BookResult, attachments: string[]): string {
        const lines: string[] = [];

        // Frontmatter
        if (this.settings.includeMetadata) {
            lines.push('---');
            lines.push(`title: ${book.bookName}`);
            lines.push(`source: ${book.bookName}.note`);
            lines.push(`total_pages: ${book.pages.length}`);
            lines.push(`viwoods: true`);

            if (this.settings.includeTimestamps) {
                lines.push(`created: ${new Date().toISOString()}`);
                lines.push(`modified: ${new Date().toISOString()}`);
            }

            lines.push('---');
            lines.push('');
        }

        // Table of Contents
        lines.push('# Table of Contents');
        lines.push('');
        for (const page of book.pages) {
            lines.push(`- [[#Page ${page.pageNum}]]`);
        }
        lines.push('');
        lines.push('---');
        lines.push('');

        // Pages as sections
        for (const page of book.pages) {
            lines.push(`## Page ${page.pageNum}`);
            lines.push('');

            // Find the attachment for this page
            const pageImage = attachments.find(a => a.includes(`_page_${page.pageNum}.`));
            if (pageImage) {
                lines.push(`![Page ${page.pageNum}](attachments/${pageImage})`);
                lines.push('');
            }

            // Audio link if present
            if (page.audio) {
                const audioBaseName = page.audio.originalName.split('.')[0];
                const audioFile = attachments.find(a => a.includes(audioBaseName));
                if (audioFile) {
                    lines.push(`🎵 [[attachments/${audioFile}]]`);
                    lines.push('');
                }
            }

            lines.push('---');
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Save all attachments (images and audio) to the _attachments folder
     */
    private async saveAttachments(book: BookResult, attachmentsFolder: string): Promise<string[]> {
        const savedFiles: string[] = [];

        // Save images
        for (const page of book.pages) {
            const ext = this.settings.outputFormat === 'svg' ? 'svg' : 'png';
            const filename = `${book.bookName}_page_${page.pageNum}.${ext}`;
            const filepath = `${this.settings.notesFolder}/${attachmentsFolder}/${filename}`;

            try {
                // Create folder if it doesn't exist
                await ensureFolder(this.app, `${this.settings.notesFolder}/${attachmentsFolder}`);

                // Convert blob to buffer
                const buffer = await page.image.blob.arrayBuffer();
                const uint8Array = new Uint8Array(buffer);

                // Use app.vault.createBinary() instead of adapter.writeBinary()
                // This triggers proper Obsidian events for Notepix to detect
                const existingFile = this.app.vault.getAbstractFileByPath(filepath);
                if (existingFile instanceof TFile) {
                    await this.app.vault.modifyBinary(existingFile, uint8Array);
                } else {
                    await this.app.vault.createBinary(filepath, uint8Array);
                }
                savedFiles.push(filename);
            } catch (error) {
                console.error(`Failed to save attachment ${filename}:`, error);
            }
        }

        // Save audio files
        for (const page of book.pages) {
            if (page.audio) {
                const filename = page.audio.originalName;
                const filepath = `${this.settings.notesFolder}/${attachmentsFolder}/${filename}`;

                try {
                    const buffer = await page.audio.blob.arrayBuffer();
                    const uint8Array = new Uint8Array(buffer);

                    const existingFile = this.app.vault.getAbstractFileByPath(filepath);
                    if (existingFile instanceof TFile) {
                        await this.app.vault.modifyBinary(existingFile, uint8Array);
                    } else {
                        await this.app.vault.createBinary(filepath, uint8Array);
                    }
                    savedFiles.push(filename);
                } catch (error) {
                    console.error(`Failed to save audio ${filename}:`, error);
                }
            }
        }

        return savedFiles;
    }

    /**
     * Save the markdown file
     */
    private async saveMarkdown(content: string, filename: string): Promise<void> {
        const filepath = `${this.settings.notesFolder}/${filename}`;
        await this.app.vault.create(filepath, content);
    }

    /**
     * Check if a note file already exists
     */
    async noteExists(bookName: string): Promise<boolean> {
        const filepath = `${this.settings.notesFolder}/${bookName}.md`;
        return this.app.vault.getAbstractFileByPath(filepath) instanceof TFile;
    }
}
