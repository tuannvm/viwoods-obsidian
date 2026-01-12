// utils/external-file-access.ts - Platform-agnostic external file access for Viwoods Auto-Sync

import { Notice } from 'obsidian';
import { isDesktop, isMobile, hasNodeJs, getNodeModules } from './platform.js';
import { log } from './logger.js';

/**
 * File information from external source
 */
export interface ExternalFileInfo {
    fileName: string;
    filePath: string;
    relativePath: string;  // Relative path from source folder (e.g., "subfolder/file.note" or "file.note")
    lastModified: number;
    fileSize: number;
}

/**
 * Abstract base for platform-specific file access
 */
interface FileAccessImpl {
    scanDirectory(folderPath: string): Promise<ExternalFileInfo[]>;
    readFileAsBlob(filePath: string): Promise<Blob>;
    validatePath(folderPath?: string): Promise<boolean>;
}

/**
 * Desktop implementation using Node.js fs module
 */
class DesktopFileAccess implements FileAccessImpl {
    private fs: typeof import('fs') | null = null;
    private path: typeof import('path') | null = null;

    constructor() {
        if (hasNodeJs()) {
            const modules = getNodeModules();
            if (modules) {
                this.fs = modules.fs;
                this.path = modules.path;
            }
        }
    }

    private ensureInitialized(): void {
        if (!this.fs || !this.path) {
            throw new Error('Node.js modules not available. This feature requires Obsidian Desktop.');
        }
    }

