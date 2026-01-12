// ui/sync-modals.ts - UI modals for Viwoods Auto-Sync

import { App, Modal, Notice } from 'obsidian';

export class SourceFolderPickerModal extends Modal {
    private onChoose: (folderPath: string) => void;
    private inputEl: HTMLInputElement;

    constructor(app: App, onChoose: (folderPath: string) => void) {
        super(app);
        this.onChoose = onChoose;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Set Viwoods Source Folder' });
        contentEl.createEl('p', { text: 'Enter the path to the folder containing your Viwoods .note files.' });
        this.inputEl = contentEl.createEl('input', { type: 'text' });
        this.inputEl.placeholder = '/Users/username/Documents/Viwoods';
        this.inputEl.style.cssText = 'width: 100%; margin: 15px 0; padding: 8px;';
        const buttonContainer = contentEl.createEl('div');
        buttonContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';
        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        const okBtn = buttonContainer.createEl('button', { text: 'Save', cls: 'mod-cta' });
        cancelBtn.onclick = () => this.close();
        okBtn.onclick = () => {
            const path = this.inputEl.value.trim();
            if (path) {
                this.onChoose(path);
                this.close();
            } else {
                new Notice('Please enter a folder path');
            }
        };
        this.inputEl.focus();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class SyncStatusModal extends Modal {
    private getStatusFn: () => {
        isEnabled: boolean;
        sourceFolder: string;
        pendingChanges: number;
        knownFilesCount: number;
        lastScan: number;
    };

    constructor(app: App, getStatusFn: SyncStatusModal['getStatusFn']) {
        super(app);
        this.getStatusFn = getStatusFn;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Viwoods Auto-Sync Status' });
        const status = this.getStatusFn();
        const statusDiv = contentEl.createEl('div');
        statusDiv.style.cssText = 'padding: 15px; background: var(--background-secondary); border-radius: 8px;';
        
        const p1 = statusDiv.createEl('p');
        p1.createEl('strong').textContent = 'Status: ';
        p1.createSpan().textContent = status.isEnabled ? 'Enabled' : 'Disabled';
        
        const p2 = statusDiv.createEl('p');
        p2.createEl('strong').textContent = 'Source: ';
        p2.createSpan().textContent = status.sourceFolder || 'Not set';
        
        const p3 = statusDiv.createEl('p');
        p3.createEl('strong').textContent = 'Pending changes: ';
        p3.createSpan().textContent = String(status.pendingChanges);
        
        const p4 = statusDiv.createEl('p');
        p4.createEl('strong').textContent = 'Known files: ';
        p4.createSpan().textContent = String(status.knownFilesCount);
        
        if (status.lastScan > 0) {
            const p5 = statusDiv.createEl('p');
            p5.createEl('strong').textContent = 'Last scan: ';
            p5.createSpan().textContent = new Date(status.lastScan).toLocaleString();
        }
        
        const closeBtn = contentEl.createEl('button', { text: 'Close', cls: 'mod-cta' });
        closeBtn.onclick = () => this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
