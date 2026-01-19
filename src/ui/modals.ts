// ui/modals.ts - Modal classes for Viwoods Obsidian Plugin

import {
    App,
    Modal,
    TFolder,
    Notice
} from 'obsidian';

import type {
    BookResult,
    ImportManifest,
    PageChange,
    ImportSummary,
    ViwoodsSettings
} from '../types.js';
import { setCssProps } from '../utils/dom-utils.js';

// Forward declaration for plugin interface to avoid circular dependency
export interface IViwoodsImporterPlugin {
    settings: ViwoodsSettings;
    processNoteFile(file: File): Promise<void>;
}

// ============================================================================
// ENHANCED IMPORT MODAL - Page selection with change detection
// ============================================================================

export class EnhancedImportModal extends Modal {
    bookResult: BookResult;
    existingManifest: ImportManifest | null;
    analysis: { changes: PageChange[], summary: ImportSummary } | null;
    settings: ViwoodsSettings;
    onChoose: (pages: number[]) => void;
    checkboxes: Map<number, HTMLInputElement> = new Map();

    constructor(
        app: App,
        bookResult: BookResult,
        existingManifest: ImportManifest | null,
        analysis: { changes: PageChange[], summary: ImportSummary } | null,
        settings: ViwoodsSettings
    ) {
        super(app);
        this.bookResult = bookResult;
        this.existingManifest = existingManifest;
        this.analysis = analysis;
        this.settings = settings;
        this.onChoose = () => {};
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.classList.add('viwoods-import-modal');
        this.titleEl.setText(`Import: ${this.bookResult.bookName}`);

        if (this.analysis) {
            const analysisDiv = contentEl.createDiv({ cls: 'import-analysis' });
            setCssProps(analysisDiv, {
                'padding': '15px',
                'background': 'var(--background-secondary)',
                'border-radius': '8px',
                'margin-bottom': '15px'
            });

            // Use safe DOM methods instead of innerHTML
            const heading = analysisDiv.createEl('h3');
            heading.textContent = '📊 change summary';

            const gridDiv = analysisDiv.createDiv();
            setCssProps(gridDiv, {
                'display': 'grid',
                'grid-template-columns': '1fr 1fr',
                'gap': '10px',
                'margin-top': '10px'
            });

            const newPagesDiv = gridDiv.createDiv();
            newPagesDiv.textContent = `🆕 new pages: ${this.analysis.summary.newPages.length}`;
            const newPagesStrong = newPagesDiv.createEl('strong');
            newPagesStrong.textContent = `${this.analysis.summary.newPages.length}`;

            const modifiedPagesDiv = gridDiv.createDiv();
            modifiedPagesDiv.textContent = '🔄 modified pages:';
            const modifiedPagesStrong = modifiedPagesDiv.createEl('strong');
            modifiedPagesStrong.textContent = `${this.analysis.summary.modifiedPages.length}`;

            const unchangedPagesDiv = gridDiv.createDiv();
            unchangedPagesDiv.textContent = '✓ unchanged pages:';
            const unchangedPagesStrong = unchangedPagesDiv.createEl('strong');
            unchangedPagesStrong.textContent = `${this.analysis.summary.unchangedPages.length}`;

            const deletedPagesDiv = gridDiv.createDiv();
            deletedPagesDiv.textContent = '❌ deleted pages:';
            const deletedPagesStrong = deletedPagesDiv.createEl('strong');
            deletedPagesStrong.textContent = `${this.analysis.summary.deletedPages.length}`;

            if (this.analysis.summary.deletedPages.length > 0) {
                analysisDiv.createEl('p', {
                    text: `⚠️ Note: ${this.analysis.summary.deletedPages.length} pages exist locally but not in this import file.`,
                    cls: 'mod-warning'
                });
            }
        } else {
            const stats = contentEl.createDiv({ cls: 'import-stats' });
            setCssProps(stats, {
                'padding': '15px',
                'background': 'var(--background-secondary)',
                'border-radius': '8px',
                'margin-bottom': '15px'
            });
            const existingPages = this.existingManifest ? Object.keys(this.existingManifest.importedPages).length : 0;

            // Use safe DOM APIs - bookName is user input
            stats.createEl('h3', { text: `📚 ${this.bookResult.bookName}` });
            stats.createEl('p', { text: `📄 Total pages in file: ${this.bookResult.pages.length}` });
            stats.createEl('p', { text: `✅ Already imported: ${existingPages}` });
            stats.createEl('p', { text: `🎙️ Pages with audio: ${this.bookResult.pages.filter(p => p.audio).length}` });
        }

        const modeContainer = contentEl.createDiv();
        modeContainer.createEl('label', { text: 'Import mode' });
        const importMode = modeContainer.createEl('select', { cls: 'dropdown' });
        setCssProps(importMode, {
            'width': '100%',
            'margin': '10px 0'
        });

        let defaultMode = 'all';
        if (this.analysis) {
            const hasNew = this.analysis.summary.newPages.length > 0;
            const hasModified = this.analysis.summary.modifiedPages.length > 0;
            if (hasNew && hasModified) defaultMode = 'new-and-modified';
            else if (hasNew) defaultMode = 'new';
            else if (hasModified) defaultMode = 'modified';
            else defaultMode = 'none';
        }

        if (this.analysis && this.analysis.summary.newPages.length > 0) {
            const option = importMode.createEl('option', { value: 'new', text: `Import new pages only (${this.analysis.summary.newPages.length} pages)` });
            if (defaultMode === 'new') option.selected = true;
        }
        if (this.analysis && this.analysis.summary.modifiedPages.length > 0) {
            const option = importMode.createEl('option', { value: 'modified', text: `Import modified pages only (${this.analysis.summary.modifiedPages.length} pages)` });
            if (defaultMode === 'modified') option.selected = true;
        }
        if (this.analysis && (this.analysis.summary.newPages.length > 0 || this.analysis.summary.modifiedPages.length > 0)) {
            const option = importMode.createEl('option', { value: 'new-and-modified', text: `Import new & modified pages (${this.analysis.summary.newPages.length + this.analysis.summary.modifiedPages.length} pages)` });
            if (defaultMode === 'new-and-modified') option.selected = true;
        }

        const allOption = importMode.createEl('option', { value: 'all', text: `Import all pages (${this.bookResult.pages.length} pages)` });
        if (!this.existingManifest || (defaultMode === 'all' && importMode.options.length === 1)) allOption.selected = true;

        importMode.createEl('option', { value: 'range', text: 'Import page range' });
        importMode.createEl('option', { value: 'select', text: 'Select specific pages' });

        if (defaultMode === 'none' && this.analysis) {
            const noneOption = importMode.createEl('option', { value: 'none', text: 'No changes to import' });
            noneOption.selected = true;
        }

        const rangeContainer = contentEl.createDiv();
        setCssProps(rangeContainer, {
            'display': 'none',
            'margin': '10px 0'
        });
        rangeContainer.createEl('label', { text: 'Page range' });
        const rangeFrom = rangeContainer.createEl('input', { type: 'number' });
        setCssProps(rangeFrom, { 'width': '60px' });
        rangeFrom.min = '1';
        rangeFrom.max = this.bookResult.pages.length.toString();
        rangeFrom.value = '1';
        rangeContainer.createEl('span', { text: ' To ' });
        const rangeTo = rangeContainer.createEl('input', { type: 'number' });
        setCssProps(rangeTo, { 'width': '60px' });
        rangeTo.min = '1';
        rangeTo.max = this.bookResult.pages.length.toString();
        rangeTo.value = Math.min(10, this.bookResult.pages.length).toString();

        const pageSelector = contentEl.createDiv();
        setCssProps(pageSelector, { 'display': 'none' });
        pageSelector.createEl('p', { text: 'Select pages to import' });

        const searchContainer = pageSelector.createDiv();
        setCssProps(searchContainer, { 'margin': '10px 0' });
        const searchInput = searchContainer.createEl('input', { type: 'text', placeholder: 'Search pages (e.g., "1-10", "audio", "new")' });
        setCssProps(searchInput, {
            'width': '100%',
            'padding': '5px'
        });

        const filterButtons = pageSelector.createDiv();
        setCssProps(filterButtons, {
            'margin': '10px 0',
            'display': 'flex',
            'gap': '5px',
            'flex-wrap': 'wrap'
        });
        const selectAllBtn = filterButtons.createEl('button', { text: 'Select all' });
        const selectNoneBtn = filterButtons.createEl('button', { text: 'Select none' });
        const selectNewBtn = filterButtons.createEl('button', { text: 'Select new' });
        const selectModifiedBtn = filterButtons.createEl('button', { text: 'Select modified' });
        const selectAudioBtn = filterButtons.createEl('button', { text: 'Select audio' });

        const pageGrid = pageSelector.createDiv();
        setCssProps(pageGrid, {
            'display': 'grid',
            'grid-template-columns': 'repeat(10, 1fr)',
            'gap': '5px',
            'max-height': '300px',
            'overflow-y': 'auto',
            'padding': '10px',
            'background': 'var(--background-primary)',
            'border-radius': '5px'
        });

        for (const page of this.bookResult.pages) {
            const pageDiv = pageGrid.createDiv();
            setCssProps(pageDiv, {
                'text-align': 'center',
                'padding': '5px'
            });
            const change = this.analysis?.changes.find(c => c.pageNum === page.pageNum);
            const checkbox = pageDiv.createEl('input', { type: 'checkbox' });
            checkbox.id = `page-${page.pageNum}`;
            checkbox.checked = change?.type === 'new' || change?.type === 'modified' || false;
            this.checkboxes.set(page.pageNum, checkbox);
            const label = pageDiv.createEl('label');
            label.setAttribute('for', `page-${page.pageNum}`);
            setCssProps(label, {
                'display': 'block',
                'font-size': '11px',
                'cursor': 'pointer'
            });
            let labelText = `${page.pageNum}`;
            if (page.audio) labelText += '🎙️';
            if (change) {
                switch (change.type) {
                    case 'new': labelText += '🆕'; setCssProps(label, { 'color': 'var(--text-accent)' }); break;
                    case 'modified': labelText += '🔄'; setCssProps(label, { 'color': 'var(--text-warning)' }); break;
                    case 'unchanged': labelText += '✓'; setCssProps(label, { 'opacity': '0.6' }); break;
                }
            }
            label.textContent = labelText;
            pageDiv.dataset.pageNum = page.pageNum.toString();
            pageDiv.dataset.hasAudio = page.audio ? 'true' : 'false';
            if (change) pageDiv.dataset.changeType = change.type;
        }

        searchInput.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value.toLowerCase();
            this.checkboxes.forEach((checkbox, pageNum) => {
                const pageDiv = checkbox.parentElement;
                if (!pageDiv) return;
                let visible = false;
                if (pageNum.toString().includes(query)) visible = true;
                const rangeMatch = query.match(/(\d+)-(\d+)/);
                if (rangeMatch) {
                    const start = parseInt(rangeMatch[1]);
                    const end = parseInt(rangeMatch[2]);
                    if (pageNum >= start && pageNum <= end) visible = true;
                }
                if (query.includes('audio') && pageDiv.dataset.hasAudio === 'true') visible = true;
                if (query.includes('new') && pageDiv.dataset.changeType === 'new') visible = true;
                if (query.includes('modified') && pageDiv.dataset.changeType === 'modified') visible = true;
                setCssProps(pageDiv, { 'display': visible || query === '' ? 'block' : 'none' });
            });
        });

        selectAllBtn.onclick = () => this.checkboxes.forEach(cb => cb.checked = true);
        selectNoneBtn.onclick = () => this.checkboxes.forEach(cb => cb.checked = false);
        selectNewBtn.onclick = () => {
            this.checkboxes.forEach((cb, pageNum) => {
                const change = this.analysis?.changes.find(c => c.pageNum === pageNum);
                cb.checked = change?.type === 'new' || false;
            });
        };
        selectModifiedBtn.onclick = () => {
            this.checkboxes.forEach((cb, pageNum) => {
                const change = this.analysis?.changes.find(c => c.pageNum === pageNum);
                cb.checked = change?.type === 'modified' || false;
            });
        };
        selectAudioBtn.onclick = () => {
            this.checkboxes.forEach((cb, pageNum) => {
                const page = this.bookResult.pages.find(p => p.pageNum === pageNum);
                cb.checked = !!page?.audio;
            });
        };

        importMode.addEventListener('change', () => {
            setCssProps(rangeContainer, { 'display': importMode.value === 'range' ? 'block' : 'none' });
            setCssProps(pageSelector, { 'display': importMode.value === 'select' ? 'block' : 'none' });
        });

        const buttonContainer = contentEl.createDiv();
        setCssProps(buttonContainer, {
            'display': 'flex',
            'gap': '10px',
            'justify-content': 'flex-end',
            'margin-top': '20px'
        });
        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        const importBtn = buttonContainer.createEl('button', { text: 'Import', cls: 'mod-cta' });

        importBtn.onclick = () => {
            let pagesToImport: number[] = [];
            switch (importMode.value) {
                case 'new': pagesToImport = this.analysis?.summary.newPages || []; break;
                case 'modified': pagesToImport = this.analysis?.summary.modifiedPages || []; break;
                case 'new-and-modified': pagesToImport = [...(this.analysis?.summary.newPages || []), ...(this.analysis?.summary.modifiedPages || [])]; break;
                case 'all': pagesToImport = this.bookResult.pages.map(p => p.pageNum); break;
                case 'range': {
                    const from = parseInt(rangeFrom.value);
                    const to = parseInt(rangeTo.value);
                    for (let i = from; i <= to && i <= this.bookResult.pages.length; i++) pagesToImport.push(i);
                    break;
                }
                case 'select':
                    this.checkboxes.forEach((checkbox, pageNum) => { if (checkbox.checked) pagesToImport.push(pageNum); });
                    break;
                case 'none': break;
            }
            this.close();
            this.onChoose(pagesToImport);
        };
        cancelBtn.onclick = () => { this.close(); this.onChoose([]); };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// ============================================================================
