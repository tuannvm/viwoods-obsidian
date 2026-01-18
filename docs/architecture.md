# Architecture

## Overview

The Viwoods Obsidian is an Obsidian plugin that processes Viwoods `.note` files and converts them into Obsidian-compatible formats (Markdown, SVG, PNG, MP3, PDF).

## Plugin Structure

The plugin is organized into a modular `src/` directory structure:

```
src/
├── main.ts                           # Plugin entry point and lifecycle
├── types.ts                          # All type definitions
├── settings.ts                       # Settings management
├── commands/
│   ├── registry.ts                   # Command registration
│   ├── export-pdf-command.ts         # PDF export command
│   └── reset-hashes-command.ts       # Hash reset command
├── services/
│   ├── importer-service.ts           # Main import orchestration
│   ├── import-workflow.ts            # Import workflow logic
│   ├── one-to-one-importer.ts        # One-to-one folder mapping
│   ├── page-processor.ts             # Page data processing
│   ├── viewer-service.ts             # SVG viewer management
│   └── auto-sync-service.ts          # Auto-sync/polling
├── ui/
│   ├── modals.ts                     # Modal dialogs
│   ├── sync-modals.ts                # Sync-related modals
│   └── import-notice-modal.ts        # Import notifications
└── utils/
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

## Plugin Lifecycle

```typescript
class ViwoodsImporterPlugin extends Plugin {
  async onload()   // Register commands, load settings, setup auto-sync
  async onunload() // Cleanup services, intervals, event listeners
}
```

## Data Structures

### ImportManifest
Tracks imported pages with hashes, dates, and metadata:
```typescript
interface ImportManifest {
  bookName: string;
  totalPages: number;
  importedPages: {
    [pageNumber: number]: {
      fileName: string;
      importDate: string;
      imageHash: string;
      displayImageHash?: string;
      geminiProcessed: boolean;
      hasAudio?: boolean;
      lastModified?: string;
      size?: number;
      backgroundColor?: string;
    }
  };
  lastImport: string;
  sourceFile: string;
  version: string;
  history?: ImportHistory[];
}
```

### PageData
Raw page data extracted from Viwoods files:
```typescript
interface PageData {
  pageNum: number;
  image: {
    blob: Blob;
    hash: string;
  };
  stroke?: number[][];  // Stroke data: array of [x, y, timestamp] points
  audio?: {
    blob: Blob;
    originalName: string;
    name: string;
  };
}
```

### PageChange
Change detection result:
```typescript
interface PageChange {
  pageNum: number;
  type: 'new' | 'modified' | 'unchanged' | 'deleted';
  oldHash?: string;
  newHash?: string;
  hasAudioChange?: boolean;
}
```

## Commands

| Command ID | Description | Handler |
|------------|-------------|---------|
| `import-viwoods-note` | Main import flow from Viwoods `.note` files | `importer-service.ts` |
| `export-viwoods-book` | Export book data | `import-workflow.ts` |
| `export-page-to-pdf` | PDF generation per page | `export-pdf-command.ts` |
| `reset-book-hashes` | Reset import tracking | `reset-hashes-command.ts` |

## Key Services

### ImporterService (`services/importer-service.ts`)
Main orchestration for importing Viwoods files:
- Parses `.note` file format (proprietary ZIP-based format)
- Extracts images, stroke data, and audio
- Manages import manifests and change detection
- Coordinates page processing

### PageProcessor (`services/page-processor.ts`)
Processes individual pages:
- Generates PNG images from raw image data
- Converts stroke data to SVG format
- Extracts and saves audio recordings
- Calculates image hashes for change detection

### AutoSyncService (`services/auto-sync-service.ts`)
Background folder watching:
- Polls source folder at configured intervals
- Detects new and modified `.note` files
- Queues imports for detected changes
- Persists watcher state across plugin restarts

### ViewerService (`services/viewer-service.ts`)
SVG viewer management:
- Registers custom markdown code block renderer
- Handles stroke-to-SVG conversion display
- Manages viewer settings (smoothness, replay)

### OCRService (`services/ocr-service.ts`)
macOS-only OCR pipeline:
- Writes the embedded Swift script to a temp file
- Preprocesses images in Swift for better handwriting recognition
- Runs Apple Vision OCR via `swift` and returns JSON results

## Utilities

### SVG Generator (`utils/svg-generator.ts`)
Converts stroke data to SVG:
- `strokesToSVG()` - Main SVG generation from stroke points
- `smoothPoints()` - Point smoothing algorithm
- `smoothStrokeData()` - Stroke-based smoothing
- `getPenStyle()` - Pen color/width lookup

### PDF Generator (`utils/pdf-generator.ts`)
PDF export functionality:
- `exportSvgToPdf()` - Exports page as PDF using jsPDF
- `generatePdfFromStrokes()` - Direct stroke-to-PDF conversion

### External Libraries (`utils/external-libs.ts`)
Dynamic script loading:
- `loadJSZip()` - Loads JSZip from CDN
- `loadJsPDF()` - Loads jsPDF from CDN
- `hasJSZip()` - Checks if JSZip is available

### Pen Mappings (`utils/pen-mappings.ts`)
Pen color/thickness configuration:
- Maps Viwoods pen IDs to visual styles
- Supports pen type, color, thickness, and opacity

## Folder Structure

All folders are configurable in plugin settings:

```
<Vault>/
├── <notes folder>/      # Markdown files (default: Viwoods Notes)
├── <images folder>/     # Page images (PNG, default: Attachments)
├── <audio folder>/      # Audio recordings (MP3, default: Attachments)
├── <strokes folder>/    # SVG files (default: Attachments)
└── <pdf folder>/        # Generated PDFs (default: PDFs)
```

## Change Detection

Uses image hashing to detect modified pages:
1. Calculate perceptual hash of page image
2. Compare with stored hash in ImportManifest
3. Classify as: new, modified, unchanged, or deleted
4. Only update changed pages to avoid unnecessary writes

## External Libraries

- **JSZip** - Loaded via CDN (`https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js`)
- **jsPDF** - Loaded via CDN (`https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`)

Both are loaded dynamically as needed (not bundled) to keep plugin size small.

Global type declarations:
```typescript
declare global {
  interface Window {
    JSZip?: { loadAsync(data: Blob | string): Promise<JSZip> };
    jspdf?: { jsPDF: jsPDF };
  }
}
```

## Settings Persistence

Settings and import manifests are persisted using Obsidian's data API:
```typescript
this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
await this.saveData(this.settings);
```

## Cleanup & Safety

All event listeners use `register*` helpers for proper cleanup:
- `this.registerEvent()` - App events
- `this.registerDomEvent()` - DOM events
- `this.registerInterval()` - Intervals

This ensures all resources are cleaned up when the plugin is unloaded.
