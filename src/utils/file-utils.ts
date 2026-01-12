// file-utils.ts - File utility functions for Viwoods Notes Importer Plugin

import { App, TFile, TFolder, normalizePath } from 'obsidian';
import { ImportManifest, PageChange, ImportSummary, ViwoodsSettings, BookResult } from '../types.js';
import { log } from './logger.js';

export async function hashImageData(blob: Blob): Promise<string> {
    try {
        const buffer = await blob.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.substring(0, 32);
    } catch (error) {
        log.error('Error hashing image:', error);
        return `fallback-${blob.size}`.padEnd(32, '0').substring(0, 32);
    }
}

export async function analyzeChanges(
    app: App,
    bookResult: BookResult,
    existingManifest: ImportManifest | null,
    settings: ViwoodsSettings
): Promise<{ changes: PageChange[]; summary: ImportSummary; }> {
    const changes: PageChange[] = [];
    const summary: ImportSummary = { totalPages: bookResult.pages.length, newPages: [], modifiedPages: [], unchangedPages: [], deletedPages: [], errors: [] };
    const bookFolder = `${settings.notesFolder}/${bookResult.bookName}`;

    if (!existingManifest) {
        for (const page of bookResult.pages) {
            changes.push({ pageNum: page.pageNum, type: 'new', newHash: page.image.hash });
            summary.newPages.push(page.pageNum);
        }
        log.debug('No existing manifest - all pages are new');
        return { changes, summary };
    }

    const existingMap = new Map<number, { manifestInfo: any, fileHash?: string }>();
    Object.entries(existingManifest.importedPages).forEach(([pageNum, info]) => {
        existingMap.set(parseInt(pageNum), { manifestInfo: info });
    });

    for (const [pageNum, data] of existingMap.entries()) {
        const pageFileName = `Page ${String(pageNum).padStart(3, '0')}.md`;
        const pagePath = `${bookFolder}/${pageFileName}`;
        const pageFile = app.vault.getAbstractFileByPath(pagePath);
        if (pageFile instanceof TFile) {
            try {
                const content = await app.vault.read(pageFile);
                const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
                const match = content.match(frontmatterRegex);
                if (match) {
                    const frontmatter = match[1];
                    const hashMatch = frontmatter.match(/original_image_hash:\s*"?([a-f0-9]+)"?/);
                    if (hashMatch) {
                        data.fileHash = hashMatch[1];
                        log.debug(`Page ${pageNum}: Found hash in file: ${hashMatch[1].substring(0, 8)}...`);
                    }
                }
            } catch (error) {
                log.error(`Failed to read hash from page ${pageNum}:`, error);
            }
        }
    }

    for (const page of bookResult.pages) {
        const existing = existingMap.get(page.pageNum);
        if (!existing) {
            changes.push({ pageNum: page.pageNum, type: 'new', newHash: page.image.hash });
            summary.newPages.push(page.pageNum);
        } else {
            const existingHash = existing.fileHash || existing.manifestInfo.imageHash;
            const isRecoveredHash = existingHash.startsWith('recovered-');
            const isResetHash = existingHash.startsWith('RESET-');
            const hashesMatch = existingHash === page.image.hash;
            if (isRecoveredHash || isResetHash) {
                log.debug(`Page ${page.pageNum}: Special hash (${isRecoveredHash ? 'recovered' : 'reset'}), treating as modified`);
                changes.push({ pageNum: page.pageNum, type: 'modified', oldHash: existingHash, newHash: page.image.hash, hasAudioChange: !!page.audio !== !!existing.manifestInfo.hasAudio });
                summary.modifiedPages.push(page.pageNum);
            } else if (!hashesMatch) {
                log.debug(`Page ${page.pageNum} modified: ${existingHash.substring(0, 8)}... → ${page.image.hash.substring(0, 8)}...`);
                log.debug(`  Source: ${existing.fileHash ? 'file frontmatter' : 'manifest'}`);
                changes.push({ pageNum: page.pageNum, type: 'modified', oldHash: existingHash, newHash: page.image.hash, hasAudioChange: !!page.audio !== !!existing.manifestInfo.hasAudio });
                summary.modifiedPages.push(page.pageNum);
            } else {
                changes.push({ pageNum: page.pageNum, type: 'unchanged', oldHash: existingHash, newHash: page.image.hash });
                summary.unchangedPages.push(page.pageNum);
            }
            existingMap.delete(page.pageNum);
        }
    }

    existingMap.forEach((data, pageNum) => {
        const hash = data.fileHash || data.manifestInfo.imageHash;
        changes.push({ pageNum, type: 'deleted', oldHash: hash });
        summary.deletedPages.push(pageNum);
    });

    log.debug('Change Analysis Summary:', { total: bookResult.pages.length, new: summary.newPages.length, modified: summary.modifiedPages.length, unchanged: summary.unchangedPages.length, deleted: summary.deletedPages.length });
    return { changes, summary };
}

