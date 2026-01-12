// tests/setup.ts - Test setup for Vitest

import { vi } from 'vitest';

// Clear mocks before each test
beforeEach(() => {
	vi.clearAllMocks();
});
