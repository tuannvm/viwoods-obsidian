// settings.ts - Simplified settings management for Viwoods Notes Importer Plugin

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type { ViwoodsSettings } from './types.js';
import { DEFAULT_SETTINGS } from './utils/constants.js';
import ViwoodsImporterPlugin from './main.js';

export type { ViwoodsSettings };
export { DEFAULT_SETTINGS };

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

        // ========================================================================
        // Section 1: Basic Settings
        // ========================================================================
        containerEl.createEl('h3', { text: 'Basic Settings' });

        new Setting(containerEl).setName('Notes folder').setDesc('Root folder for imported notes').addText(text => text
            .setPlaceholder('Viwoods Notes')
            .setValue(this.plugin.settings.notesFolder)
            .onChange(async (value) => {
                this.plugin.settings.notesFolder = value;
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl).setName('Include metadata').setDesc('Add frontmatter metadata to notes').addToggle(toggle => toggle
            .setValue(this.plugin.settings.includeMetadata)
            .onChange(async (value) => {
                this.plugin.settings.includeMetadata = value;
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl).setName('Include timestamps').setDesc('Add creation and modification dates').addToggle(toggle => toggle
            .setValue(this.plugin.settings.includeTimestamps)
            .onChange(async (value) => {
                this.plugin.settings.includeTimestamps = value;
                await this.plugin.saveSettings();
            }));

        // ========================================================================
        // Section 2: Import Format
        // ========================================================================
        containerEl.createEl('h3', { text: 'Import Format' });

        new Setting(containerEl).setName('Output format').setDesc('How to convert handwritten notes').addDropdown(dropdown => dropdown
            .addOption('png', 'PNG Images')
            .addOption('svg', 'SVG (from strokes)')
            .addOption('both', 'Both PNG and SVG')
            .setValue(this.plugin.settings.outputFormat)
            .onChange(async (value: 'png' | 'svg' | 'both') => {
                this.plugin.settings.outputFormat = value;
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl).setName('Background color').setDesc('Background color for PNG images').addText(text => text
            .setPlaceholder('#FFFFFF')
            .setValue(this.plugin.settings.backgroundColor)
            .onChange(async (value) => {
                this.plugin.settings.backgroundColor = value;
                await this.plugin.saveSettings();
            }));

        // ========================================================================
        // Section 3: Auto-Sync
        // ========================================================================
        containerEl.createEl('h3', { text: 'Auto-Sync' });

        new Setting(containerEl).setName('Enable auto-sync').setDesc('Automatically watch a folder for Viwoods .note files').addToggle(toggle => toggle
            .setValue(this.plugin.settings.enableAutoSync)
            .onChange(async (value) => {
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
            .setValue(this.plugin.settings.syncOnStartup)
            .onChange(async (value) => {
                this.plugin.settings.syncOnStartup = value;
                await this.plugin.saveSettings();
            }));

        new Setting(containerEl).setName('Show notifications').setDesc('Show notifications when changes are detected').addToggle(toggle => toggle
            .setValue(this.plugin.settings.showSyncNotifications)
            .onChange(async (value) => {
                this.plugin.settings.showSyncNotifications = value;
                await this.plugin.saveSettings();
            }));
    }
}