    async scanDirectory(folderPath: string): Promise<ExternalFileInfo[]> {
        this.ensureInitialized();

        log.debug('🔍 scanDirectory called with:', folderPath);

        try {
            // Normalize the path - handle trailing slashes, spaces, etc.
            const normalizedPath = this.normalizePath(folderPath);
            log.debug('📁 Normalized path:', normalizedPath);

            // Verify the path exists and is a directory
            try {
                const stats = this.fs!.statSync(normalizedPath);
                log.debug('📊 Path stats:', { isDirectory: stats.isDirectory(), exists: true });
                if (!stats.isDirectory()) {
                    throw new Error(`Path is not a directory: ${normalizedPath}`);
                }
            } catch (pathError) {
                log.error('❌ Path validation failed:', pathError);
                throw new Error(`Cannot access directory: ${normalizedPath}. ${pathError instanceof Error ? pathError.message : 'Unknown error'}`);
            }

            const files: ExternalFileInfo[] = [];
            await this.scanDirectoryRecursive(normalizedPath, normalizedPath, files);
            log.debug(`✅ Found ${files.length} .note files`);
            return files;
        } catch (error) {
            log.error('❌ Error scanning directory:', error);
            throw new Error(`Failed to scan directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Normalize file path for cross-platform compatibility
     */
    private normalizePath(inputPath: string): string {
        log.debug('🔧 Normalizing path:', inputPath);

        // Remove trailing slashes
        let normalized = inputPath.replace(/[/\\]+$/, '');

        // Use path.normalize to handle . and .., and convert separators
        normalized = this.path!.normalize(normalized);

        log.debug('✨ Normalized result:', normalized);
        return normalized;
    }

    /**
     * Test if a path is accessible (for debugging)
     */
    async testPathAccess(testPath: string): Promise<{ accessible: boolean; error?: string; type?: string }> {
        this.ensureInitialized();

        try {
            const normalized = this.normalizePath(testPath);
            const stats = this.fs!.statSync(normalized);
            return {
                accessible: true,
                type: stats.isDirectory() ? 'directory' : 'file'
            };
        } catch (error: any) {
            return {
                accessible: false,
                error: error.message || String(error)
            };
        }
    }

    /**
     * Recursively scan directory for .note files
     */
    private async scanDirectoryRecursive(
        currentPath: string,
        rootPath: string,
        files: ExternalFileInfo[]
    ): Promise<void> {
        let entries: any[];
        try {
            entries = this.fs!.readdirSync(currentPath, { withFileTypes: true });
        } catch (readError) {
            log.warn(`Cannot read directory ${currentPath}, skipping:`, readError);
            return; // Skip this directory if we can't read it
        }

        for (const entry of entries) {
            try {
                // Skip hidden files and system files
                if (entry.name.startsWith('.')) {
                    continue;
                }

                // Use path.join for proper path construction
                const fullPath = this.path!.join(currentPath, entry.name);

                if (entry.isDirectory()) {
                    // Recursively scan subdirectory
                    await this.scanDirectoryRecursive(fullPath, rootPath, files);
                } else if (entry.isFile()) {
                    // Only process .note and .zip files
                    if (!entry.name.endsWith('.note') && !entry.name.endsWith('.zip')) {
                        continue;
                    }

                    try {
                        const stats = this.fs!.statSync(fullPath);
                        // Calculate relative path from root folder
                        const relativePath = this.path!.relative(rootPath, fullPath);

                        files.push({
                            fileName: entry.name,
                            filePath: fullPath,
                            relativePath: relativePath.replace(/\\/g, '/'), // Normalize to forward slashes
                            lastModified: stats.mtimeMs,
                            fileSize: stats.size
                        });
                    } catch (statError) {
                        log.warn(`Could not stat file ${fullPath}:`, statError);
                    }
                }
            } catch (entryError) {
                log.warn(`Error processing entry ${entry.name}:`, entryError);
            }
        }
    }

    async readFileAsBlob(filePath: string): Promise<Blob> {
        this.ensureInitialized();

        try {
            const normalizedPath = this.normalizePath(filePath);
            const buffer = this.fs!.readFileSync(normalizedPath);
            return new Blob([buffer]);
        } catch (error) {
            log.error('Error reading file:', error);
            throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async validatePath(folderPath: string): Promise<boolean> {
        this.ensureInitialized();

        try {
            const normalizedPath = this.normalizePath(folderPath);
            const stats = this.fs!.statSync(normalizedPath);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }
}

/**
 * Mobile implementation using File System Access API
 */
class MobileFileAccess implements FileAccessImpl {
    private directoryHandle: FileSystemDirectoryHandle | null = null;

    async requestDirectoryAccess(): Promise<boolean> {
        if (!('showDirectoryPicker' in window)) {
            new Notice('File System Access API not supported on this device');
            return false;
        }

        try {
            this.directoryHandle = await (window as any).showDirectoryPicker({
                mode: 'read',
                startIn: 'documents'
            });
            return true;
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                log.error('Error requesting directory access:', error);
                new Notice(`Failed to access folder: ${error.message}`);
            }
            return false;
        }
    }

    async scanDirectory(_folderPath: string): Promise<ExternalFileInfo[]> {
        if (!this.directoryHandle) {
            throw new Error('No directory access. Please select a folder first.');
        }

        try {
            const files: ExternalFileInfo[] = [];

            for await (const entry of (this.directoryHandle as any).values()) {
                if (entry.kind !== 'file') {
                    continue;
                }

                if (!entry.name.endsWith('.note') && !entry.name.endsWith('.zip')) {
                    continue;
                }

                try {
                    const file = await entry.getFile();
                    files.push({
                        fileName: entry.name,
                        filePath: entry.name, // Mobile: relative name is enough
                        relativePath: entry.name, // For mobile, same as filename
                        lastModified: file.lastModified,
                        fileSize: file.size
                    });
                } catch (fileError) {
                    log.warn(`Could not get file ${entry.name}:`, fileError);
                }
            }

            return files;
        } catch (error) {
            log.error('Error scanning mobile directory:', error);
            throw new Error(`Failed to scan directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async readFileAsBlob(fileName: string): Promise<Blob> {
        if (!this.directoryHandle) {
            throw new Error('No directory access. Please select a folder first.');
        }

        try {
            const fileHandle = await this.directoryHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            return file;
        } catch (error) {
            log.error('Error reading file:', error);
            throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async validatePath(_folderPath?: string): Promise<boolean> {
        // On mobile, we validate by requesting access
        return await this.requestDirectoryAccess();
    }
}

/**
 * Platform-agnostic external file access
 */
export class ExternalFileAccess {
    private impl: FileAccessImpl;

    constructor() {
        if (isDesktop()) {
            this.impl = new DesktopFileAccess();
        } else {
            this.impl = new MobileFileAccess();
        }
    }

    /**
     * Scan directory for .note and .zip files
     */
    async scanDirectory(folderPath: string): Promise<ExternalFileInfo[]> {
        return await this.impl.scanDirectory(folderPath);
    }

    /**
     * Read a file as Blob
     */
    async readFileAsBlob(filePath: string): Promise<Blob> {
        return await this.impl.readFileAsBlob(filePath);
    }

    /**
     * Validate that a path exists and is accessible
     */
    async validatePath(folderPath: string): Promise<boolean> {
        return await this.impl.validatePath(folderPath);
    }

    /**
     * Check if running on desktop
     */
    static isDesktop(): boolean {
        return isDesktop();
    }

    /**
     * Check if running on mobile
     */
    static isMobile(): boolean {
        return isMobile();
    }

    /**
     * On mobile, request directory access from user
     */
    async requestMobileDirectoryAccess(): Promise<boolean> {
        if (this.impl instanceof MobileFileAccess) {
            return await this.impl.requestDirectoryAccess();
        }
        return false;
    }
}
