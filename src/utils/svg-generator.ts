// svg-generator.ts - SVG generation and stroke processing utilities

import { PenMappings } from '../types.js';

export function strokesToSVG(strokes: number[][], width = 1440, height = 1920): string {
    if (!strokes || strokes.length === 0) return '';
    const paths: number[][][] = [];
    let currentPath: number[][] = [];

    for (let i = 0; i < strokes.length; i++) {
        const [x, y, timestamp] = strokes[i];
        if (i > 0 && Math.abs(timestamp - strokes[i-1][2]) > 100) {
            if (currentPath.length > 0) paths.push(currentPath);
            currentPath = [[x, y]];
        } else {
            currentPath.push([x, y]);
        }
    }
    if (currentPath.length > 0) paths.push(currentPath);
    const svgPaths = paths.map(path => {
        if (path.length < 2) return '';
        let d = `M ${path[0][0]} ${path[0][1]}`;
        for (let i = 1; i < path.length; i++) d += ` L ${path[i][0]} ${path[i][1]}`;
        return `<path d="${d}" stroke="black" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join('\n');
    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n${svgPaths}\n</svg>`;
}

export function smoothPoints(points: number[][], factor: number): number[][] {
    if (points.length < 3 || factor === 0) return points;

    const smoothed: number[][] = [];
    for (let i = 0; i < points.length; i++) {
        let sumX = 0, sumY = 0, count = 0;
        for (let j = Math.max(0, i - factor); j <= Math.min(points.length - 1, i + factor); j++) {
            sumX += points[j][0];
            sumY += points[j][1];
            count++;
        }
        smoothed.push([sumX / count, sumY / count, points[i][2]]);
    }
    return smoothed;
}

export function smoothStrokeData(strokeData: number[][], smoothness: number): number[][][] {
    const strokes: number[][][] = [];
    let currentStroke: number[][] = [];
    for (let i = 0; i < strokeData.length; i++) {
        const point = strokeData[i];
        if (i === 0) {
            currentStroke.push(point);
        } else {
            const prevPoint = strokeData[i - 1];
            const timeDiff = point[2] - prevPoint[2];
            const distance = Math.hypot(point[0] - prevPoint[0], point[1] - prevPoint[1]);
            if (timeDiff > 5 || distance > 100) {
                if (currentStroke.length > 1) strokes.push(currentStroke);
                currentStroke = [point];
            } else {
                currentStroke.push(point);
            }
        }
    }
    if (currentStroke.length > 1) strokes.push(currentStroke);
    if (smoothness === 0) return strokes;
    return strokes.map(stroke => {
        if (stroke.length < 3) return stroke;
        const smoothed: number[][] = [];
        for (let i = 0; i < stroke.length; i++) {
            let sumX = 0, sumY = 0, count = 0;
            for (let j = Math.max(0, i - smoothness); j <= Math.min(stroke.length - 1, i + smoothness); j++) {
                sumX += stroke[j][0];
                sumY += stroke[j][1];
                count++;
            }
            smoothed.push([sumX / count, sumY / count, stroke[i][2]]);
        }
        return smoothed;
    });
}

export function getPenStyle(penId: number, penMappings: PenMappings): { color: string, width: number, opacity: number } {
    const mapping = penMappings[penId];
    if (mapping) {
        const colorDefinitions: { [key: string]: string } = { black: '#000000', white: '#FFFFFF', lightGray: '#C0C0C0', mediumGray: '#808080', darkGray: '#404040', gray: '#808080', red: '#FF0000', green: '#00AA00', blue: '#0000FF', yellow: '#FFD700' };
        const penTypeBaseWidths: { [key: string]: number } = { calligraphy: 3, fountain: 2.5, ballpoint: 2, fineliner: 1.2, pencil: 2.2, highlighter: 18, thinkers: 2 };
        const thicknessMultipliers: { [key: string]: number } = { 'Ultra Fine': 0.5, 'Fine': 0.7, 'Medium': 1.0, 'Medium Bold': 1.3, 'Bold': 1.7 };
        const baseWidth = penTypeBaseWidths[mapping.type] || 2;
        const multiplier = thicknessMultipliers[mapping.thickness] || 1.0;
        return { color: colorDefinitions[mapping.color] || '#000000', width: baseWidth * multiplier, opacity: mapping.opacity || 1 };
    }
    return { color: '#000000', width: 2, opacity: 1 };
}

export function replayStrokes(svg: SVGElement, strokeData: number[][], smoothness: number, smoothStrokeDataFn: typeof smoothStrokeData) {
    svg.innerHTML = '';
    const smoothedStrokes = smoothStrokeDataFn(strokeData, smoothness);
    let strokeIndex = 0;
    let pointIndex = 0;
    const animate = () => {
        if (strokeIndex >= smoothedStrokes.length) return;
        const stroke = smoothedStrokes[strokeIndex];
        if (pointIndex < stroke.length - 1) {
            const p1 = stroke[pointIndex];
            const p2 = stroke[pointIndex + 1];
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const style = { color: '#000000', width: 3, opacity: 1 };
            line.setAttribute('x1', p1[0].toString());
            line.setAttribute('y1', p1[1].toString());
            line.setAttribute('x2', p2[0].toString());
            line.setAttribute('y2', p2[1].toString());
            line.setAttribute('stroke', style.color);
            line.setAttribute('stroke-width', style.width.toString());
            line.setAttribute('stroke-opacity', style.opacity.toString());
            line.setAttribute('stroke-linecap', 'round');
            svg.appendChild(line);
            pointIndex++;
        } else {
            strokeIndex++;
            pointIndex = 0;
        }
        requestAnimationFrame(animate);
    };
    animate();
}

export function exportSvgToPng(svg: SVGElement) {
    const canvas = document.createElement('canvas');
    canvas.width = 1440;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((pngBlob) => {
            if (pngBlob) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(pngBlob);
                link.download = 'viwoods-page.png';
                link.click();
                URL.revokeObjectURL(link.href);
            }
        }, 'image/png');
        URL.revokeObjectURL(url);
    };
    img.src = url;
}