export async function createManifestBackup(app: App, manifestPath: string, createBackups: boolean): Promise<string | null> {
    if (!createBackups) return null;
    try {
        const manifestFile = app.vault.getAbstractFileByPath(manifestPath);
        if (manifestFile instanceof TFile) {
            const content = await app.vault.read(manifestFile);
            const backupPath = manifestPath.replace('.json', `-backup-${Date.now()}.json`);
            await app.vault.create(backupPath, content);
            return backupPath;
        }
    } catch (error) {
        log.error('Failed to create manifest backup:', error);
    }
    return null;
}

export function addHistoryEntry(manifest: ImportManifest, action: string, pages: number[], summary: string, maxHistoryEntries: number) {
    if (!manifest.history) manifest.history = [];
    manifest.history.unshift({ date: new Date().toISOString(), action: action as any, pages, summary });
    if (manifest.history.length > maxHistoryEntries) {
        manifest.history = manifest.history.slice(0, maxHistoryEntries);
    }
}

export async function recoverManifestFromExistingFiles(
    app: App,
    bookFolder: string,
    bookName: string,
    settings: ViwoodsSettings,
    addHistoryEntryFn: typeof addHistoryEntry,
    saveManifestFn: (app: App, manifestPath: string, manifest: ImportManifest) => Promise<void>
): Promise<ImportManifest | null> {
    log.debug(`Attempting to recover manifest for ${bookName}`);
    const folder = app.vault.getAbstractFileByPath(bookFolder);
    if (!(folder instanceof TFolder)) return null;
    const manifest: ImportManifest = { bookName: bookName, totalPages: 0, importedPages: {}, lastImport: new Date().toISOString(), sourceFile: bookName, version: '1.1', history: [] };
    const pageRegex = /^Page (\d{3})\.md$/;
    let maxPage = 0;
    for (const child of folder.children || []) {
        if (child instanceof TFile) {
            const match = child.name.match(pageRegex);
            if (match) {
                const pageNum = parseInt(match[1]);
                maxPage = Math.max(maxPage, pageNum);
                const content = await app.vault.read(child);
                const hasGemini = content.includes('### Gemini Transcription');
                const hasAudio = content.includes('🎙️ Audio Recording');
                let imageHash = 'recovered-unknown-' + pageNum;
                const imageFileName = `${bookName}_page_${String(pageNum).padStart(3, '0')}.png`;
                const imagePath = `${bookFolder}/${settings.imagesFolder}/${imageFileName}`;
                const imageFile = app.vault.getAbstractFileByPath(imagePath);
                if (imageFile instanceof TFile) {
                    imageHash = `recovered-${imageFile.stat.size}-${imageFile.stat.mtime}`;
                    log.debug(`Using recovered placeholder hash for page ${pageNum}: ${imageHash}`);
                }
                manifest.importedPages[pageNum] = { fileName: child.name, importDate: new Date(child.stat.mtime).toISOString(), imageHash: imageHash, geminiProcessed: hasGemini, hasAudio: hasAudio, lastModified: new Date(child.stat.mtime).toISOString(), size: child.stat.size };
            }
        }
    }
    manifest.totalPages = maxPage;
    if (Object.keys(manifest.importedPages).length > 0) {
        log.debug(`Recovered manifest with ${Object.keys(manifest.importedPages).length} pages`);
        addHistoryEntryFn(manifest, 'import', Object.keys(manifest.importedPages).map(Number), 'Manifest recovered from existing files', settings.maxHistoryEntries);
        const manifestPath = `${bookFolder}/.import-manifest.json`;
        try {
            await saveManifestFn(app, manifestPath, manifest);
        } catch (error) {
            log.error('Failed to save recovered manifest:', error);
        }
        return manifest;
    }
    return null;
}

