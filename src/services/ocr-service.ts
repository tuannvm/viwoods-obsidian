// services/ocr-service.ts - Apple Vision Framework OCR integration for Viwoods Obsidian

import { exec } from 'child_process';
import { promisify } from 'util';
import { log } from '../utils/logger.js';
import { getDesktopOS, hasNodeJs } from '../utils/platform.js';
import { OCR_SWIFT_SCRIPT } from './ocr-swift-embed.js';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface OCRResult {
    success: boolean;
    text: string;
    confidence: number;
    errors: string[];
    processingTimeMs?: number;
}

export interface OCRServiceOptions {
    languages?: string[];
    confidenceThreshold?: number;
    timeout?: number; // milliseconds
}

// ============================================================================
// OCR Service
// ============================================================================

export class OCRService {
    private static instance: OCRService | null = null;
    private readonly scriptName = 'ocr.swift';
    private scriptPath: string | null = null;
    private scriptInitialized = false;
    private readonly isMacOS: boolean;
    private readonly hasNode: boolean;

    private constructor() {
        this.isMacOS = getDesktopOS() === 'macos';
        this.hasNode = hasNodeJs();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): OCRService {
        if (!OCRService.instance) {
            OCRService.instance = new OCRService();
        }
        return OCRService.instance;
    }

    /**
     * Initialize the embedded Swift script by writing it to a temp file
     */
    private async initializeScript(): Promise<boolean> {
        if (this.scriptInitialized) {
            return this.scriptPath !== null;
        }

        if (!this.hasNode) {
            return false;
        }

        try {
            const { writeFile, mkdtemp, chmod } = require('fs').promises;
            const { join } = require('path');
            const { tmpdir } = require('os');

            // Create a temp directory for the OCR script
            const tempDir = await mkdtemp(join(tmpdir(), 'viwoods-ocr-'));
            this.scriptPath = join(tempDir, this.scriptName);

            // Write the embedded Swift script to the temp file
            await writeFile(this.scriptPath, OCR_SWIFT_SCRIPT);

            // Set executable permission (mode in writeFile may not work due to umask)
            await chmod(this.scriptPath, 0o755);

            log.info('OCR script initialized at:', this.scriptPath);
            this.scriptInitialized = true;
            return true;

        } catch (error) {
            log.error('Failed to initialize OCR script:', error);
            this.scriptInitialized = true; // Don't retry
            return false;
        }
    }

    /**
     * Check if OCR is available on this platform
     */
    public isAvailable(): boolean {
        return this.isMacOS && this.hasNode;
    }

    /**
     * Get the reason why OCR is not available
     */
    public getAvailabilityMessage(): string {
        if (!this.isMacOS) {
            return `OCR is only available on macOS. Current platform: ${getDesktopOS()}`;
        }
        if (!this.hasNode) {
            return 'OCR requires Node.js access (desktop only)';
        }
        return 'OCR is available';
    }

