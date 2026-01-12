# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Type

This is an **Obsidian Community Plugin** - "Viwoods Notes Importer" - that imports `.note` files from Viwoods note-taking software into Obsidian. It processes handwritten notes (converts strokes to SVG), audio recordings, page thumbnails, and supports PDF export.

## Quick Reference

```bash
npm install          # Install dependencies
npm run dev          # Development (watch mode)
npm run build        # Production build
npm run version      # Bump version
npx eslint main.ts   # Lint
```

## Documentation

Technical details are in the `docs/` directory:
- [docs/architecture.md](docs/architecture.md) - Plugin architecture, data structures, components
- [docs/development.md](docs/development.md) - Build system, coding conventions, testing
- [docs/contributing.md](docs/contributing.md) - Contribution guidelines
- [docs/releases.md](docs/releases.md) - Release process and versioning

## Key Constraints

### Build System
- **esbuild** bundles TypeScript → `main.js`
- `obsidian` and editor modules are external (not bundled)
- Output must be at plugin root: `main.js`, `manifest.json`, `styles.css`
- No runtime dependencies (everything bundled or loaded dynamically)

### External Libraries
- **JSZip** and **jsPDF** are loaded via script tags, not npm bundles
- Check for `window.JSZip` and `window.jspdf` before use

### Manifest Rules
- `id`: `viwoods-obsidian` (never change after release)
- `isDesktopOnly`: `false` (supports mobile)
- Version must match git tag when releasing (no `v` prefix)

## Code Organization

The entire plugin is currently in `main.ts` (~26K tokens). For future refactoring, see the recommended module structure in [docs/development.md](docs/development.md#file-organization).

## References

- Obsidian API: https://docs.obsidian.md
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
