# Viwoods Sync

[![CI Status](https://img.shields.io/github/actions/workflow/status/tuannvm/viwoods-obsidian/ci?branch=main&logo=github-actions&logoColor=white)](https://github.com/tuannvm/viwoods-obsidian/actions/workflows/ci.yml)
[![Latest Release](https://img.shields.io/github/v/release/tuannvm/viwoods-obsidian?display_name=tag&logo=Dropbox&logoColor=white&color=blue)](https://github.com/tuannvm/viwoods-obsidian/releases/latest)
[![License: 0BSD](https://img.shields.io/github/license/tuannvm/viwoods-obsidian?color=green&logo=gitbook&logoColor=white)](LICENSE)
[![Obsidian Compatible](https://img.shields.io/badge/Obsidian-Compatible-%23483699?logo=obsidian&logoColor=white)](https://obsidian.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=white)](https://www.typescriptlang.org/)

An Obsidian plugin for importing and syncing Viwoods `.note` files with full support for handwritten strokes (SVG), audio recordings, and automatic folder watching for real-time sync.

## Features

- **Auto-sync** - Watch Viwoods export folder for changes and auto-import to Obsidian (desktop only)
- **Handwritten notes** - Converts Viwoods stroke data to clean SVG for viewing/editing
- **Audio recordings** - Extracts and embeds audio recordings from notes
- **Change detection** - Smart image hashing detects modified pages for selective updates
- **One-to-one mapping** - Preserves Viwoods folder structure in your vault
- **Drag & drop** - Import individual `.note` files by dropping them into Obsidian
- **Cross-platform viewing** - Imported notes (Markdown, SVG, PNG, MP3) work on all platforms including mobile

## Quick Start

### Installation

#### Option 1: Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/tuannvm/viwoods-obsidian/releases)
2. Extract `main.js`, `manifest.json`, and `styles.css` to:
   ```
   <Vault>/.obsidian/plugins/viwoods-obsidian/
   ```
3. Enable the plugin in **Settings → Community plugins**

#### Option 2: BRAT (Beta Auto-update)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) allows you to install beta versions directly from GitHub and get automatic updates.

1. Install BRAT from **Settings → Community plugins → Browse** (search for "BRAT")
2. Enable BRAT
3. Open Command Palette (Ctrl/Cmd + P) and run: **"BRAT: Add a beta plugin for testing"**
4. Paste this repository URL: `https://github.com/tuannvm/viwoods-obsidian`
5. The plugin will be installed and kept up-to-date automatically

To check for updates: run **"BRAT: Check for updates to all beta plugins"** in the Command Palette.

### Usage

Open the command palette (Ctrl/Cmd+P) and run:
- `Import Viwoods note` - Import a single `.note` file
- `Reset book hashes` - Reset import tracking

## Configuration

Configure sync behavior in **Settings → Viwoods Sync**:

### Basic Settings
- **Notes folder** - Where imported markdown files are stored
- **Include metadata** - Add YAML frontmatter with timestamps and book info
- **Include timestamps** - Add creation/modification dates to notes

### Output Format
- **Format** - Choose between PNG images, SVG strokes, or both
- **Background color** - Set background for generated images/SVG

### Auto-Sync (Desktop Only)
- **Enable auto-sync** - Watch Viwoods export folder for changes
- **Source folder path** - Path to Viwoods notes export directory
- **Polling interval** - How often to check for changes (1-60 minutes)
- **Sync on startup** - Automatically check for changes when Obsidian opens
- **Show notifications** - Display notices when changes are detected

> **Note:** Auto-sync requires desktop Obsidian. Imported notes can be viewed on any platform (desktop/mobile).

## Documentation

- [Architecture](docs/architecture.md) - Plugin architecture and data structures
- [Development](docs/development.md) - Build system, coding conventions, and testing
- [Contributing](docs/contributing.md) - Contribution guidelines
- [Releases](docs/releases.md) - Release process and versioning

## Roadmap

### Status: Beta 🧪

This plugin is currently in **beta development**. Use BRAT for easy installation and automatic updates.

### Upcoming Milestones

- [ ] **Stable Release** - Core functionality testing and bug fixes
- [ ] **Community Plugin Submission** - Submit to [Obsidian plugin directory](https://github.com/obsidianmd/obsidian-releases)
- [ ] **Marketplace Availability** - Once approved, the plugin will be searchable in **Settings → Community plugins → Browse**

### Post-Marketplace Goals

- [ ] Additional file format support
- [ ] Enhanced synchronization options
- [ ] Performance optimizations for large note collections

### Get Notified

- **Watch this repo** on GitHub for release notifications
- **Use BRAT** for automatic beta updates
- Check the [Releases page](https://github.com/tuannvm/viwoods-obsidian/releases) for changelogs

## Acknowledgments

This project is a fork of the original [viwoods-import-notes](https://github.com/farsonic/viwoods-import-notes) by [Francois Prowse](https://github.com/farsonic). The codebase has been significantly rewritten and diverged from the original to add new features, improve architecture, and align with modern Obsidian plugin development practices.

## License

BSD Zero Clause License (0BSD)
