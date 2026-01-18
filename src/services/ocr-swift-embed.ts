// services/ocr-swift-embed.ts - Embedded Swift OCR script

export const OCR_SWIFT_SCRIPT = `#!/usr/bin/env swift

/*
 * Viwoods OCR - Apple Vision Framework Text Recognition
 */

import Foundation
import Vision
import AppKit
import CoreImage
import CoreImage.CIFilterBuiltins

struct OCRResult: Codable {
    let success: Bool
    let text: String
    let confidence: Double
    let errors: [String]
    let processingTimeMs: Double
}

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

    let fileManager = FileManager.default
    guard fileManager.fileExists(atPath: imagePath) else {
        outputError("Image file not found: \\(imagePath)")
        return
    }

    guard let nsImage = NSImage(contentsOfFile: imagePath) else {
        outputError("Failed to load NSImage from file")
        return
    }

    var cgImage: CGImage?
    cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil)

    if cgImage == nil {
        if let rep = nsImage.representations.first as? NSBitmapImageRep {
            cgImage = rep.cgImage
        }
    }

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

    performOCR(
        on: preprocessedImage,
        languages: languages,
        confidenceThreshold: confidenceThreshold,
        startTime: startTime
    )
}

func preprocessImage(_ cgImage: CGImage) -> CGImage? {
    do {
        let context = CIContext(options: [.useSoftwareRenderer: false])
        guard let image = CIImage(cgImage: cgImage) else {
            return nil
        }

        var processedImage = image

        // Add white background for transparency
        if let white = CIImage(color: CIColor(red: 1, green: 1, blue: 1, alpha: 1)).cropped(to: image.extent),
           let composited = image.composited(over: white) {
            processedImage = composited
        }

        // Apply scale filter (skip if fails)
        if let scaleFilter = CIFilter(name: "LanczosScaleTransform") {
            scaleFilter.setValue(processedImage, forKey: kCIInputImageKey)
            scaleFilter.setValue(2.0, forKey: kCIInputScaleKey)
            scaleFilter.setValue(1.0, forKey: kCIInputAspectRatioKey)
            if let scaled = scaleFilter.outputImage {
                processedImage = scaled
            }
        }

        // Apply grayscale (skip if fails)
        if let colorFilter = CIFilter(name: "CIColorControls") {
            colorFilter.setValue(processedImage, forKey: kCIInputImageKey)
            colorFilter.setValue(0.0, forKey: kCIInputSaturationKey)
            colorFilter.setValue(1.5, forKey: kCIInputContrastKey)
            colorFilter.setValue(0.1, forKey: kCIInputBrightnessKey)
            if let output = colorFilter.outputImage {
                processedImage = output
            }
        }

        // Create final CGImage with error handling
        let extent = processedImage.extent
        if let cgImageResult = context.createCGImage(processedImage, from: extent) {
            return cgImageResult
        }
    } catch {
        // Silently fail and return original image
    }

    return nil
}

func performOCR(
    on cgImage: CGImage,
    languages: [String],
    confidenceThreshold: Double,
    startTime: Date
) {
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true

    let validLanguages = languages.filter { lang in
        ["en-US", "en-GB", "en", "zh-Hans", "zh-Hant", "zh", "fr-FR", "de-DE", "es-ES", "it-IT", "ja", "ko"].contains(lang)
    }

    if validLanguages.isEmpty {
        request.recognitionLanguages = ["en-US"]
    } else {
        request.recognitionLanguages = validLanguages
    }

    var recognizedBlocks: [(text: String, confidence: Float, y: CGFloat)] = []

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])

    do {
        try handler.perform([request])

        guard let results = request.results as? [VNRecognizedTextObservation], !results.isEmpty else {
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
        outputError("Failed to perform OCR: \\(error.localizedDescription)")
        return
    }

    let sortedBlocks = recognizedBlocks.sorted { a, b in
        if abs(a.y - b.y) < 0.02 {
            return false
        }
        return a.y > b.y
    }

    let text = sortedBlocks.map { $0.text }.joined(separator: "\\n")
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
        print("{\\"success\\":false,\\"text\\":\\"\\",\\"confidence\\":0.0,\\"errors\\":[\\"Failed to encode result\\"],\\"processingTimeMs\\":0.0}")
    }
}

main()
`;
