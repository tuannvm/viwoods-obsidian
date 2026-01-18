# OCR

## Overview

The OCR feature extracts handwritten text from Viwoods page images using Apple Vision on macOS. It runs locally and does not upload images to any external service.

## Platform Requirements

- **macOS desktop only**
- **Swift toolchain required** (Xcode Command Line Tools)

## How It Works

1. The plugin writes an embedded Swift script to a temporary file.
2. The Swift script loads the image and pre-processes it to improve handwriting recognition.
3. The script runs Apple Vision’s `VNRecognizeTextRequest` with handwritten text recognition.
4. The Swift script returns JSON (text, confidence, processing time) which the plugin inserts into the note.

## Preprocessing Steps

The Swift script applies these steps before OCR:

1. Flatten transparency onto a white background
2. Upscale 2× (Lanczos)
3. Convert to grayscale
4. Boost contrast and brightness
5. Apply exposure adjustment
6. Apply unsharp mask to sharpen strokes

## Settings

- **Enable OCR**: Turns OCR on/off
- **OCR Languages**: Comma-separated language codes (e.g., `en-US, zh-Hans`)
- **OCR Confidence Threshold**: Minimum confidence (0.0–1.0) for accepted text

## Troubleshooting

- **No text detected**: Handwriting may be too light. Try increasing note contrast or re-exporting with darker strokes.
- **Swift not found**: Install Xcode Command Line Tools: `xcode-select --install`
- **Non-macOS**: OCR is disabled on Windows/Linux/mobile.

## Key Files

- `src/services/ocr-service.ts`: writes the embedded script and invokes `swift`
- `src/services/ocr-swift-embed.ts`: embedded Swift OCR script
- `scripts/ocr/ocr.swift`: standalone Swift script (for local testing)
