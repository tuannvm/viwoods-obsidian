// commands/export-pdf-command.ts - Export current page to PDF command

import { App, MarkdownView, Notice, TFile } from 'obsidian';
import type { ViwoodsSettings, PenMappings } from '../types.js';
import { exportSvgToPdf } from '../utils/pdf-generator.js';
import { getPenStyle, smoothStrokeData } from '../utils/svg-generator.js';

export async function exportCurrentPageToPDF(
    app: App,
    settings: ViwoodsSettings,
    penMappings: PenMappings,
    view: MarkdownView
): Promise<void> {
    if (!settings.enablePdfExport) {
        new Notice('PDF export is disabled in settings');
        return;
    }
    const file = view.file;
    if (!file) return;
    const cache = app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    if (!frontmatter || !frontmatter.has_strokes) {
        new Notice('This page has no stroke data');
        return;
    }
    const bookName = frontmatter.book;
    const pageNum = frontmatter.page;
    if (!bookName || !pageNum) {
        new Notice('Could not determine page information');
        return;
    }
    const strokeFileName = `${bookName}_page_${String(pageNum).padStart(3, '0')}_strokes.json`;
    const strokePath = `${file.parent?.path}/${settings.strokesFolder}/${strokeFileName}`;
    const strokeFile = app.vault.getAbstractFileByPath(strokePath);
    if (!(strokeFile instanceof TFile)) {
        new Notice('Stroke data file not found');
        return;
    }
    try {
        const strokeContent = await app.vault.read(strokeFile);
        const strokeData = JSON.parse(strokeContent);
        void exportSvgToPdf(
            strokeData,
            settings.defaultSmoothness,
            settings.backgroundColor,
            (penId: number) => getPenStyle(penId, penMappings),
            smoothStrokeData
        );
        new Notice('PDF exported successfully');
    } catch (error) {
        console.error('Failed to export PDF:', error);
        new Notice('Failed to export PDF');
    }
}
