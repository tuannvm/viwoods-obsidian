// commands/reset-hashes-command.ts - Reset book hashes command

import { App, Notice, Modal, TFolder } from 'obsidian';
import type { ViwoodsSettings } from '../types.js';
import { loadManifest, saveManifest, ensureFolder } from '../utils/file-utils.js';

export function resetBookHashes(app: App, settings: ViwoodsSettings): void {
    const booksFolder = app.vault.getAbstractFileByPath(settings.notesFolder);
    if (!(booksFolder instanceof TFolder)) {
        new Notice('No books found');
        return;
    }
    const books = booksFolder.children.filter(child => child instanceof TFolder).map(folder => folder.name);
    if (books.length === 0) {
        new Notice('No books found');
        return;
    }
    const modal = new Modal(app);
    modal.titleEl.setText('Select Book to Reset');
    const select = modal.contentEl.createEl('select');
    books.forEach(book => select.createEl('option', { value: book, text: book }));
    const buttonDiv = modal.contentEl.createDiv();
    buttonDiv.style.cssText = 'margin-top: 20px; text-align: right;';
    const resetBtn = buttonDiv.createEl('button', { text: 'Reset Hashes', cls: 'mod-cta' });
    resetBtn.onclick = async () => {
        const bookName = select.value;
        const manifestPath = `${settings.notesFolder}/${bookName}/.import-manifest.json`;
        const manifest = await loadManifest(app, manifestPath);
        if (manifest) {
            Object.keys(manifest.importedPages).forEach(pageNum => {
                manifest.importedPages[parseInt(pageNum)].imageHash = 'RESET-' + Date.now();
            });
            await saveManifest(app, manifestPath, manifest, ensureFolder);
            new Notice(`Reset hashes for ${bookName}. Next import will update them.`);
        } else {
            new Notice('No manifest found for this book');
        }
        modal.close();
    };
    buttonDiv.createEl('button', { text: 'Cancel' }).onclick = () => modal.close();
    modal.open();
}
