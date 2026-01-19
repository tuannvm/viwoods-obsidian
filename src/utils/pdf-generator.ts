// pdf-generator.ts - PDF generation utilities for Viwoods Obsidian Plugin

import { App, TFile, normalizePath, Notice } from 'obsidian';
import { smoothPoints } from './svg-generator.js';

export async function generatePdfFromStrokes(
    app: App,
    strokeData: number[][],
    outputPath: string,
    forceUpdate: boolean,
    defaultSmoothness: number
): Promise<void> {
    const normalizedPath = normalizePath(outputPath);
    const existingFile = app.vault.getAbstractFileByPath(normalizedPath);

    // Skip if file exists and we're not forcing update
    if (existingFile instanceof TFile && !forceUpdate) {
        return;
    }

    // Check if jsPDF is loaded
    if (!window.jspdf) {
        console.error('jsPDF library not loaded');
        return;
    }

    // @ts-ignore - jsPDF is loaded externally
    const { jsPDF } = window.jspdf;

    // Create PDF document
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4' // 595 x 842 points
    });

    // Normalize and scale stroke data to fit A4 canvas
    let normalizedData = [...strokeData];
    if (normalizedData.length > 0) {
        const baseWidth = 595;
        const baseHeight = 842;
        const padding = 50;

        const xCoords = normalizedData.map((p: number[]) => p[0]);
        const yCoords = normalizedData.map((p: number[]) => p[1]);
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);

        const dataWidth = maxX - minX;
        const dataHeight = maxY - minY;
        const scaleX = (baseWidth - 2 * padding) / dataWidth;
        const scaleY = (baseHeight - 2 * padding) / dataHeight;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = dataWidth * scale;
        const scaledHeight = dataHeight * scale;
        const offsetX = (baseWidth - scaledWidth) / 2 - minX * scale;
        const offsetY = (baseHeight - scaledHeight) / 2 - minY * scale;

        normalizedData = normalizedData.map((point: number[]) => [
            point[0] * scale + offsetX,
            point[1] * scale + offsetY,
            point[2]
        ]);
    }

    // Detect and render strokes using canvas first
    const canvas = document.createElement('canvas');
    canvas.width = 595 * 2;  // Higher resolution
    canvas.height = 842 * 2;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    // White background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(2, 2);

    // Detect strokes
    const sortedPoints = [...normalizedData].sort((a: number[], b: number[]) => a[2] - b[2]);
    const detectedStrokes: number[][][] = [];
    let currentStroke: number[][] = [];

    for (let i = 0; i < sortedPoints.length; i++) {
        if (i === 0) {
            currentStroke.push(sortedPoints[i]);
        } else {
            const prevPoint = sortedPoints[i - 1];
            const currPoint = sortedPoints[i];
            const timeDiff = currPoint[2] - prevPoint[2];
            const distance = Math.hypot(currPoint[0] - prevPoint[0], currPoint[1] - prevPoint[1]);

            if (timeDiff > 5 || distance > 100) {
                if (currentStroke.length > 1) {
                    detectedStrokes.push(currentStroke);
                }
                currentStroke = [currPoint];
            } else {
                currentStroke.push(currPoint);
            }
        }
    }
    if (currentStroke.length > 1) {
        detectedStrokes.push(currentStroke);
    }

    // Render each stroke on canvas
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    detectedStrokes.forEach(stroke => {
        if (stroke.length < 2) return;
        const smoothed = smoothPoints(stroke, defaultSmoothness);

        ctx.beginPath();
        ctx.moveTo(smoothed[0][0], smoothed[0][1]);
        for (let i = 1; i < smoothed.length; i++) {
            ctx.lineTo(smoothed[i][0], smoothed[i][1]);
        }
        ctx.stroke();
    });

    // Convert canvas to image and add to PDF
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, 595, 842);

    // Get PDF as ArrayBuffer
    const pdfBlob = pdf.output('blob');
    const arrayBuffer = await pdfBlob.arrayBuffer();

    // Save to vault
    try {
        if (existingFile instanceof TFile) {
            await app.vault.modifyBinary(existingFile, arrayBuffer);
        } else {
            await app.vault.createBinary(normalizedPath, arrayBuffer);
        }
    } catch (error) {
        console.error('Failed to save PDF:', error);
        throw error;
    }
}

export function exportSvgToPdf(
    strokeData: number[][],
    smoothness: number,
    backgroundColor: string,
    getPenStyleFn: (penId: number) => { color: string, width: number, opacity: number },
    smoothStrokeDataFn: (strokeData: number[][], smoothness: number) => number[][][]
): void {
    if (!window.jspdf) {
        new Notice('Jspdf library not loaded');
        return;
    }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const canvas = document.createElement('canvas');
    canvas.width = 1440 * 2;
    canvas.height = 1920 * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, 1440, 1920);
    const smoothedStrokes = smoothStrokeDataFn(strokeData, smoothness);
    for (const stroke of smoothedStrokes) {
        if (stroke.length < 2) continue;
        const style = getPenStyleFn(stroke[0][2] || 0);
        ctx.save();
        ctx.globalAlpha = style.opacity;
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke[0][0], stroke[0][1]);
        for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i][0], stroke[i][1]);
        ctx.stroke();
        ctx.restore();
    }
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    const pdfWidth = 612;
    const pdfHeight = 792;
    const margin = 36;
    const availWidth = pdfWidth - 2 * margin;
    const availHeight = pdfHeight - 2 * margin;
    const scale = Math.min(availWidth / 1440, availHeight / 1920);
    const scaledWidth = 1440 * scale;
    const scaledHeight = 1920 * scale;
    const x = (pdfWidth - scaledWidth) / 2;
    const y = (pdfHeight - scaledHeight) / 2;
    pdf.addImage(imgData, 'JPEG', x, y, scaledWidth, scaledHeight);
    pdf.save('viwoods-page.pdf');
}
