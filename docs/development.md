# Development

## Environment

- **Node.js**: 20.x or 22.x (see `.github/workflows/ci.yml`)
- **Package manager**: npm
- **Bundler**: esbuild
- **Language**: TypeScript (strict mode)

## Quick Start

```bash
# Install dependencies
npm install

# Development (watches for changes, rebuilds automatically)
npm run dev

# Production build (typechecks + bundles)
npm run build

# Lint
npm run lint

# Run tests
npm test
```

## Build System

The plugin uses **esbuild** to bundle TypeScript into `main.js`:
- Source: `src/main.ts` (and all imports in `src/`)
- Output: `main.js` (at plugin root)
- External: `obsidian` and editor modules (not bundled)

### esbuild Configuration

Located in `esbuild.config.mjs`:
- Bundles all dependencies into `main.js`
- Excludes `obsidian` API (provided by Obsidian runtime)
- Supports both development (watch mode) and production builds
- Generates source maps for debugging

## File Organization

### Current Structure

The plugin is organized into modules under `src/`:

```
src/
├── main.ts                           # Plugin entry point and lifecycle
├── types.ts                          # All type definitions
├── settings.ts                       # Settings management
├── commands/                         # Command implementations
│   ├── registry.ts                   # Command registration
│   ├── export-pdf-command.ts         # PDF export command
│   └── reset-hashes-command.ts       # Hash reset command
├── services/                         # Core business logic
│   ├── importer-service.ts           # Main import orchestration
│   ├── import-workflow.ts            # Import workflow logic
│   ├── one-to-one-importer.ts        # One-to-one folder mapping
│   ├── page-processor.ts             # Page data processing
│   ├── viewer-service.ts             # SVG viewer management
│   └── auto-sync-service.ts          # Auto-sync/polling
├── ui/                               # User interface components
│   ├── modals.ts                     # Modal dialogs
│   ├── sync-modals.ts                # Sync-related modals
│   └── import-notice-modal.ts        # Import notifications
└── utils/                            # Utility functions
    ├── constants.ts                  # Constants and defaults
    ├── file-utils.ts                 # File operations
    ├── image-utils.ts                # Image processing
    ├── external-libs.ts              # External library loaders
    ├── external-file-access.ts       # File system access
    ├── logger.ts                     # Debug logging
    ├── pen-mappings.ts               # Pen color/thickness mappings
    ├── pen-mapping-helpers.ts        # Pen mapping utilities
    ├── pdf-generator.ts              # PDF generation
    ├── platform.ts                   # Platform detection
    └── svg-generator.ts              # SVG generation from strokes
```

### Module Responsibilities

**`main.ts`**: Plugin lifecycle only (onload, onunload, command registration)

**`types.ts`**: All TypeScript interfaces and types

**`settings.ts`**: Settings UI and persistence

**`commands/`**: Individual command handlers

**`services/`**: Business logic and data processing

**`ui/`**: Modal dialogs and UI components

**`utils/`**: Reusable utility functions

## Coding Conventions

- TypeScript strict mode enabled
- Use Obsidian API types from `obsidian` package
- Declare global window extensions for external libs in `utils/external-libs.ts`
- Keep each file focused on a single responsibility
- Use `async/await` over promise chains
- Handle errors gracefully with try/catch
- Use relative imports with `.js` extension (required for esbuild)

### Import Style

```typescript
// Relative imports
import { ViwoodsSettings } from '../types.js';
import { DEFAULT_SETTINGS } from './utils/constants.js';

// External imports
import { Plugin, Notice } from 'obsidian';
```

## Linting

```bash
# Lint all source files
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Type-check only
npx tsc -noEmit
```

### ESLint Configuration

The project uses `eslint.config.mjs` with the following plugins:
- `@eslint/js` - JavaScript/TypeScript rules
- `typescript-eslint` - TypeScript-specific rules
- `eslint-plugin-jsdoc` - JSDoc comment enforcement

Key rules:
- Use `// single-line` comments, not `/* block */`
- Enforce JSDoc comments on exported functions
- No unused variables

## Testing

```bash
# Run tests (vitest)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

Test files are located in `tests/` and use the vitest framework.

## Manual Install

```bash
# Copy to Obsidian plugin folder
cp main.js manifest.json styles.css <vault>/.obsidian/plugins/viwoods-obsidian/

# Or use symbolic link for development
ln -s /path/to/repo/main.js <vault>/.obsidian/plugins/viwoods-obsidian/main.js
```

Then reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Mobile Compatibility

- Plugin supports mobile (`isDesktopOnly: false` in `manifest.json`)
- Avoid Node/Electron APIs for mobile compatibility
- Be mindful of memory and storage constraints
- Test on iOS and Android before releases
- Use File System Access API for cross-platform file access

## OCR (macOS Only)

OCR runs locally using Apple Vision via an embedded Swift script. It requires macOS desktop and the Swift toolchain (Xcode Command Line Tools).
## Performance Guidelines

- Keep startup light
- Defer heavy work until needed (lazy loading)
- Avoid long-running tasks during `onload`
- Use batched processing for large imports
- Debounce/throttle expensive operations (e.g., auto-sync polling)
- Cache expensive computations (e.g., image hashes)

## Cleanup & Safety

Always use `register*` helpers for cleanup to prevent memory leaks:

```typescript
// App events
this.registerEvent(this.app.workspace.on("file-open", handler));

// DOM events
this.registerDomEvent(window, "resize", handler);

// Intervals/timeouts
this.registerInterval(window.setInterval(handler, 1000));

// Cleanup is automatic when plugin unloads
```

## Security & Privacy

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**:

- Default to local/offline operation
- No hidden telemetry (require opt-in if used)
- Never execute remote code or fetch/eval scripts
- Minimize scope: read/write only what's necessary
- Respect user privacy
- Avoid deceptive patterns, ads, or spammy notifications

### External Library Loading

The plugin loads JSZip and jsPDF from CDN URLs defined in `utils/external-libs.ts`. These are loaded only when needed (lazy loading) to reduce initial load time.

## UX & Copy Guidelines

- Prefer sentence case for headings, buttons, titles
- Use clear, action-oriented imperatives
- Use **bold** for literal UI labels
- Use arrow notation for navigation: **Settings → Community plugins**
- Keep in-app strings short, consistent, jargon-free
- Provide helpful error messages with actionable guidance

## Debugging

Enable debug mode in plugin settings to see detailed logs in the Obsidian developer console (Ctrl+Shift+I on desktop).

Logs are output via `utils/logger.ts`:
```typescript
debugLog('message', data);  // Only logs when debug mode is enabled
```

## Versioning

Use `npm run version` to bump the version. This updates:
- `manifest.json` (version field)
- `versions.json` (for plugin version tracking)

Version numbers follow semantic versioning (MAJOR.MINOR.PATCH).
