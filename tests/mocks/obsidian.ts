// tests/mocks/obsidian.ts - Mock Obsidian API for testing

import { vi } from 'vitest';

export class Plugin {
	manifest: any;
	app: any;
	constructor(app: any, manifest: any) {
		this.app = app;
		this.manifest = manifest;
	}
	async onload() {}
	async onunload() {}
	loadData() { return Promise.resolve({}); }
	saveData() { return Promise.resolve(); }
}

export class App {}

export class Notice {
	static notices: Notice[] = [];
	constructor(message: string, timeout?: number) {
		Notice.notices.push(this);
		this.message = message;
		this.timeout = timeout;
	}
}

export class Modal {
	constructor(app: any) {}
	onOpen() {}
	onClose() {}
}

export class MarkdownView {
	editor: any = {};
	getView() {}
}

export class TFile {
	path: string;
	name: string;
	extension: string;
	constructor(path: string) {
		this.path = path;
		this.name = path.split('/').pop() || '';
		this.extension = this.name.split('.').pop() || '';
	}
}

export class TFolder {
	path: string;
	children: any[] = [];
	constructor(path: string) {
		this.path = path;
	}
}

export function normalizePath(path: string): string {
	return path.replace(/\\/g, '/');
}

// Export all types and classes that may be imported from obsidian
export const PluginSettingTab = class {};
export const Setting = class {};
export const ButtonComponent = class {};
export const MarkdownPostProcessorContext = class {};
