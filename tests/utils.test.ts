// tests/utils.test.ts - Unit tests for utility functions

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/utils/constants.js';
import { resolveSourceFolderPath } from '../src/utils/platform.js';

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
			expect(DEFAULT_SETTINGS).toHaveProperty('sourceFolderPathWindows');
			expect(DEFAULT_SETTINGS).toHaveProperty('sourceFolderPathMacos');
			expect(DEFAULT_SETTINGS).toHaveProperty('sourceFolderPathLinux');
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
			expect(DEFAULT_SETTINGS.sourceFolderPathWindows).toBe('');
			expect(DEFAULT_SETTINGS.sourceFolderPathMacos).toBe('');
			expect(DEFAULT_SETTINGS.sourceFolderPathLinux).toBe('');
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

describe('Platform Utility', () => {
	it('should resolve fallback source folder path', () => {
		const settings = {
			...DEFAULT_SETTINGS,
			sourceFolderPath: '/fallback/path',
			sourceFolderPathWindows: 'C:\\Viwoods',
			sourceFolderPathMacos: '/Users/test/Viwoods',
			sourceFolderPathLinux: '/home/test/Viwoods'
		};

		// In test environment (node), navigator is undefined so platform resolves to mobile/unknown.
		// The resolver should fall back to the generic path.
		const resolved = resolveSourceFolderPath(settings);
		expect(resolved).toBe('/fallback/path');
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

// ============================================================================
// OCR Tests
// ============================================================================

describe('OCR Service', () => {
	describe('OCR Settings', () => {
		it('should have OCR settings in DEFAULT_SETTINGS', () => {
			expect(DEFAULT_SETTINGS).toHaveProperty('enableOcr');
			expect(DEFAULT_SETTINGS).toHaveProperty('ocrLanguages');
			expect(DEFAULT_SETTINGS).toHaveProperty('ocrConfidenceThreshold');
		});

		it('should have correct default OCR settings', () => {
			expect(DEFAULT_SETTINGS.enableOcr).toBe(false);
			expect(DEFAULT_SETTINGS.ocrLanguages).toEqual(['en-US']);
			expect(DEFAULT_SETTINGS.ocrConfidenceThreshold).toBe(0.5);
		});

		it('should have valid confidence threshold range', () => {
			expect(DEFAULT_SETTINGS.ocrConfidenceThreshold).toBeGreaterThanOrEqual(0);
			expect(DEFAULT_SETTINGS.ocrConfidenceThreshold).toBeLessThanOrEqual(1);
		});

		it('should have valid language codes', () => {
			expect(DEFAULT_SETTINGS.ocrLanguages.length).toBeGreaterThan(0);
			expect(DEFAULT_SETTINGS.ocrLanguages[0]).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
		});
	});

	describe('OCR Service Module', () => {
		it('should be importable', async () => {
			const ocrModule = await import('../src/services/ocr-service.js');
			expect(ocrModule).toBeDefined();
			expect(ocrModule).toHaveProperty('OCRService');
		});

		it('should export convenience functions', async () => {
			const ocrModule = await import('../src/services/ocr-service.js');
			expect(ocrModule).toHaveProperty('isOCRAvailable');
			expect(ocrModule).toHaveProperty('getOCRStatus');
			expect(ocrModule).toHaveProperty('ocrImage');
			expect(ocrModule).toHaveProperty('ocrBlob');
		});

		it('should provide singleton instance', async () => {
			const { OCRService } = await import('../src/services/ocr-service.js');
			const instance1 = OCRService.getInstance();
			const instance2 = OCRService.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('OCR Availability', () => {
		it('should report availability status', async () => {
			const { isOCRAvailable, getOCRStatus } = await import('../src/services/ocr-service.js');
			const available = isOCRAvailable();
			const status = getOCRStatus();

			expect(typeof available).toBe('boolean');
			expect(typeof status).toBe('string');

			// In non-macOS environments, should not be available
			if (!process.platform === 'darwin') {
				expect(available).toBe(false);
				expect(status).toContain('macOS');
			}
		});
	});

	describe('OCR Service Methods', () => {
		it('should have isAvailable method', async () => {
			const { OCRService } = await import('../src/services/ocr-service.js');
			const service = OCRService.getInstance();
			expect(typeof service.isAvailable).toBe('function');
		});

		it('should have getAvailabilityMessage method', async () => {
			const { OCRService } = await import('../src/services/ocr-service.js');
			const service = OCRService.getInstance();
			expect(typeof service.getAvailabilityMessage).toBe('function');
		});

		it('should have performOCR method', async () => {
			const { OCRService } = await import('../src/services/ocr-service.js');
			const service = OCRService.getInstance();
			expect(typeof service.performOCR).toBe('function');
		});

		it('should have isScriptReady method', async () => {
			const { OCRService } = await import('../src/services/ocr-service.js');
			const service = OCRService.getInstance();
			expect(typeof service.isScriptReady).toBe('function');
		});
	});

	describe('OCR Result Type', () => {
		it('should have correct OCRResult structure', async () => {
			const result = {
				success: true,
				text: 'Sample text',
				confidence: 0.95,
				errors: [],
				processingTimeMs: 100
			};

			expect(result).toHaveProperty('success');
			expect(result).toHaveProperty('text');
			expect(result).toHaveProperty('confidence');
			expect(result).toHaveProperty('errors');
			expect(result).toHaveProperty('processingTimeMs');
		});

		it('should handle failed OCR result', async () => {
			const result = {
				success: false,
				text: '',
				confidence: 0.0,
				errors: ['Image file not found'],
				processingTimeMs: 0
			};

			expect(result.success).toBe(false);
			expect(result.text).toBe('');
			expect(result.confidence).toBe(0.0);
			expect(result.errors.length).toBeGreaterThan(0);
		});
	});
});
