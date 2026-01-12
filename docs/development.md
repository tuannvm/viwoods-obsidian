# Development

## Environment

- **Node.js**: LTS (18+ recommended)
- **Package manager**: npm
- **Bundler**: esbuild
- **Language**: TypeScript (strict mode)

## Setup

```bash
# Install dependencies
npm install

# Development (watches for changes, rebuilds automatically)
npm run dev

# Production build (typechecks + bundles)
npm run build

# Bump version (updates manifest.json and versions.json)
npm run version
```

## Build System

The plugin uses **esbuild** to bundle TypeScript into `main.js`:
- Source: `main.ts`
- Output: `main.js` (at plugin root)
- External: `obsidian` and editor modules (not bundled)

### esbuild Configuration

Located in `esbuild.config.mjs`:
- Bundles all dependencies into `main.js`
- Excludes `obsidian` API (provided by Obsidian runtime)
- Supports both development (watch mode) and production builds

## File Organization

### Current Structure (Single File)

The entire plugin is currently in `main.ts` (~26K tokens). This is not ideal for maintainability.

### Recommended Structure

For future refactoring, split into modules:

```
src/
  main.ts           # Plugin lifecycle only
  settings.ts       # Settings interface + defaults
  commands/         # Command implementations
  ui/              # Modals, views
  utils/           # Helpers, constants
  types.ts         # Type definitions
```

## Coding Conventions

- TypeScript strict mode enabled
- Use Obsidian API types from `obsidian` package
- Declare global window extensions for external libs
- Keep `main.ts` minimal (lifecycle only)
- Split files >200-300 lines into focused modules
- Use `async/await` over promise chains
- Handle errors gracefully

## Global Type Declarations

```typescript
declare global {
  interface Window {
    JSZip: any;
    jspdf: any;
  }
}
```

## Linting

```bash
# Install eslint globally
npm install -g eslint

# Lint main.ts
npx eslint main.ts

# Lint all source files (if using src/ directory)
npx eslint ./src/
```

## Testing

### Manual Install

```bash
# Copy to Obsidian plugin folder
cp main.js manifest.json styles.css <vault>/.obsidian/plugins/viwoods-obsidian/

# Or use symbolic link for development
ln -s /path/to/repo/main.js <vault>/.obsidian/plugins/viwoods-obsidian/main.js
```

Then reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Mobile Compatibility

- Plugin supports mobile (`isDesktopOnly: false`)
- Avoid Node/Electron APIs if you want mobile compatibility
- Be mindful of memory and storage constraints
- Test on iOS and Android before releases

## Performance Guidelines

- Keep startup light
- Defer heavy work until needed
- Avoid long-running tasks during `onload`
- Use lazy initialization
- Batch disk access
- Debounce/throttle expensive operations

## Cleanup & Safety

Always use `register*` helpers for cleanup:

```typescript
// App events
this.registerEvent(this.app.workspace.on("file-open", handler));

// DOM events
this.registerDomEvent(window, "resize", handler);

// Intervals
this.registerInterval(window.setInterval(handler, 1000));
```

## Security & Privacy

Follow Obsidian's **Developer Policies** and **Plugin Guidelines**:

- Default to local/offline operation
- No hidden telemetry (require opt-in if used)
- Never execute remote code or fetch/eval scripts
- Minimize scope: read/write only what's necessary
- Respect user privacy
- Avoid deceptive patterns, ads, or spammy notifications

## UX & Copy Guidelines

- Prefer sentence case for headings, buttons, titles
- Use clear, action-oriented imperatives
- Use **bold** for literal UI labels
- Use arrow notation for navigation: **Settings → Community plugins**
- Keep in-app strings short, consistent, jargon-free
