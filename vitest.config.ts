import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	resolve: {
		alias: {
			'obsidian': '/tests/mocks/obsidian.ts'
		}
	},
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./tests/setup.ts'],
		include: ['**/*.test.ts'],
		exclude: ['node_modules', 'dist', 'main.js', 'tests/fixtures'],
		coverage: {
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'node_modules', 'tests']
		}
	},
	plugins: [tsconfigPaths()]
});
