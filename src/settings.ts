// settings.ts - Settings management for Viwoods Notes Importer Plugin

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { ViwoodsSettings } from './types.js';
import { DEFAULT_SETTINGS } from './utils/constants.js';
import { ViwoodsImporterPlugin } from './main.js';

export { ViwoodsSettings, DEFAULT_SETTINGS };

export class ViwoodsSettingTab extends PluginSettingTab {
    plugin: ViwoodsImporterPlugin;

    constructor(app: App, plugin: ViwoodsImporterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Viwoods Notes Importer Settings' });

        containerEl.createEl('h3', { text: 'Organization' });
        new Setting(containerEl).setName('Organization mode').setDesc('How to organize imported notes').addDropdown(dropdown => dropdown
            .addOption('book', 'Book mode (recommended) - One folder per notebook').addOption('flat', 'Flat mode - All pages in one folder')
            .setValue(this.plugin.settings.organizationMode).onChange(async (value: 'book' | 'flat') => {
                this.plugin.settings.organizationMode = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Create index').setDesc('Create an index file for each book with links to all pages').addToggle(toggle => toggle
            .setValue(this.plugin.settings.createIndex).onChange(async (value) => {
                this.plugin.settings.createIndex = value;
                await this.plugin.saveSettings();
            }));

        containerEl.createEl('h3', { text: 'Import Behavior' });
        new Setting(containerEl).setName('Auto-detect changes').setDesc('Automatically detect new, modified, and unchanged pages during import').addToggle(toggle => toggle
            .setValue(this.plugin.settings.autoDetectChanges).onChange(async (value) => {
                this.plugin.settings.autoDetectChanges = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Skip duplicates').setDesc('Skip importing pages that already exist with the same content').addToggle(toggle => toggle
            .setValue(this.plugin.settings.skipDuplicates).onChange(async (value) => {
                this.plugin.settings.skipDuplicates = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Overwrite existing').setDesc('Overwrite existing pages when importing (only if skip duplicates is off)').addToggle(toggle => toggle
            .setValue(this.plugin.settings.overwriteExisting).onChange(async (value) => {
                this.plugin.settings.overwriteExisting = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Create backups').setDesc('Create backup of manifest before making changes').addToggle(toggle => toggle
            .setValue(this.plugin.settings.createBackups).onChange(async (value) => {
                this.plugin.settings.createBackups = value;
                await this.plugin.saveSettings();
            }));

        containerEl.createEl('h3', { text: 'Performance' });
        new Setting(containerEl).setName('Batch size').setDesc('Number of pages to process simultaneously (higher = faster but more memory)').addSlider(slider => slider
            .setLimits(1, 20, 1).setValue(this.plugin.settings.batchSize).setDynamicTooltip().onChange(async (value) => {
                this.plugin.settings.batchSize = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Show progress bar').setDesc('Display progress bar during import').addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableProgressBar).onChange(async (value) => {
                this.plugin.settings.enableProgressBar = value;
                await this.plugin.saveSettings();
            }));

        containerEl.createEl('h3', { text: 'History' });
        new Setting(containerEl).setName('Keep import history').setDesc('Track history of imports and changes').addToggle(toggle => toggle
            .setValue(this.plugin.settings.keepHistory).onChange(async (value) => {
                this.plugin.settings.keepHistory = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Maximum history entries').setDesc('Number of history entries to keep per book').addSlider(slider => slider
            .setLimits(10, 100, 10).setValue(this.plugin.settings.maxHistoryEntries).setDynamicTooltip().onChange(async (value) => {
                this.plugin.settings.maxHistoryEntries = value;
                await this.plugin.saveSettings();
            }));

        containerEl.createEl('h3', { text: 'Storage Locations' });
        new Setting(containerEl).setName('Notes folder').setDesc('Root folder for imported notebooks').addText(text => text
            .setPlaceholder('Viwoods Notes').setValue(this.plugin.settings.notesFolder).onChange(async (value) => {
                this.plugin.settings.notesFolder = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Images subfolder').setDesc('Subfolder name for images within each book (relative to book folder)').addText(text => text
            .setPlaceholder('Images').setValue(this.plugin.settings.imagesFolder).onChange(async (value) => {
                this.plugin.settings.imagesFolder = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Audio subfolder').setDesc('Subfolder name for audio within each book (relative to book folder)').addText(text => text
            .setPlaceholder('Audio').setValue(this.plugin.settings.audioFolder).onChange(async (value) => {
                this.plugin.settings.audioFolder = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Strokes subfolder').setDesc('Subfolder name for stroke data JSON files (relative to book folder)').addText(text => text
            .setPlaceholder('Strokes').setValue(this.plugin.settings.strokesFolder).onChange(async (value) => {
                this.plugin.settings.strokesFolder = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('PDF output folder').setDesc('Folder for auto-generated PDF exports').addText(text => text
            .setPlaceholder('Attachments/PDF').setValue(this.plugin.settings.pdfFolder).onChange(async (value) => {
                this.plugin.settings.pdfFolder = value;
                await this.plugin.saveSettings();
            }));

        containerEl.createEl('h3', { text: 'Output Settings' });
        new Setting(containerEl).setName('Output format').setDesc('Choose how to convert handwritten notes').addDropdown(dropdown => dropdown
            .addOption('png', 'PNG Images').addOption('svg', 'SVG (from strokes)').addOption('both', 'Both PNG and SVG')
            .setValue(this.plugin.settings.outputFormat).onChange(async (value: 'png' | 'svg' | 'both') => {
                this.plugin.settings.outputFormat = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Background color').setDesc('Background color for PNG images (hex color or "transparent")').addText(text => text
            .setPlaceholder('#FFFFFF').setValue(this.plugin.settings.backgroundColor).onChange(async (value) => {
                this.plugin.settings.backgroundColor = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('File prefix').setDesc('Optional prefix for book names').addText(text => text
            .setPlaceholder('viwoods_').setValue(this.plugin.settings.filePrefix).onChange(async (value) => {
                this.plugin.settings.filePrefix = value;
                await this.plugin.saveSettings();
            }));

        containerEl.createEl('h3', { text: 'Metadata Options' });
        new Setting(containerEl).setName('Include metadata').setDesc('Add frontmatter metadata to notes').addToggle(toggle => toggle
            .setValue(this.plugin.settings.includeMetadata).onChange(async (value) => {
                this.plugin.settings.includeMetadata = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Include timestamps').setDesc('Add creation and modification dates').addToggle(toggle => toggle
            .setValue(this.plugin.settings.includeTimestamps).onChange(async (value) => {
                this.plugin.settings.includeTimestamps = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Include thumbnails').setDesc('Import thumbnail images').addToggle(toggle => toggle
            .setValue(this.plugin.settings.includeThumbnails).onChange(async (value) => {
                this.plugin.settings.includeThumbnails = value;
                await this.plugin.saveSettings();
            }));

        containerEl.createEl('h3', { text: 'SVG and PDF Settings' });
        new Setting(containerEl).setName('Enable PDF Export').setDesc('Allow exporting pages to PDF format').addToggle(toggle => toggle
            .setValue(this.plugin.settings.enablePdfExport).onChange(async (value) => {
                this.plugin.settings.enablePdfExport = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Auto-create PDF on import').setDesc('Automatically generate PDF from strokes when importing').addToggle(toggle => toggle
            .setValue(this.plugin.settings.autoCreatePdfOnImport).onChange(async (value) => {
                this.plugin.settings.autoCreatePdfOnImport = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Enable SVG Viewer').setDesc('Show interactive SVG viewer in notes').addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableSvgViewer).onChange(async (value) => {
                this.plugin.settings.enableSvgViewer = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Show SVG viewer in notes').setDesc('Include SVG viewer block when importing notes').addToggle(toggle => toggle
            .setValue(this.plugin.settings.showSvgViewer).onChange(async (value) => {
                this.plugin.settings.showSvgViewer = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Auto-create PDF').setDesc('Automatically create PDF export when viewing strokes').addToggle(toggle => toggle
            .setValue(this.plugin.settings.autoCreatePDF).onChange(async (value) => {
                this.plugin.settings.autoCreatePDF = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Default Smoothness').setDesc('Default smoothing factor for SVG strokes (0-20)').addSlider(slider => slider
            .setLimits(0, 20, 1).setValue(this.plugin.settings.defaultSmoothness).setDynamicTooltip().onChange(async (value) => {
                this.plugin.settings.defaultSmoothness = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Default SVG Width').setDesc('Default width percentage for SVG viewer (50-100)').addSlider(slider => slider
            .setLimits(50, 100, 10).setValue(this.plugin.settings.defaultSvgWidth).setDynamicTooltip().onChange(async (value) => {
                this.plugin.settings.defaultSvgWidth = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Default replay speed').setDesc('Default speed for stroke replay animation (1-50)').addSlider(slider => slider
            .setLimits(1, 50, 1).setValue(this.plugin.settings.defaultReplaySpeed).setDynamicTooltip().onChange(async (value) => {
                this.plugin.settings.defaultReplaySpeed = value;
                await this.plugin.saveSettings();
            }));

        containerEl.createEl('h3', { text: 'Gemini Integration' });
        const app = this.plugin.app as any;
        const isGeminiEnabled = app.plugins?.enabledPlugins?.has('gemini-note-processor');
        if (!isGeminiEnabled) {
            containerEl.createEl('p', { text: '⚠️ Gemini Note Processor plugin is not installed or enabled.', cls: 'setting-item-description mod-warning' });
        } else {
            containerEl.createEl('p', { text: '✅ Gemini Note Processor plugin is ready', cls: 'setting-item-description' });
        }
        new Setting(containerEl).setName('Process with Gemini AI').setDesc('Automatically transcribe handwritten notes using Gemini AI after import').addToggle(toggle => toggle
            .setValue(this.plugin.settings.processWithGemini).onChange(async (value) => {
                this.plugin.settings.processWithGemini = value;
                await this.plugin.saveSettings();
            }));
        new Setting(containerEl).setName('Date format').setDesc('Format for dates in metadata').addDropdown(dropdown => dropdown
            .addOption('iso', 'ISO (YYYY-MM-DD)').addOption('us', 'US (MM/DD/YYYY)').addOption('eu', 'EU (DD/MM/YYYY)')
            .setValue(this.plugin.settings.dateFormat).onChange(async (value: 'iso' | 'us' | 'eu') => {
                this.plugin.settings.dateFormat = value;
                await this.plugin.saveSettings();
            }));

        containerEl.createEl('h3', { text: 'Viwoods Source Folder & Auto-Sync' });

        new Setting(containerEl).setName('Enable auto-sync').setDesc('Automatically watch a folder for Viwoods .note files and detect changes').addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableAutoSync).onChange(async (value) => {
                this.plugin.settings.enableAutoSync = value;
                if (value && !this.plugin.settings.sourceFolderPath) {
                    new Notice('Please set a source folder below');
                }
                if (value) {
                    await this.plugin.startAutoSync();
                } else {
                    this.plugin.stopAutoSync();
                }
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl).setName('Source folder').setDesc('Path to folder containing your Viwoods .note files (outside the vault)').addText(text => text
            .setPlaceholder('/Users/username/Documents/Viwoods')
            .setValue(this.plugin.settings.sourceFolderPath)
            .onChange(async (value) => {
                this.plugin.settings.sourceFolderPath = value;
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl).setName('Polling interval').setDesc('How often to check for changes (minutes)').addSlider(slider => slider
            .setLimits(1, 60, 1)
            .setValue(this.plugin.settings.pollingIntervalMinutes)
            .setDynamicTooltip()
            .onChange(async (value) => {
                this.plugin.settings.pollingIntervalMinutes = value;
                await this.plugin.saveSettings();
                if (this.plugin.settings.enableAutoSync) {
                    await this.plugin.restartAutoSync();
                }
            }));

        new Setting(containerEl).setName('Sync on startup').setDesc('Check for changes when Obsidian starts').addToggle(toggle => toggle
            .setValue(this.plugin.settings.syncOnStartup).onChange(async (value) => {
                this.plugin.settings.syncOnStartup = value;
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl).setName('Show notifications').setDesc('Show notifications when changes are detected').addToggle(toggle => toggle
            .setValue(this.plugin.settings.showSyncNotifications).onChange(async (value) => {
                this.plugin.settings.showSyncNotifications = value;
                await this.plugin.saveSettings();
            }));
    }
}
