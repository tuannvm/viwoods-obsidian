// ui/import-notice-modal.ts - Simplified notice-based import modal for Viwoods Auto-Sync

import { App, Modal, ButtonComponent } from 'obsidian';
import type { DetectedChange } from '../types.js';

export interface ImportNoticeResult {
    action: 'import' | 'skip' | 'view';
}

/**
 * Simplified notice modal for auto-detected changes
 * Shows Import All / Skip / View Details options
 */
export class ImportNoticeModal extends Modal {
    private changes: DetectedChange[];
    private onAction: (result: ImportNoticeResult) => void;

    constructor(app: App, changes: DetectedChange[], onAction: (result: ImportNoticeResult) => void) {
        super(app);
        this.changes = changes;
        this.onAction = onAction;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.addClass('viwoods-import-notice-modal');

        // Header
        const newCount = this.changes.filter(c => c.changeType === 'new').length;
        const modifiedCount = this.changes.filter(c => c.changeType === 'modified').length;

        let title = `📝 Viwoods: ${this.changes.length} note${this.changes.length > 1 ? 's' : ''} detected`;
        if (newCount > 0) title += ` (${newCount} new)`;
        if (modifiedCount > 0) title += ` (${modifiedCount} modified)`;

        contentEl.createEl('h2', { text: title });

        // File list
        const fileListEl = contentEl.createDiv({ cls: 'viwoods-file-list' });
        for (const change of this.changes) {
            const fileEl = fileListEl.createDiv({ cls: 'viwoods-file-item' });
            const icon = change.changeType === 'new' ? '🆕' : '📝';
            fileEl.createSpan({ cls: 'viwoods-file-icon', text: icon });
            fileEl.createSpan({ cls: 'viwoods-file-name', text: change.fileName });
            fileEl.createSpan({
                cls: 'viwoods-file-status',
                text: change.changeType === 'new' ? 'New' : 'Modified'
            });
        }

        // Buttons
        const buttonContainer = contentEl.createDiv({ cls: 'viwoods-button-container' });

        // Import All button
        new ButtonComponent(buttonContainer)
            .setButtonText('Import all')
            .setCta()
            .onClick(() => {
                this.onAction({ action: 'import' });
                this.close();
            });

        // View Details button
        new ButtonComponent(buttonContainer)
            .setButtonText('View details')
            .onClick(() => {
                this.onAction({ action: 'view' });
                this.close();
            });

        // Skip button
        new ButtonComponent(buttonContainer)
            .setButtonText('Skip')
            .onClick(() => {
                this.onAction({ action: 'skip' });
                this.close();
            });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
