# Viwoods Obsidian

[![CI Status](https://img.shields.io/github/actions/workflow/status/tuannvm/viwoods-obsidian/ci?branch=main&logo=github-actions&logoColor=white)](https://github.com/tuannvm/viwoods-obsidian/actions/workflows/ci.yml)
[![Latest Release](https://img.shields.io/github/v/release/tuannvm/viwoods-obsidian?display_name=tag&logo=Dropbox&logoColor=white&color=blue)](https://github.com/tuannvm/viwoods-obsidian/releases/latest)
[![License: MIT](https://img.shields.io/github/license/tuannvm/viwoods-obsidian?color=blue&logo=gitbook&logoColor=white)](LICENSE)
[![Obsidian Compatible](https://img.shields.io/badge/Obsidian-Compatible-%23483699?logo=obsidian&logoColor=white)](https://obsidian.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=white)](https://www.typescriptlang.org/)

An Obsidian plugin that syncs Viwoods `.note` files into your vault. Converts handwritten strokes to SVG, extracts audio recordings, and includes auto-sync for real-time updates.

## Features

- **Auto-sync** - Watch Viwoods export folder for changes and auto-import to Obsidian (desktop only)
- **Handwritten notes** - Converts Viwoods stroke data to clean SVG for viewing/editing
- **Audio recordings** - Extracts and embeds audio recordings from notes
- **Change detection** - Smart image hashing detects modified pages for selective updates
- **One-to-one mapping** - Preserves Viwoods folder structure in your vault
- **Drag & drop** - Import individual `.note` files by dropping them into Obsidian
- **Cross-platform viewing** - Imported notes (Markdown, SVG, PNG, MP3) work on all platforms including mobile

### Screenshots

<p align="center">
  <b>Plugin Settings</b><br>
  <img src="img/screenshot1.jpg" alt="Plugin Settings" width="600"/>
</p>

<p align="center">
  <b>Imported Note (with handwriting and audio)</b><br>
  <img src="img/screenshot2.jpg" alt="Imported Note Example" width="600"/>
</p>

<p align="center">
  <b>Command Palette</b><br>
  <img src="https://github.com/user-attachments/assets/e5be6dc1-6bc9-481d-bda1-bdca289b8f00" alt="Command Palette" width="600"/>
</p>

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

**Two ways to import notes:**

1. **Drag & Drop** - Drop individual `.note` files anywhere into Obsidian
2. **Auto-Sync** - Enable in settings to automatically watch a folder for changes

## Configuration

Configure sync behavior in **Settings → Viwoods Obsidian**:

### Basic Settings
| Setting | Description |
|---------|-------------|
| **Source folder** | Path to folder containing your Viwoods `.note` files (outside the vault) |
| **Destination folder** | Root folder for imported notes in your vault |
| **Include metadata** | Add frontmatter metadata to notes (YAML frontmatter with timestamps and book info) |

### Auto-Sync (Desktop Only)
| Setting | Description |
|---------|-------------|
| **Enable auto-sync** | Automatically watch the source folder for changes |
| **Polling interval** | How often to check for changes (1-60 minutes) |
| **Sync on startup** | Check for changes when Obsidian starts |
| **Show notifications** | Show notifications when changes are detected |

### OCR (macOS Only)
| Setting | Description |
|---------|-------------|
| **Enable OCR** | Extract handwritten text using Apple Vision (macOS desktop; requires Swift/Xcode Command Line Tools) |
| **OCR Languages** | Comma-separated language codes (e.g., en-US, zh-Hans) |
| **OCR Confidence Threshold** | Minimum confidence for OCR results (0.0–1.0) |

### Debug
| Setting | Description |
|---------|-------------|
| **Enable debug logging** | Enable debug logging to console (for troubleshooting) |

> **Note:** Auto-sync requires desktop Obsidian. OCR is macOS-only and requires Swift/Xcode Command Line Tools. Imported notes can be viewed on any platform (desktop/mobile).

## Cloud Sync Integration

### Google Drive

Viwoods can export notes to Google Drive, making them accessible across devices. To sync with Obsidian:

1. **Install Google Drive Desktop** (Google Drive for desktop)
   - Download from https://www.google.com/drive/download/
   - Sign in and sync your Viwoods folder to your local filesystem

2. **Configure Viwoods Export**
   - In Viwoods app, set the export location to your Google Drive folder
   - Typical path: `~/Google Drive/My Drive/Viwoods/` or similar

3. **Set Up Obsidian Auto-Sync**
   - **Source folder path**: Point to your local Google Drive sync folder
     - Example: `/Users/<username>/Google Drive/My Drive/Viwoods/`
   - **Enable auto-sync**: Turn on to watch for changes
   - **Polling interval**: Set to 1-5 minutes for near real-time sync

4. **How It Works**
   - When Viwoods exports notes to Google Drive → Google Drive desktop syncs locally
   - Obsidian plugin detects changes → Auto-imports to your vault
   - Works bidirectionally: changes on any device sync through Google Drive

### Viwoods Cloud Backup

Viwoods (v3.6+) supports built-in sync to Google Drive, OneDrive, and Dropbox. See the [official sync guide](https://viwoods.com/blogs/paper-tablet/file-sync-and-share-across-devices) and this [community tutorial](https://www.reddit.com/r/viwoods/comments/1od4690/seamless_automatic_synchronization_across_devices/).

#### Quick Setup with Obsidian

1. **Enable Viwoods Cloud Sync**
   - Viwoods Settings → Cloud Sync → Link account (Google Drive/OneDrive/Dropbox)
   - Select notebooks to sync, enable auto-sync

2. **Install Desktop Sync Client**
   - [Google Drive](https://www.google.com/drive/download/) | [OneDrive](https://www.microsoft.com/en-us/microsoft-365/onedrive/download) | [Dropbox](https://www.dropbox.com/install)

3. **Configure Plugin Auto-Sync**
   - **Source folder path**: Point to your local cloud sync folder
     - Google Drive: `~/Google Drive/My Drive/Viwoods/`
     - OneDrive: `~/OneDrive/Viwoods/` (macOS) or `C:\Users\<user>\OneDrive\Viwoods\` (Windows)
     - Dropbox: `~/Dropbox/Apps/Viwoods/`
   - **Enable auto-sync**: ON
   - **Polling interval**: 1-5 minutes

### Platform Support

| Platform | Auto-Sync | Viewing |
|----------|-----------|---------|
| **Windows/macOS/Linux** | Full support | Full |
| **iOS/Android** | N/A | View imported notes |

### Troubleshooting Cloud Sync

- **Sync delays**: Google Drive desktop may take 30-60 seconds to sync files after Viwoods export
- **Path issues**: Use absolute paths (e.g., `/Users/...` on macOS, `C:\Users\...` on Windows)
- **Permissions**: Ensure Obsidian has read access to the cloud sync folder
- **Network issues**: Auto-sync requires internet connection for cloud providers to sync locally

## Documentation

- [Architecture](docs/architecture.md) - Plugin architecture and data structures
- [Development](docs/development.md) - Build system, coding conventions, and testing
- [Contributing](docs/contributing.md) - Contribution guidelines
- [Releases](docs/releases.md) - Release process and versioning
- [OCR](docs/ocr.md) - OCR feature details and requirements

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

MIT License
