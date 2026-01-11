// utils/external-file-access.ts - Platform-agnostic external file access for Viwoods Auto-Sync

import { Notice } from 'obsidian';
import { isDesktop, isMobile, hasNodeJs, getNodeModules } from './platform.js';

/**
 * File information from external source
 */
export interface ExternalFileInfo {
    fileName: string;
    filePath: string;
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

        try {
            const files: ExternalFileInfo[] = [];
            const entries = this.fs!.readdirSync(folderPath, { withFileTypes: true });

            for (const entry of entries) {
                // Skip directories and hidden files
                if (entry.isDirectory() || entry.name.startsWith('.')) {
                    continue;
                }

                // Only process .note and .zip files
                if (!entry.name.endsWith('.note') && !entry.name.endsWith('.zip')) {
                    continue;
                }

                const fullPath = this.path!.join(folderPath, entry.name);
                try {
                    const stats = this.fs!.statSync(fullPath);
                    files.push({
                        fileName: entry.name,
                        filePath: fullPath,
                        lastModified: stats.mtimeMs,
                        fileSize: stats.size
                    });
                } catch (statError) {
                    console.warn(`Could not stat file ${fullPath}:`, statError);
                }
            }

            return files;
        } catch (error) {
            console.error('Error scanning directory:', error);
            throw new Error(`Failed to scan directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async readFileAsBlob(filePath: string): Promise<Blob> {
        this.ensureInitialized();

        try {
            const buffer = this.fs!.readFileSync(filePath);
            return new Blob([buffer]);
        } catch (error) {
            console.error('Error reading file:', error);
            throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async validatePath(folderPath: string): Promise<boolean> {
        this.ensureInitialized();

        try {
            const stats = this.fs!.statSync(folderPath);
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
    private folderPath: string = '';

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
                console.error('Error requesting directory access:', error);
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
                        lastModified: file.lastModified,
                        fileSize: file.size
                    });
                } catch (fileError) {
                    console.warn(`Could not get file ${entry.name}:`, fileError);
                }
            }

            return files;
        } catch (error) {
            console.error('Error scanning mobile directory:', error);
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
            console.error('Error reading file:', error);
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
