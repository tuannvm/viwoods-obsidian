// utils/logger.ts - Debug logging utility for Viwoods Obsidian Plugin

/**
 * Debug logging utility that can be toggled at runtime.
 * When debug mode is disabled, debug() calls are no-ops for performance.
 */

let DEBUG_MODE = false;

/**
 * Set the debug mode state
 * @param enabled - Whether debug logging should be enabled
 */
export function setDebugMode(enabled: boolean): void {
	DEBUG_MODE = enabled;
}

/**
 * Get the current debug mode state
 */
export function getDebugMode(): boolean {
	return DEBUG_MODE;
}

/**
 * Logging interface with debug and error methods
 */
export const log = {
	/**
	 * Log debug messages (only when debug mode is enabled)
	 * @param args - Arguments to log
	 */
	debug: (...args: unknown[]): void => {
		if (DEBUG_MODE) {
			console.debug('[Viwoods]', ...args);
		}
	},

	/**
	 * Log info messages (only when debug mode is enabled)
	 * @param args - Arguments to log
	 */
	info: (...args: unknown[]): void => {
		if (DEBUG_MODE) {
			console.info('[Viwoods]', ...args);
		}
	},

	/**
	 * Log error messages (always logged, regardless of debug mode)
	 * @param args - Arguments to log
	 */
	error: (...args: unknown[]): void => {
		console.error('[Viwoods]', ...args);
	},

	/**
	 * Log warning messages (always logged, regardless of debug mode)
	 * @param args - Arguments to log
	 */
	warn: (...args: unknown[]): void => {
		console.warn('[Viwoods]', ...args);
	}
};
