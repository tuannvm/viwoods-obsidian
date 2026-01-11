// utils/platform.ts - Platform detection utilities for Viwoods Notes Importer

/**
 * Get the current platform type
 * @returns 'desktop' for Electron-based Obsidian, 'mobile' for Capacitor-based
 */
export function getPlatform(): 'desktop' | 'mobile' {
    const userAgent = navigator.userAgent;
    // Obsidian Desktop uses Electron
    if (userAgent.includes('Electron')) {
        return 'desktop';
    }
    // Obsidian Mobile uses Capacitor
    return 'mobile';
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

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const path = require('path');
        return { fs, path };
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
