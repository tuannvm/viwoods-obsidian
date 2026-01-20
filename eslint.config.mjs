import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
// @ts-expect-error - @microsoft/eslint-plugin-sdl doesn't provide TypeScript types
import sdl from "@microsoft/eslint-plugin-sdl";

export default tseslint.config(
	{
		ignores: [
			"node_modules/**",
			"dist/**",
			"main.js",
			"main.js.map",
			"tests/**",
			"trash/**",
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
		plugins: {
			obsidianmd: obsidianmd,
		},
	},
	...obsidianmd.configs.recommended,
	...sdl.configs.recommended,
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
			"obsidianmd/ui/sentence-case": ["error", {
				"brands": ["Viwoods", "JSZip", "jsPDF", "Windows", "Linux", "Obsidian", "macOS", "Gemini", "OCR", "Apple Vision", "Swift", "Xcode"],
				"ignoreRegex": ["^/.+", "^[A-Z]:\\\\.+", "^. to ."]
			}],  // Temporarily enabled to verify plugin review fixes
			"obsidianmd/no-static-styles-assignment": "off",
			"obsidianmd/settings-tab/no-manual-html-headings": "off",
			"obsidianmd/platform": "off",
			"obsidianmd/prefer-file-manager-trash-file": "off",

			// Security rules from @microsoft/eslint-plugin-sdl are enabled via obsidianmd.configs.recommended
			// Safe innerHTML uses are documented with eslint-disable-next-line comments

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