    /**
     * Perform OCR on an image file
     * @param imagePath - Absolute path to the image file
     * @param options - OCR options
     * @returns OCR result with text and confidence
     */
    public async performOCR(imagePath: string, options: OCRServiceOptions = {}): Promise<OCRResult> {
        const {
            languages = ['en-US'],
            confidenceThreshold = 0.5,
            timeout = 30000 // 30 seconds default
        } = options;

        // Check availability
        if (!this.isAvailable()) {
            log.warn('OCR not available:', this.getAvailabilityMessage());
            return {
                success: false,
                text: '',
                confidence: 0,
                errors: [this.getAvailabilityMessage()]
            };
        }

        // Initialize script if needed
        if (!this.scriptInitialized || !this.scriptPath) {
            const initialized = await this.initializeScript();
            if (!initialized || !this.scriptPath) {
                return {
                    success: false,
                    text: '',
                    confidence: 0,
                    errors: ['Failed to initialize OCR script']
                };
            }
        }

        // Build command - use swift directly to run the script
        const languagesStr = languages.join(',');
        const command = `swift "${this.scriptPath}" "${imagePath}" "${languagesStr}" ${confidenceThreshold}`;

        log.debug('Running OCR command:', command);

        try {
            const { stdout, stderr } = await execAsync(command, {
                timeout,
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large OCR results
            });

            if (stderr && !stderr.includes('warning:')) {
                log.warn('OCR stderr:', stderr);
            }

            // Parse JSON output
            const result = JSON.parse(stdout) as OCRResult;

            log.debug('OCR result:', {
                success: result.success,
                textLength: result.text.length,
                confidence: result.confidence,
                processingTime: result.processingTimeMs
            });

            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Check for timeout
            if (errorMessage.includes('timed out')) {
                log.error('OCR timeout after', timeout, 'ms');
                return {
                    success: false,
                    text: '',
                    confidence: 0,
                    errors: [`OCR timed out after ${timeout}ms`]
                };
            }

            // Check for swift not found
            if (errorMessage.includes('not found') || errorMessage.includes('ENOENT')) {
                log.error('Swift not found');
                return {
                    success: false,
                    text: '',
                    confidence: 0,
                    errors: ['Swift is not installed. Install with: xcode-select --install']
                };
            }

            log.error('OCR failed:', errorMessage);
            return {
                success: false,
                text: '',
                confidence: 0,
                errors: [errorMessage]
            };
        }
    }

    /**
     * Perform OCR on a blob (saves to temp file first)
     * @param blob - Image blob
     * @param options - OCR options
     * @returns OCR result with text and confidence
     */
    public async performOCROnBlob(blob: Blob, options: OCRServiceOptions = {}): Promise<OCRResult> {
        if (!this.hasNode) {
            return {
                success: false,
                text: '',
                confidence: 0,
                errors: ['OCR requires Node.js file system access']
            };
        }

        // Create temp file
        const { createWriteStream } = require('fs');
        const { unlink } = require('fs').promises;
        const { tmpdir } = require('os');
        const { join } = require('path');

        const tempPath = join(tmpdir(), `viwoods-ocr-${Date.now()}.png`);

        try {
            // Write blob to temp file
            const buffer = Buffer.from(await blob.arrayBuffer());
            await new Promise<void>((resolve, reject) => {
                const stream = createWriteStream(tempPath);
                stream.write(buffer);
                stream.end();
                stream.on('finish', resolve);
                stream.on('error', reject);
            });

            // Perform OCR
            const result = await this.performOCR(tempPath, options);

            // Clean up temp file
            await unlink(tempPath).catch((err: unknown) => log.warn('Failed to delete temp file:', err));

            return result;

        } catch (error) {
            // Clean up temp file on error
            await unlink(tempPath).catch(() => {});

            return {
                success: false,
                text: '',
                confidence: 0,
                errors: [error instanceof Error ? error.message : String(error)]
            };
        }
    }

    /**
     * Check if the OCR script is ready
     */
    public async isScriptReady(): Promise<boolean> {
        if (!this.isAvailable()) {
            return false;
        }

        if (!this.scriptInitialized) {
            await this.initializeScript();
        }

        return this.scriptPath !== null;
    }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Perform OCR on an image file
 */
export async function ocrImage(imagePath: string, options?: OCRServiceOptions): Promise<OCRResult> {
    return OCRService.getInstance().performOCR(imagePath, options);
}

/**
 * Perform OCR on an image blob
 */
export async function ocrBlob(blob: Blob, options?: OCRServiceOptions): Promise<OCRResult> {
    return OCRService.getInstance().performOCROnBlob(blob, options);
}

/**
 * Check if OCR is available
 */
export function isOCRAvailable(): boolean {
    return OCRService.getInstance().isAvailable();
}

/**
 * Get OCR availability message
 */
export function getOCRStatus(): string {
    return OCRService.getInstance().getAvailabilityMessage();
}

/**
 * Check if OCR script is ready
 */
export async function isOCRScriptReady(): Promise<boolean> {
    return OCRService.getInstance().isScriptReady();
}
