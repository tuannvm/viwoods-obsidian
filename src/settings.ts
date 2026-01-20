// settings.ts - Simplified settings management for Viwoods Obsidian Plugin

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type { ViwoodsSettings } from './types.js';
import { DEFAULT_SETTINGS } from './utils/constants.js';
import { setDebugMode } from './utils/logger.js';
import type { IViwoodsPlugin } from './commands/registry.js';

export type { ViwoodsSettings };
export { DEFAULT_SETTINGS };

export class ViwoodsSettingTab extends PluginSettingTab {
    plugin: IViwoodsPlugin;

    constructor(app: App, plugin: IViwoodsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        new Setting(containerEl)
            .setHeading()
            .setName('Viwoods Obsidian settings');

        // ========================================================================
        // Basic Settings
        // ========================================================================

        new Setting(containerEl)
            .setName('Source folder (fallback)')
            .setDesc('Used when a platform-specific path is not set or on mobile')
            .addText(text => text
                .setPlaceholder('Path to source folder')
                .setValue(this.plugin.settings.sourceFolderPath)
                .onChange(async (value) => {
                    this.plugin.settings.sourceFolderPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Source folder (Windows)')
            .setDesc('Used on Windows desktop when set')
            .addText(text => text
                .setPlaceholder('Path to source folder on Windows')
                .setValue(this.plugin.settings.sourceFolderPathWindows)
                .onChange(async (value) => {
                    this.plugin.settings.sourceFolderPathWindows = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Source folder (macOS)')
            .setDesc('Used on macOS desktop when set')
            .addText(text => text
                .setPlaceholder('Path to source folder on macOS')
                .setValue(this.plugin.settings.sourceFolderPathMacos)
                .onChange(async (value) => {
                    this.plugin.settings.sourceFolderPathMacos = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Source folder (Linux)')
            .setDesc('Used on Linux desktop when set')
            .addText(text => text
                .setPlaceholder('Path to source folder on Linux')
                .setValue(this.plugin.settings.sourceFolderPathLinux)
                .onChange(async (value) => {
                    this.plugin.settings.sourceFolderPathLinux = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Destination folder (in Obsidian)')
            .setDesc('Root folder for imported notes in your vault')
            .addText(text => text
                .setPlaceholder('Viwoods notes')
                .setValue(this.plugin.settings.notesFolder)
                .onChange(async (value) => {
                    this.plugin.settings.notesFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Include metadata')
            .setDesc('Add frontmatter metadata to notes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeMetadata)
                .onChange(async (value) => {
                    this.plugin.settings.includeMetadata = value;
                    await this.plugin.saveSettings();
                }));

        // ========================================================================
        // Auto-Sync Settings
        // ========================================================================

        new Setting(containerEl)
            .setName('Enable auto-sync')
            .setDesc('Automatically watch the source folder for changes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAutoSync)
                .onChange(async (value) => {
                    this.plugin.settings.enableAutoSync = value;
                    const hasAnySourcePath = Boolean(
                        this.plugin.settings.sourceFolderPath ||
                        this.plugin.settings.sourceFolderPathWindows ||
                        this.plugin.settings.sourceFolderPathMacos ||
                        this.plugin.settings.sourceFolderPathLinux
                    );
                    if (value && !hasAnySourcePath) {
                        new Notice('Please set a source folder first');
                    }
                    if (value) {
                        await this.plugin.startAutoSync();
                    } else {
                        this.plugin.stopAutoSync();
                    }
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Polling interval')
            .setDesc('How often to check for changes (minutes)')
            .addSlider(slider => slider
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

        new Setting(containerEl)
            .setName('Sync on startup')
            .setDesc('Check for changes when Obsidian starts')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.syncOnStartup)
                .onChange(async (value) => {
                    this.plugin.settings.syncOnStartup = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show notifications')
            .setDesc('Show notifications when changes are detected')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showSyncNotifications)
                .onChange(async (value) => {
                    this.plugin.settings.showSyncNotifications = value;
                    await this.plugin.saveSettings();
                }));

        // ========================================================================
        // Debug Settings
        // ========================================================================

        new Setting(containerEl)
            .setName('Enable debug logging to console')
            .setDesc('Enable debug logging (for troubleshooting)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    setDebugMode(value);
                    await this.plugin.saveSettings();
                    if (value) {
                        new Notice('Debug mode enabled. Check console for detailed logs.');
                    }
                }));

        // ========================================================================
        // OCR Settings (macOS only)
        // ========================================================================

        containerEl.createEl('h3', { text: 'OCR settings' });

        new Setting(containerEl)
            .setName('Enable OCR')
            .setDesc('Extract text from handwritten notes using Apple Vision framework (macOS desktop; requires Swift/Xcode command line tools)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableOcr)
                .onChange(async (value) => {
                    this.plugin.settings.enableOcr = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('OCR languages')
            .setDesc('Language codes for OCR')
            .addText(text => text
                .setPlaceholder('en-US')
                .setValue(this.plugin.settings.ocrLanguages.join(','))
                .onChange(async (value) => {
                    this.plugin.settings.ocrLanguages = value
                        .split(',')
                        .map(lang => lang.trim())
                        .filter(lang => lang.length > 0);
                    if (this.plugin.settings.ocrLanguages.length === 0) {
                        this.plugin.settings.ocrLanguages = ['en-US'];
                    }
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('OCR confidence threshold')
            .setDesc('Minimum confidence level for OCR results (0.0 to 1.0)')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.05)
                .setValue(this.plugin.settings.ocrConfidenceThreshold)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.ocrConfidenceThreshold = value;
                    await this.plugin.saveSettings();
                }));
    }
}
