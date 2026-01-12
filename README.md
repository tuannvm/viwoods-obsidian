# Viwoods Notes Importer

[![CI Status](https://img.shields.io/github/actions/workflow/status/tuannvm/viwoods-obsidian/ci?branch=main&logo=github-actions&logoColor=white)](https://github.com/tuannvm/viwoods-obsidian/actions/workflows/ci.yml)
[![Latest Release](https://img.shields.io/github/v/release/tuannvm/viwoods-obsidian?display_name=tag&logo=Dropbox&logoColor=white&color=blue)](https://github.com/tuannvm/viwoods-obsidian/releases/latest)
[![License: 0BSD](https://img.shields.io/github/license/tuannvm/viwoods-obsidian?color=green&logo=gitbook&logoColor=white)](LICENSE)
[![Obsidian Compatible](https://img.shields.io/badge/Obsidian-Compatible-%23483699?logo=obsidian&logoColor=white)](https://obsidian.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=white)](https://www.typescriptlang.org/)

Import Viwoods `.note` files directly into Obsidian with support for handwritten notes, audio recordings, and stroke data conversion to SVG.

## Features

- **Import Viwoods notes** - Reads proprietary Viwoods `.note` file format
- **Handwritten notes** - Converts stroke data to SVG for viewing in Obsidian
- **Audio recordings** - Extracts and saves audio recordings from notes
- **Page thumbnails** - Generates page images for quick preview
- **Change detection** - Uses image hashes to detect modified pages
- **PDF export** - Export pages to PDF using jsPDF
- **One-to-one sync** - Auto-import mode that preserves folder structure

## Quick Start

### Installation

#### Option 1: Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/tuannvm/viwoods-obsidian/releases)
2. Extract `main.js`, `manifest.json`, and `styles.css` to:
   ```
   <Vault>/.obsidian/plugins/viwoods-notes-importer/
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
- `Export Viwoods book` - Export entire book data
- `Export page to PDF` - Generate PDF for a page
- `Reset book hashes` - Reset import tracking

## Configuration

Configure folders and import behavior in **Settings → Viwoods Notes Importer**:
- Notes folder location
- Images, audio, strokes, and PDF folders
- Auto-sync settings and folder structure preferences

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
