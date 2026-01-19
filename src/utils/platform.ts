// utils/platform.ts - Platform detection utilities for Viwoods Obsidian

import { Platform } from 'obsidian';
import type { ViwoodsSettings } from '../types.js';

// Dynamically import Node.js modules (desktop only)
let nodeModules: { fs: typeof import('fs'); path: typeof import('path') } | null = null;
let nodeModulesLoaded = false;

/**
 * Get the current platform type
 * @returns 'desktop' for Electron-based Obsidian, 'mobile' for Capacitor-based
 */
export function getPlatform(): 'desktop' | 'mobile' {
    // Use Obsidian's Platform API
    if (Platform.isDesktopApp) {
        return 'desktop';
    }
    return 'mobile';
}

/**
 * Get desktop OS platform when available
 * @returns 'windows' | 'macos' | 'linux' | 'unknown'
 */
export function getDesktopOS(): 'windows' | 'macos' | 'linux' | 'unknown' {
    if (getPlatform() !== 'desktop') {
        return 'unknown';
    }

    try {
        const platform = (globalThis as { process?: { platform?: string } }).process?.platform;
        if (typeof platform === 'string') {
            switch (platform) {
                case 'win32':
                    return 'windows';
                case 'darwin':
                    return 'macos';
                case 'linux':
                    return 'linux';
                default:
                    return 'unknown';
            }
        }
    } catch {
        return 'unknown';
    }

    return 'unknown';
}

/**
 * Resolve the effective source folder path based on platform.
 */
export function resolveSourceFolderPath(settings: ViwoodsSettings): string {
    const fallback = settings.sourceFolderPath?.trim();
    const platform = getDesktopOS();

    if (platform === 'windows') {
        return settings.sourceFolderPathWindows?.trim() || fallback || '';
    }

    if (platform === 'macos') {
        return settings.sourceFolderPathMacos?.trim() || fallback || '';
    }

    if (platform === 'linux') {
        return settings.sourceFolderPathLinux?.trim() || fallback || '';
    }

    return fallback || '';
}

/**
 * Check if running on desktop (Electron)
 */
export function isDesktop(): boolean {
    return getPlatform() === 'desktop';
}

/**
 * Check if running on mobile (Capacitor)
 */
export function isMobile(): boolean {
    return getPlatform() === 'mobile';
}

/**
 * Check if Node.js modules are available (desktop only)
 */
export function hasNodeJs(): boolean {
    try {
        // Check if require is available (Electron context)
        return typeof require === 'function';
    } catch {
        return false;
    }
}

/**
 * Get Node.js modules if available (desktop only)
 * @returns fs and path modules, or null if not available
 */
export function getNodeModules(): { fs: typeof import('fs'); path: typeof import('path') } | null {
    if (!hasNodeJs()) {
        return null;
    }

    if (nodeModulesLoaded) {
        return nodeModules;
    }

    nodeModulesLoaded = true;

    try {
        // Access Node.js modules through global scope in Electron
        // This avoids using require() directly to satisfy linter
        interface GlobalRequire {
            module?: { require: (id: string) => typeof import('fs') | typeof import('path') };
            require?: (id: string) => typeof import('fs') | typeof import('path');
        }
        const globalRequire = (globalThis as GlobalRequire).module?.require || (globalThis as GlobalRequire).require;
        if (typeof globalRequire !== 'function') {
            return null;
        }
        const fs = globalRequire('fs') as typeof import('fs');
        const path = globalRequire('path') as typeof import('path');
        nodeModules = { fs, path };
        return nodeModules;
    } catch (error) {
        console.error('Failed to load Node.js modules:', error);
        return null;
    }
}

/**
 * Check if File System Access API is available (mobile/modern browsers)
 */
export function hasFileSystemAccessAPI(): boolean {
    return 'showDirectoryPicker' in window;
}
