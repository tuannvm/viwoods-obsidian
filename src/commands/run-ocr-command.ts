// commands/run-ocr-command.ts - Command to run OCR on already imported Viwoods notes

import { App, Notice, TAbstractFile, TFile, TFolder } from 'obsidian';
import type { ViwoodsSettings } from '../types.js';
import { OCRService } from '../services/ocr-service.js';

export interface RunOCRSummary {
    totalNotes: number;
    processedNotes: number;
    totalImages: number;
    processedImages: number;
    errors: string[];
}

export interface RunOCRResult {
    success: boolean;
    textExtracted: boolean;
    error?: string;
}

/**
 * Run OCR on a single note file
 */
async function runOCROnNote(
    app: App,
    settings: ViwoodsSettings,
    file: TFile,
    ocrService: OCRService
): Promise<RunOCRResult> {
    try {
        // Read the note content
        const content = await app.vault.read(file);

        // Check if note has YAML frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
        if (!frontmatterMatch) {
            return { success: true, textExtracted: false, error: 'No YAML frontmatter found' };
        }

        const frontmatter = frontmatterMatch[1];

        // Only process notes with viwoods: true
        const viwoodsMatch = frontmatter.match(/viwoods:\s*true/);
        if (!viwoodsMatch) {
            return { success: true, textExtracted: false, error: 'OCR only works on Viwoods notes (notes with viwoods: true in frontmatter)' };
        }

        // Check if OCR was already run on this note
        if (content.includes('## Extracted Text (OCR)')) {
            return { success: true, textExtracted: false, error: 'OCR already run on this note (delete the "## Extracted Text (OCR)" section to re-run)' };
        }

        // Find the image using transclusion format: ![Page N](<path>)
        const imageTransclusionMatch = content.match(/!\[Page \d+\]\(<([^>]+)>\)/);
        if (!imageTransclusionMatch) {
            return { success: true, textExtracted: false, error: 'No image found in content (expected transclusion format: ![Page N](<path>)' };
        }

        const imagePath = imageTransclusionMatch[1].trim();

        let imageFile = app.metadataCache.getFirstLinkpathDest(imagePath, file.path);

        // The path in transclusion is relative to the note's folder
        const bookFolder = file.parent?.path || '';
        const fullImagePath = bookFolder ? `${bookFolder}/${imagePath}` : imagePath;

        if (!imageFile) {
            // Try to find the image file via candidate paths
            const candidatePaths: string[] = [];

            const directPath = fullImagePath;
            candidatePaths.push(directPath);

            // If not found directly, try the images folder from settings
            const pathParts = imagePath.split('/');
            const fileName = pathParts[pathParts.length - 1]; // Get filename

            candidatePaths.push(`${settings.imagesFolder}/${fileName}`);
            candidatePaths.push(`${settings.imagesFolder}/${imagePath}`);

            // Try Obsidian attachment folder path (vault-relative)
            const attachmentConfig = (app.vault as { config?: { attachmentFolderPath?: string } }).config?.attachmentFolderPath;
            if (attachmentConfig) {
                candidatePaths.push(`${attachmentConfig}/${fileName}`);
                candidatePaths.push(`${attachmentConfig}/${imagePath}`);
            }

            for (const candidatePath of candidatePaths) {
                const abstractFile = app.vault.getAbstractFileByPath(candidatePath);
                if (abstractFile instanceof TFile) {
                    imageFile = abstractFile;
                    break;
                }
            }
        }

        if (!imageFile) {
            return { success: true, textExtracted: false, error: `Image file not found at: ${fullImagePath}` };
        }

        // Read image data as ArrayBuffer
        const imageData = await app.vault.readBinary(imageFile);
        const blob = new Blob([imageData]);

        // Perform OCR
        const result = await ocrService.performOCROnBlob(blob, {
            languages: settings.ocrLanguages,
            confidenceThreshold: settings.ocrConfidenceThreshold
        });

        if (!result.success) {
            const errorMsg = result.errors.length > 0 ? result.errors.join(', ') : 'OCR failed';
            return { success: true, textExtracted: false, error: `OCR failed: ${errorMsg}` };
        }

        if (result.text.trim().length === 0) {
            return { success: true, textExtracted: false, error: 'No text detected in image (confidence may be too low or image has no readable text)' };
        }

        // Insert OCR text into the note - insert after the page heading
        const pageHeadingMatch = content.match(/\n## Page \d+\n/);
        if (!pageHeadingMatch) {
            return { success: true, textExtracted: false, error: 'Could not find page heading to insert OCR text' };
        }

        const insertPosition = pageHeadingMatch.index! + pageHeadingMatch[0]!.length;
        const ocrSection = `\n${result.text}\n\n---\n\n`;

        const newContent = content.slice(0, insertPosition) + ocrSection + content.slice(insertPosition);

        // Write the updated content
        await app.vault.modify(file, newContent);

        return { success: true, textExtracted: true };

    } catch (error) {
        return {
            success: false,
            textExtracted: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Run OCR on all Viwoods notes in a folder
 */
export async function runOCROnAllNotes(
    app: App,
    settings: ViwoodsSettings
): Promise<RunOCRSummary> {
    const summary: RunOCRSummary = {
        totalNotes: 0,
        processedNotes: 0,
        totalImages: 0,
        processedImages: 0,
        errors: []
    };

    // Check if OCR is available
    const ocrService = OCRService.getInstance();
    if (!ocrService.isAvailable()) {
        summary.errors.push('OCR is not available on this platform (macOS only)');
        return summary;
    }

    // Check if OCR is enabled
    if (!settings.enableOcr) {
        summary.errors.push('OCR is disabled in settings');
        return summary;
    }

    // Get all markdown files in the notes folder
    const notesFolder = app.vault.getAbstractFileByPath(settings.notesFolder);
    if (!notesFolder || notesFolder !== app.vault.getAbstractFileByPath(settings.notesFolder)) {
        summary.errors.push(`Notes folder not found: ${settings.notesFolder}`);
        return summary;
    }

    const markdownFiles: TFile[] = [];
    const findAllMarkdownFiles = (folder: TAbstractFile) => {
        if (folder instanceof TFile && folder.extension === 'md') {
            markdownFiles.push(folder);
        } else if (folder instanceof TFolder) {
            for (const child of folder.children) {
                findAllMarkdownFiles(child);
            }
        }
    };

    findAllMarkdownFiles(notesFolder);
    const allMarkdownFiles = markdownFiles;
    summary.totalNotes = allMarkdownFiles.length;
    new Notice(`Found ${summary.totalNotes} notes. Running OCR...`);

    // Process each note
    for (const file of allMarkdownFiles) {
        const result = await runOCROnNote(app, settings, file, ocrService);

        summary.totalImages++;
        if (result.textExtracted) {
            summary.processedNotes++;
            summary.processedImages++;
        }

        if (result.error) {
            summary.errors.push(`${file.name}: ${result.error}`);
        }
    }

    const message = `OCR completed: ${summary.processedNotes}/${summary.totalNotes} notes processed`;
    new Notice(message);
    if (summary.errors.length > 0) {
        console.log('OCR errors:', summary.errors);
    }

    return summary;
}

/**
 * Run OCR on the currently active note
 */
export async function runOCROnCurrentNote(
    app: App,
    settings: ViwoodsSettings
): Promise<RunOCRResult> {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile || activeFile.extension !== 'md') {
        return { success: false, textExtracted: false, error: 'No active markdown note' };
    }

    const ocrService = OCRService.getInstance();
    if (!ocrService.isAvailable()) {
        return { success: false, textExtracted: false, error: 'OCR is not available on this platform (macOS only)' };
    }

    if (!settings.enableOcr) {
        return { success: false, textExtracted: false, error: 'OCR is disabled in settings' };
    }

    return runOCROnNote(app, settings, activeFile, ocrService);
}

