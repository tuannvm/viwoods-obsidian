#!/usr/bin/env swift

/*
 * Viwoods OCR - Apple Vision Framework Text Recognition
 *
 * Compile: swiftc -o ocr ocr.swift -framework Vision -framework Foundation -framework AppKit
 * Usage: ./ocr <image_path> [languages] [confidence_threshold]
 *
 * Example:
 *   ./ocr /path/to/image.png "en-US,zh-Hans" 0.5
 */

import Foundation
import Vision
import AppKit
import CoreImage
import CoreImage.CIFilterBuiltins

// MARK: - OCR Result Model

struct OCRResult: Codable {
    let success: Bool
    let text: String
    let confidence: Double
    let errors: [String]
    let processingTimeMs: Double
}

// MARK: - Main

func main() {
    let arguments = CommandLine.arguments
    let startTime = Date()

    guard arguments.count >= 2 else {
        outputError("Usage: ocr <image_path> [languages] [confidence_threshold]")
        return
    }

    let imagePath = arguments[1]
    let languagesArg = arguments.count > 2 ? arguments[2] : "en-US"
    let confidenceThreshold = arguments.count > 3 ? Double(arguments[3]) ?? 0.5 : 0.5
    let languages = languagesArg.split(separator: ",").map { String($0).trimmingCharacters(in: .whitespaces) }

    // Check if image exists
    let fileManager = FileManager.default
    guard fileManager.fileExists(atPath: imagePath) else {
        outputError("Image file not found: \(imagePath)")
        return
    }

    // Load image using NSImage
    guard let nsImage = NSImage(contentsOfFile: imagePath) else {
        outputError("Failed to load NSImage from file")
        return
    }

    // Convert to CGImage - try different methods
    var cgImage: CGImage?

    // Method 1: Using proposed rect
    cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil)

    // Method 2: Using representations
    if cgImage == nil {
        if let rep = nsImage.representations.first as? NSBitmapImageRep {
            cgImage = rep.cgImage
        }
    }

    // Method 3: Using TIFF data
    if cgImage == nil {
        if let tiffData = nsImage.tiffRepresentation,
           let source = CGImageSourceCreateWithData(tiffData as CFData, nil) {
            cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil)
        }
    }

    guard let finalCGImage = cgImage else {
        outputError("Failed to get CGImage from NSImage")
        return
    }

    let preprocessedImage = preprocessImage(finalCGImage) ?? finalCGImage

    // Perform OCR
    performOCR(
        on: preprocessedImage,
        languages: languages,
        confidenceThreshold: confidenceThreshold,
        startTime: startTime
    )
}

func preprocessImage(_ cgImage: CGImage) -> CGImage? {
    let context = CIContext()
    var image = CIImage(cgImage: cgImage)

    // Flatten transparency onto white background
    let white = CIImage(color: CIColor(red: 1, green: 1, blue: 1, alpha: 1)).cropped(to: image.extent)
    image = image.composited(over: white)

    // Upscale 2x (improves OCR on thin handwriting)
    let scaleFilter = CIFilter.lanczosScaleTransform()
    scaleFilter.inputImage = image
    scaleFilter.scale = 2.0
    scaleFilter.aspectRatio = 1.0
    if let scaled = scaleFilter.outputImage {
        image = scaled
    }

    // Grayscale + contrast/brightness
    let color = CIFilter.colorControls()
    color.inputImage = image
    color.saturation = 0
    color.contrast = 2.0
    color.brightness = 0.1
    if let output = color.outputImage {
        image = output
    }

    // Exposure boost
    let exposure = CIFilter.exposureAdjust()
    exposure.inputImage = image
    exposure.ev = 0.7
    if let output = exposure.outputImage {
        image = output
    }

    // Sharpen strokes
    let sharpen = CIFilter.unsharpMask()
    sharpen.inputImage = image
    sharpen.radius = 2.0
    sharpen.intensity = 0.5
    if let output = sharpen.outputImage {
        image = output
    }

    return context.createCGImage(image, from: image.extent)
}

func performOCR(
    on cgImage: CGImage,
    languages: [String],
    confidenceThreshold: Double,
    startTime: Date
) {
    let request = VNRecognizeTextRequest()

    // Configure for handwritten text
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true

    // Set recognition languages
    let validLanguages = languages.filter { lang in
        // Common supported languages
        ["en-US", "en-GB", "en", "zh-Hans", "zh-Hant", "zh", "fr-FR", "de-DE", "es-ES", "it-IT", "ja", "ko"].contains(lang)
    }

    if validLanguages.isEmpty {
        request.recognitionLanguages = ["en-US"]
    } else {
        request.recognitionLanguages = validLanguages
    }

    var recognizedBlocks: [(text: String, confidence: Float, y: CGFloat)] = []

    // Create handler and perform request
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

    do {
        try handler.perform([request])

        guard let results = request.results as? [VNRecognizedTextObservation], !results.isEmpty else {
            // No text found - return success with empty text
            let processingTime = Date().timeIntervalSince(startTime) * 1000
            let result = OCRResult(
                success: true,
                text: "",
                confidence: 0.0,
                errors: [],
                processingTimeMs: processingTime
            )
            output(result)
            return
        }

        for observation in results {
            guard let topCandidate = observation.topCandidates(1).first else { continue }

            let confidence = topCandidate.confidence
            if Float(confidenceThreshold) <= confidence {
                recognizedBlocks.append((
                    text: topCandidate.string,
                    confidence: confidence,
                    y: observation.boundingBox.origin.y
                ))
            }
        }

    } catch {
        outputError("Failed to perform OCR: \(error.localizedDescription)")
        return
    }

    // Sort results: Vision coordinates have origin at bottom-left
    let sortedBlocks = recognizedBlocks.sorted { a, b in
        if abs(a.y - b.y) < 0.02 {
            return false
        }
        return a.y > b.y
    }

    let text = sortedBlocks.map { $0.text }.joined(separator: "\n")
    let avgConfidence: Double
    if sortedBlocks.isEmpty {
        avgConfidence = 0.0
    } else {
        let total = sortedBlocks.reduce(0.0) { $0 + Double($1.confidence) }
        avgConfidence = total / Double(sortedBlocks.count)
    }

    let processingTime = Date().timeIntervalSince(startTime) * 1000

    let result = OCRResult(
        success: true,
        text: text,
        confidence: avgConfidence,
        errors: [],
        processingTimeMs: processingTime
    )

    output(result)
}

func outputError(_ message: String) {
    let result = OCRResult(
        success: false,
        text: "",
        confidence: 0.0,
        errors: [message],
        processingTimeMs: 0.0
    )
    output(result)
}

func output(_ result: OCRResult) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

    if let data = try? encoder.encode(result),
       let jsonString = String(data: data, encoding: .utf8) {
        print(jsonString)
    } else {
        print("{\"success\":false,\"text\":\"\",\"confidence\":0.0,\"errors\":[\"Failed to encode result\"],\"processingTimeMs\":0.0}")
    }
}

// Run main
main()
