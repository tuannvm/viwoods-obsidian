#!/usr/bin/env swift

import AppKit

let size = CGSize(width: 400, height: 100)
let image = NSImage(size: size)
image.lockFocus()

NSColor.white.setFill()
let rect = NSRect(origin: .zero, size: size)
NSBezierPath(rect: rect).fill()

let attrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.boldSystemFont(ofSize: 32),
    .foregroundColor: NSColor.black
]
let text = "Hello World" as NSString
text.draw(at: NSPoint(x: 50, y: 30), withAttributes: attrs)

image.unlockFocus()

if let tiffData = image.tiffRepresentation,
   let bitmap = NSBitmapImageRep(data: tiffData),
   let pngData = bitmap.representation(using: .png, properties: [:]) {
    let url = URL(fileURLWithPath: "test_image.png")
    try pngData.write(to: url)
    print("Success: test_image.png created")
} else {
    print("Error: Failed to create PNG")
    exit(1)
}
