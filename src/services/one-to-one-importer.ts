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
     * @param book - The book data to import
     * @param relativePath - Relative path from source folder (e.g., "subfolder/file.note" or "file.note")
     */
    async importNote(book: BookResult, relativePath?: string): Promise<ImportResult> {
        try {
            // Determine the target folder structure based on relative path
            // e.g., "subfolder/file.note" -> "subfolder"
            // e.g., "file.note" -> "" (root of notes folder)
            const relativeDir = relativePath
                ? relativePath.substring(0, relativePath.lastIndexOf('/') + 1).replace(/\.note$|\.zip$/, '')
                : '';

            // Create the target folder structure
            const targetFolder = relativeDir
                ? `${this.settings.notesFolder}/${relativeDir}`.replace(/\/$/, '')
                : this.settings.notesFolder;

            await ensureFolder(this.app, targetFolder);

            // Get Obsidian's configured attachment folder path
            // The attachment folder is relative to vault root
            const attachmentConfig = (this.app.vault as any).config?.attachmentFolderPath;
            const attachmentFolder = attachmentConfig || this.settings.notesFolder;

            // Save all attachments and get their filenames with relative paths
            const attachments = await this.saveAttachments(book, attachmentFolder, relativeDir);

            // Build the single markdown content with proper relative attachment paths
            const markdown = this.buildSingleMarkdown(book, attachments);

            // Save the markdown file
            const filename = `${book.bookName}.md`;
            // targetFolder already includes relativeDir structure, pass just filename
            await this.saveMarkdown(markdown, filename, targetFolder);

            // Build the full path for the return value (for display/logging)
            const fullPath = `${targetFolder}/${filename}`.replace(/\/\//g, '/');

            return {
                success: true,
                filename: fullPath,
                pagesImported: book.pages.length,
                attachments: attachments.map(a => a.filename)
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
    private buildSingleMarkdown(
        book: BookResult,
        attachments: Array<{ filename: string; relativePath: string }>
    ): string {
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
            const pageImage = attachments.find(a => a.filename.includes(`_page_${page.pageNum}.`));
            if (pageImage) {
                // Use angle brackets for paths with spaces (Obsidian-compatible)
                lines.push(`![Page ${page.pageNum}](<${pageImage.relativePath}>)`);
                lines.push('');
            }

            // Audio link if present
            if (page.audio) {
                const audioBaseName = page.audio.originalName.split('.')[0];
                const audioFile = attachments.find(a => a.filename.includes(audioBaseName));
                if (audioFile) {
                    lines.push(`🎵 [[${audioFile.relativePath}]]`);
                    lines.push('');
                }
            }

            lines.push('---');
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Save all attachments to Obsidian's attachment folder
     * @param book - The book data
     * @param attachmentFolder - Obsidian's configured attachment folder
     * @param relativeDir - Relative directory for unique naming (e.g., "folder1/" or "")
     */
    private async saveAttachments(
        book: BookResult,
        attachmentFolder: string,
        relativeDir: string
    ): Promise<Array<{ filename: string; relativePath: string }>> {
        const savedFiles: Array<{ filename: string; relativePath: string }> = [];

        // Sanitize relative directory for filename:
        // 1. Remove leading/trailing slashes first
        // 2. Replace remaining slashes with underscores
        // 3. Remove any resulting duplicate underscores
        let dirPrefix = relativeDir.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
        dirPrefix = dirPrefix.replace(/\/+/g, '_'); // Replace internal slashes with single underscore
        dirPrefix = dirPrefix.replace(/_+/g, '_'); // Collapse multiple underscores to single
        dirPrefix = dirPrefix.replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores again

        // Build name prefix: viwoods_[optional_folder_structure]_[notebook_name]
        // If no folder structure, just: viwoods_[notebook_name]
        const namePrefix = dirPrefix ? `viwoods_${dirPrefix}_${book.bookName}` : `viwoods_${book.bookName}`;

        console.log('Attachment naming:', { relativeDir, dirPrefix, namePrefix });

        // Save images
        for (const page of book.pages) {
            const ext = this.settings.outputFormat === 'svg' ? 'svg' : 'png';
            const filename = `${namePrefix}_page_${page.pageNum}.${ext}`;
            const filepath = `${attachmentFolder}/${filename}`;

            try {
                // Create folder if it doesn't exist
                await ensureFolder(this.app, attachmentFolder);

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
                savedFiles.push({ filename, relativePath: this.calculateRelativePath(filename) });
            } catch (error) {
                console.error(`Failed to save attachment ${filename}:`, error);
            }
        }

        // Save audio files
        for (const page of book.pages) {
            if (page.audio) {
                const filename = `${namePrefix}_${page.audio.originalName}`;
                const filepath = `${attachmentFolder}/${filename}`;

                try {
                    const buffer = await page.audio.blob.arrayBuffer();
                    const uint8Array = new Uint8Array(buffer);

                    const existingFile = this.app.vault.getAbstractFileByPath(filepath);
                    if (existingFile instanceof TFile) {
                        await this.app.vault.modifyBinary(existingFile, uint8Array);
                    } else {
                        await this.app.vault.createBinary(filepath, uint8Array);
                    }
                    savedFiles.push({ filename, relativePath: this.calculateRelativePath(filename) });
                } catch (error) {
                    console.error(`Failed to save audio ${filename}:`, error);
                }
            }
        }

        return savedFiles;
    }

    /**
     * Calculate the relative path from a markdown file location to an attachment
     * Obsidian will handle this, but we return just the attachment filename for the link
     */
    private calculateRelativePath(filename: string): string {
        // Obsidian automatically resolves attachment paths from configured folder
        // We return just the filename, Obsidian will handle the path resolution
        return filename;
    }

    /**
     * Save the markdown file
     * @param content - Markdown content
     * @param filename - Just the filename (e.g., "subfolder/file.md" or "file.md")
     * @param targetFolder - Target folder path (e.g., "Viwoods Notes/subfolder" or "Viwoods Notes")
     */
    private async saveMarkdown(content: string, filename: string, targetFolder: string): Promise<void> {
        const filepath = `${targetFolder}/${filename}`.replace(/\/\//g, '/');
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
