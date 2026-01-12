import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default tseslint.config(
	{
		ignores: [
			"node_modules/**",
			"dist/**",
			"main.js",
			"main.js.map",
			"tests/**",
		],
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				process: "readonly",
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.js',
						'manifest.json',
						'vitest.config.ts'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		rules: {
			// TypeScript - Disable strict type checking rules (be pragmatic)
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-misused-promises": "off",
			"@typescript-eslint/no-unnecessary-type-assertion": "off",
			"@typescript-eslint/no-non-null-assertion": "off",

			// Obsidian-specific - Be pragmatic
			"obsidianmd/ui/sentence-case": "off",
			"obsidianmd/no-static-styles-assignment": "off",
			"obsidianmd/settings-tab/no-manual-html-headings": "off",
			"obsidianmd/platform": "off",
			"obsidianmd/prefer-file-manager-trash-file": "off",

			// Security - Disable strict rules
			"@microsoft/sdl/no-inner-html": "off",

			// Dependencies
			"depend/ban-dependencies": "off",

			// Unused eslint-disable comments
			"@typescript-eslint/no-unused-disable-comments": "off",

			// Allow console and require for practical use
			"no-console": "off",
			"@typescript-eslint/no-require-imports": "off",
			"no-undef": "off",
		},
	},
);