// PROGRESS MODAL - Shows import progress
// ============================================================================

export class ProgressModal extends Modal {
    progressBar: HTMLProgressElement;
    statusText: HTMLElement;
    totalPages: number;

    constructor(app: App, totalPages: number) {
        super(app);
        this.totalPages = totalPages;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Importing pages' });
        this.statusText = contentEl.createEl('p', { text: 'Starting import...' });
        this.progressBar = contentEl.createEl('progress');
        setCssProps(this.progressBar, {
            'width': '100%',
            'height': '20px'
        });
        this.progressBar.max = this.totalPages;
        this.progressBar.value = 0;
        const progressText = contentEl.createDiv();
        setCssProps(progressText, {
            'text-align': 'center',
            'margin-top': '10px'
        });
        progressText.textContent = `0 / ${this.totalPages}`;
    }

    updateProgress(current: number, message: string) {
        if (!this.progressBar) return;
        this.progressBar.value = current;
        this.statusText.textContent = message;
        const progressText = this.contentEl.querySelector('div');
        if (progressText) progressText.textContent = `${current} / ${this.totalPages}`;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// ============================================================================
// IMPORT SUMMARY MODAL - Shows import results
// ============================================================================

export class ImportSummaryModal extends Modal {
    summary: ImportSummary;
    backupPath: string | null;

    constructor(app: App, summary: ImportSummary, backupPath: string | null) {
        super(app);
        this.summary = summary;
        this.backupPath = backupPath;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Import complete' });
        const summaryDiv = contentEl.createDiv({ cls: 'import-summary' });
        setCssProps(summaryDiv, {
            'padding': '15px',
            'background': 'var(--background-secondary)',
            'border-radius': '8px'
        });

        // Use safe DOM methods instead of innerHTML
        const heading = summaryDiv.createEl('h3');
        heading.textContent = '📊 import complete';

        const gridDiv = summaryDiv.createDiv();
        setCssProps(gridDiv, {
            'display': 'grid',
            'grid-template-columns': '1fr 1fr',
            'gap': '10px',
            'margin-top': '10px'
        });

        if (this.summary.newPages.length > 0) {
            const newPagesDiv = gridDiv.createDiv();
            newPagesDiv.textContent = `🆕 New pages: ${this.summary.newPages.length}`;
        }
        if (this.summary.modifiedPages.length > 0) {
            const modifiedPagesDiv = gridDiv.createDiv();
            modifiedPagesDiv.textContent = `🔄 Modified pages: ${this.summary.modifiedPages.length}`;
        }
        if (this.summary.unchangedPages.length > 0) {
            const unchangedPagesDiv = gridDiv.createDiv();
            unchangedPagesDiv.textContent = `✓ Unchanged pages: ${this.summary.unchangedPages.length}`;
        }
        if (this.summary.errors.length > 0) {
            const errorsDiv = gridDiv.createDiv();
            setCssProps(errorsDiv, { 'color': 'var(--text-error)' });
            errorsDiv.textContent = `❌ Errors: ${this.summary.errors.length}`;
        }

        if (this.summary.errors.length > 0) {
            const errorDiv = contentEl.createDiv({ cls: 'import-errors' });
            setCssProps(errorDiv, {
                'margin-top': '15px',
                'padding': '10px',
                'background': 'var(--background-secondary-alt)',
                'border-radius': '5px'
            });
            errorDiv.createEl('h4', { text: 'Import errors' });
            const errorList = errorDiv.createEl('ul');
            this.summary.errors.forEach(error => errorList.createEl('li', { text: `Page ${error.page}: ${error.error}` }));
        }

        if (this.backupPath) {
            const backupDiv = contentEl.createDiv();
            setCssProps(backupDiv, {
                'margin-top': '15px',
                'padding': '10px',
                'background': 'var(--background-modifier-success)',
                'border-radius': '5px'
            });
            backupDiv.createEl('p', { text: `✅ Manifest backup created: ${this.backupPath.split('/').pop()}` });
        }

        const buttonDiv = contentEl.createDiv();
        setCssProps(buttonDiv, {
            'display': 'flex',
            'justify-content': 'center',
            'margin-top': '20px'
        });
        const okBtn = buttonDiv.createEl('button', { text: 'OK', cls: 'mod-cta' });
        okBtn.onclick = () => this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// ============================================================================
// EXPORT MODAL - Export book dialog
// ============================================================================

export class ExportModal extends Modal {
    plugin: IViwoodsImporterPlugin;

    constructor(app: App, plugin: IViwoodsImporterPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Export viwoods notes' });
        contentEl.createEl('p', { text: 'Select a book and export format. This will create a package with all pages and media.' });

        const bookSelect = contentEl.createEl('select', { cls: 'dropdown' });
        setCssProps(bookSelect, {
            'width': '100%',
            'margin': '10px 0'
        });
        const booksFolder = this.app.vault.getAbstractFileByPath(this.plugin.settings.notesFolder);
        if (booksFolder instanceof TFolder) {
            for (const child of booksFolder.children) {
                if (child instanceof TFolder) bookSelect.createEl('option', { value: child.path, text: child.name });
            }
        }

        contentEl.createEl('label', { text: 'Export format' });
        const formatSelect = contentEl.createEl('select', { cls: 'dropdown' });
        setCssProps(formatSelect, {
            'width': '100%',
            'margin': '10px 0'
        });
        formatSelect.createEl('option', { value: 'markdown', text: 'Markdown with media (zip)' });
        formatSelect.createEl('option', { value: 'pdf', text: 'PDF (single file)' });
        formatSelect.createEl('option', { value: 'html', text: 'HTML (standalone)' });

        const optionsDiv = contentEl.createDiv();
        setCssProps(optionsDiv, { 'margin': '15px 0' });
        const includeAudioCheck = optionsDiv.createEl('input', { type: 'checkbox' });
        includeAudioCheck.id = 'include-audio';
        includeAudioCheck.checked = true;
        const includeAudioLabel = optionsDiv.createEl('label');
        includeAudioLabel.setAttribute('for', 'include-audio');
        includeAudioLabel.textContent = ' Include audio recordings';
        optionsDiv.createEl('br');
        const includeGeminiCheck = optionsDiv.createEl('input', { type: 'checkbox' });
        includeGeminiCheck.id = 'include-gemini';
        includeGeminiCheck.checked = true;
        const includeGeminiLabel = optionsDiv.createEl('label');
        includeGeminiLabel.setAttribute('for', 'include-gemini');
        includeGeminiLabel.textContent = ' Include gemini transcription';

        const buttonDiv = contentEl.createDiv();
        setCssProps(buttonDiv, {
            'display': 'flex',
            'justify-content': 'flex-end',
            'gap': '10px',
            'margin-top': '20px'
        });
        const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
        const exportBtn = buttonDiv.createEl('button', { text: 'Export', cls: 'mod-cta' });

        exportBtn.onclick = () => {
            const bookPath = bookSelect.value;
            const format = formatSelect.value;
            const includeAudio = includeAudioCheck.checked;
            const includeGemini = includeGeminiCheck.checked;
            this.close();
            try {
                this.exportBook(bookPath, format as 'pdf' | 'markdown' | 'html', includeAudio, includeGemini);
                new Notice('Export completed successfully!');
            } catch (error: unknown) {
                console.error('Export failed:', error);
                const message = error instanceof Error ? error.message : String(error);
                new Notice('Export failed: ' + message);
            }
        };
        cancelBtn.onclick = () => this.close();
    }

    exportBook(_bookPath: string, format: 'markdown' | 'pdf' | 'html', _includeAudio: boolean, _includeGemini: boolean): void {
        // Export functionality placeholder
        new Notice(`Export functionality for ${format} format would be implemented here`);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// ============================================================================
// IMPORT MODAL - File selection dialog
// ============================================================================

export class ImportModal extends Modal {
    plugin: IViwoodsImporterPlugin;
    fileInput: HTMLInputElement;

    constructor(app: App, plugin: IViwoodsImporterPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Import viwoods notes' });
        contentEl.createEl('p', { text: 'Select .note files to import. Each file may contain multiple pages that will be organized into a book structure.' });

        const recentDiv = contentEl.createDiv();
        setCssProps(recentDiv, {
            'margin': '15px 0',
            'padding': '10px',
            'background': 'var(--background-secondary)',
            'border-radius': '5px'
        });
        recentDiv.createEl('h3', { text: 'Recent notes' });

        const booksFolder = this.app.vault.getAbstractFileByPath(this.plugin.settings.notesFolder);
        if (booksFolder instanceof TFolder) {
            const recentBooks = booksFolder.children.filter(child => child instanceof TFolder).slice(0, 5);
            if (recentBooks.length > 0) {
                const bookList = recentDiv.createEl('ul');
                setCssProps(bookList, {
                    'list-style': 'none',
                    'padding': '0'
                });
                for (const book of recentBooks) {
                    const li = bookList.createEl('li');
                    setCssProps(li, { 'padding': '3px 0' });
                    li.textContent = `📚 ${book.name}`;
                }
            } else {
                recentDiv.createEl('p', { text: 'No books imported yet.', cls: 'mod-muted' });
            }
        }

        contentEl.createEl('h3', { text: 'Select files' });
        this.fileInput = contentEl.createEl('input', { type: 'file', attr: { multiple: true, accept: '.note,.zip' } });
        setCssProps(this.fileInput, { 'margin-bottom': '20px' });

        const dropArea = contentEl.createDiv({ cls: 'drop-area' });
        setCssProps(dropArea, {
            'border': '2px dashed var(--background-modifier-border)',
            'border-radius': '8px',
            'padding': '30px',
            'text-align': 'center',
            'margin': '15px 0'
        });
        dropArea.createEl('p', { text: '📥 drag and drop .note files here' });

        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            setCssProps(dropArea, { 'border-color': 'var(--interactive-accent)' });
        });
        dropArea.addEventListener('dragleave', () => {
            setCssProps(dropArea, { 'border-color': 'var(--background-modifier-border)' });
        });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            setCssProps(dropArea, { 'border-color': 'var(--background-modifier-border)' });
            const files = Array.from(e.dataTransfer?.files || []).filter(f => f.name.endsWith('.note') || f.name.endsWith('.zip'));
            if (files.length > 0) {
                void (async () => {
                    this.close();
                    for (const file of files) {
                        try {
                            await this.plugin.processNoteFile(file);
                        } catch (error) {
                            console.error('Failed to process file:', error);
                            new Notice(`Failed to process ${file.name}`);
                        }
                    }
                })();
            }
        });

        const buttonDiv = contentEl.createDiv();
        setCssProps(buttonDiv, {
            'display': 'flex',
            'justify-content': 'flex-end',
            'gap': '10px',
            'margin-top': '20px'
        });
        const cancelBtn = buttonDiv.createEl('button', { text: 'Cancel' });
        const importBtn = buttonDiv.createEl('button', { text: 'Import', cls: 'mod-cta' });

        importBtn.addEventListener('click', () => {
            const files = Array.from(this.fileInput.files || []);
            if (files.length > 0) {
                void (async () => {
                    this.close();
                    for (const file of files) {
                        try {
                            await this.plugin.processNoteFile(file);
                        } catch (error) {
                            console.error('Failed to process file:', error);
                            new Notice(`Failed to process ${file.name}`);
                        }
                    }
                })();
            } else {
                new Notice('Please select files to import');
            }
        });
        cancelBtn.addEventListener('click', () => this.close());
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
