// tests/utils.test.ts - Unit tests for utility functions

import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/utils/constants.js';

describe('Constants', () => {
	describe('DEFAULT_SETTINGS', () => {
		it('should have all required settings', () => {
			expect(DEFAULT_SETTINGS).toBeDefined();
			expect(DEFAULT_SETTINGS).toHaveProperty('notesFolder');
			expect(DEFAULT_SETTINGS).toHaveProperty('includeMetadata');
			expect(DEFAULT_SETTINGS).toHaveProperty('includeTimestamps');
			expect(DEFAULT_SETTINGS).toHaveProperty('outputFormat');
			expect(DEFAULT_SETTINGS).toHaveProperty('backgroundColor');
			expect(DEFAULT_SETTINGS).toHaveProperty('enableAutoSync');
			expect(DEFAULT_SETTINGS).toHaveProperty('sourceFolderPath');
			expect(DEFAULT_SETTINGS).toHaveProperty('pollingIntervalMinutes');
			expect(DEFAULT_SETTINGS).toHaveProperty('showSyncNotifications');
			expect(DEFAULT_SETTINGS).toHaveProperty('syncOnStartup');
			expect(DEFAULT_SETTINGS).toHaveProperty('debugMode');
		});

		it('should have correct default values', () => {
			expect(DEFAULT_SETTINGS.notesFolder).toBe('Viwoods Notes');
			expect(DEFAULT_SETTINGS.includeMetadata).toBe(true);
			expect(DEFAULT_SETTINGS.includeTimestamps).toBe(true);
			expect(DEFAULT_SETTINGS.outputFormat).toBe('png');
			expect(DEFAULT_SETTINGS.backgroundColor).toBe('#FFFFFF');
			expect(DEFAULT_SETTINGS.enableAutoSync).toBe(false);
			expect(DEFAULT_SETTINGS.sourceFolderPath).toBe('');
			expect(DEFAULT_SETTINGS.pollingIntervalMinutes).toBe(5);
			expect(DEFAULT_SETTINGS.showSyncNotifications).toBe(true);
			expect(DEFAULT_SETTINGS.syncOnStartup).toBe(false);
			expect(DEFAULT_SETTINGS.debugMode).toBe(false);
		});

		it('should have valid output format values', () => {
			const validFormats = ['png', 'svg', 'both'];
			expect(validFormats).toContain(DEFAULT_SETTINGS.outputFormat);
		});

		it('should have polling interval within valid range', () => {
			expect(DEFAULT_SETTINGS.pollingIntervalMinutes).toBeGreaterThanOrEqual(1);
			expect(DEFAULT_SETTINGS.pollingIntervalMinutes).toBeLessThanOrEqual(60);
		});
	});
});

describe('Logger Utility', () => {
	describe('setDebugMode', () => {
		it('should be importable', async () => {
			const { setDebugMode, getDebugMode, log } = await import('../src/utils/logger.js');
			expect(typeof setDebugMode).toBe('function');
			expect(typeof getDebugMode).toBe('function');
			expect(typeof log).toBe('object');
			expect(log).toHaveProperty('debug');
			expect(log).toHaveProperty('error');
			expect(log).toHaveProperty('warn');
		});

		it('should toggle debug mode', async () => {
			const { setDebugMode, getDebugMode } = await import('../src/utils/logger.js');

			setDebugMode(true);
			expect(getDebugMode()).toBe(true);

			setDebugMode(false);
			expect(getDebugMode()).toBe(false);
		});
	});
});

describe('Types', () => {
	describe('ViwoodsSettings', () => {
		it('should be importable as type', async () => {
			const types = await import('../src/types.js');
			// ES modules export types differently - check if the module exports correctly
			expect(types).toBeDefined();
			expect(typeof types).toBe('object');
		});
	});
});

describe('Logger', () => {
	it('should not log when debug mode is off', async () => {
		const { setDebugMode, log } = await import('../src/utils/logger.js');
		setDebugMode(false);

		const consoleSpy = { log: vi.fn() };
		const originalLog = global.console.log;
		global.console.log = consoleSpy.log;

		log.debug('test message');

		global.console.log = originalLog;

		expect(consoleSpy.log).not.toHaveBeenCalled();
	});

	it('should log errors regardless of debug mode', async () => {
		const { setDebugMode, log } = await import('../src/utils/logger.js');
		setDebugMode(false);

		const consoleSpy = { error: vi.fn() };
		const originalError = global.console.error;
		global.console.error = consoleSpy.error;

		log.error('test error');

		global.console.error = originalError;

		expect(consoleSpy.error).toHaveBeenCalledWith('[Viwoods]', 'test error');
	});
});