export async function loadManifest(app: App, manifestPath: string): Promise<ImportManifest | null> {
    log.debug(`Attempting to load manifest from: ${manifestPath}`);
    const manifestFile = app.vault.getAbstractFileByPath(manifestPath);
    if (manifestFile instanceof TFile) {
        const content = await app.vault.read(manifestFile);
        const manifest = JSON.parse(content);
        log.debug(`Loaded manifest with ${Object.keys(manifest.importedPages).length} pages`);
        return manifest;
    }
    log.debug('No manifest file found');
    return null;
}

export async function saveManifest(app: App, manifestPath: string, manifest: ImportManifest, ensureFolderFn: (app: App, path: string) => Promise<void>) {
    log.debug(`Saving manifest to: ${manifestPath}`);
    log.debug(`Manifest contains ${Object.keys(manifest.importedPages).length} pages`);
    const manifestFile = app.vault.getAbstractFileByPath(manifestPath);
    const content = JSON.stringify(manifest, null, 2);
    try {
        if (manifestFile instanceof TFile) {
            await app.vault.modify(manifestFile, content);
            log.debug('Manifest updated successfully');
        } else {
            await app.vault.create(manifestPath, content);
            log.debug('Manifest created successfully');
        }
    } catch (error) {
        log.error('Failed to save manifest:', error);
        try {
            const folder = manifestPath.substring(0, manifestPath.lastIndexOf('/'));
            await ensureFolderFn(app, folder);
            await app.vault.adapter.write(manifestPath, content);
            log.debug('Manifest saved using adapter');
        } catch (fallbackError) {
            log.error('Failed to save manifest using fallback:', fallbackError);
        }
    }
}

export function formatDate(timestamp: number, dateFormat: ViwoodsSettings['dateFormat']): string {
    const date = new Date(timestamp);
    switch (dateFormat) {
        case 'iso': return date.toISOString().split('T')[0];
        case 'us': return date.toLocaleDateString('en-US');
        case 'eu': return date.toLocaleDateString('en-GB');
        default: return date.toISOString();
    }
}

export async function ensureFolder(app: App, path: string) {
    const folders = path.split('/');
    let currentPath = '';
    for (const folder of folders) {
        currentPath = currentPath ? `${currentPath}/${folder}` : folder;
        const normalizedPath = normalizePath(currentPath);
        const folderExists = app.vault.getAbstractFileByPath(normalizedPath);
        if (!folderExists) {
            try {
                await app.vault.createFolder(normalizedPath);
            } catch (error: any) {
                // If it's a "Folder already exists" error, that's fine - continue
                if (error.message && error.message.toLowerCase().includes('already exists')) {
                    continue;
                }

                // For any other error, check if the folder exists now
                const checkAgain = app.vault.getAbstractFileByPath(normalizedPath);
                if (!checkAgain) {
                    // Only log and throw if folder truly doesn't exist
                    log.error(`Failed to create folder ${normalizedPath}:`, error);
                    throw error;
                }
                // If folder exists, continue without error
            }
        }
    }
}
