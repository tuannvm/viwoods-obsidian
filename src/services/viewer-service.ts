// viewer-service.ts - SVG viewer rendering service

import { App, TFile, normalizePath, Notice } from 'obsidian';
import type { ViwoodsSettings } from '../types.js';
import { log } from '../utils/logger.js';

export class ViewerService {
    constructor(
        private app: App,
        private settings: ViwoodsSettings
    ) {}

    async renderSvgViewer(source: string, el: HTMLElement): Promise<void> {
        const lines = source.trim().split('\n');
        const strokeFileName = lines[0].trim();
        const currentFile = this.app.workspace.getActiveFile();
        if (!currentFile) return;

        const currentFolder = currentFile.parent?.path || '';
        const strokePath = `${currentFolder}/${this.settings.strokesFolder}/${strokeFileName}`;
        const strokeFile = this.app.vault.getAbstractFileByPath(strokePath);

        if (!(strokeFile instanceof TFile)) {
            el.createEl('p', { text: `Stroke data not found: ${strokeFileName}` });
            return;
        }

        try {
            const strokeContent = await this.app.vault.read(strokeFile);
            let strokeData: number[][] = JSON.parse(strokeContent);

            log.debug('=== SVG VIEWER DEBUG ===');
            log.debug(`Raw data points: ${strokeData.length}`);

            // Normalize and scale stroke data
            strokeData = this.normalizeStrokeData(strokeData);

            // Detect strokes from point data
            const detectedStrokes = this.detectStrokes(strokeData);
            log.debug(`Detected ${detectedStrokes.length} strokes`);

            // Create UI
            this.createViewerUI(el, strokeFileName, strokeData, detectedStrokes);

            log.debug('=== COMPLETE ===');
        } catch (error: unknown) {
            log.error('Error:', error);
            el.createEl('p', { text: 'Failed to load: ' + (error instanceof Error ? error.message : 'Unknown error') });
        }
    }

    private normalizeStrokeData(strokeData: number[][]): number[][] {
        if (strokeData.length === 0) return strokeData;

        const baseWidth = 595;
        const baseHeight = 842;
        const padding = 50;

        const xCoords = strokeData.map(p => p[0]);
        const yCoords = strokeData.map(p => p[1]);
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

        return strokeData.map(point => [
            point[0] * scale + offsetX,
            point[1] * scale + offsetY,
            point[2]
        ]);
    }

    private detectStrokes(strokeData: number[][]): number[][][] {
        const sortedPoints = [...strokeData].sort((a, b) => a[2] - b[2]);
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

        return detectedStrokes;
    }

    private createViewerUI(el: HTMLElement, strokeFileName: string, strokeData: number[][], detectedStrokes: number[][][]): void {
        const container = el.createDiv({ cls: 'viwoods-svg-viewer' });
        container.style.cssText = 'background: var(--background-secondary); padding: 15px; border-radius: 8px; margin: 10px 0;';

        const header = container.createDiv();
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 10px; background: var(--background-primary); border-radius: 5px; margin-bottom: 10px;';

        const headerTitle = header.createEl('h4', { text: 'Vector Viewer' });
        headerTitle.style.cssText = 'margin: 0; color: var(--text-normal);';

        const toggleIcon = header.createEl('span', { text: this.settings.showSvgViewer ? '▼' : '▶' });
        toggleIcon.style.cssText = 'color: var(--text-muted);';

        const contentWrapper = container.createDiv();
        contentWrapper.style.display = this.settings.showSvgViewer ? 'block' : 'none';

        header.addEventListener('click', () => {
            const isVisible = contentWrapper.style.display === 'block';
            contentWrapper.style.display = isVisible ? 'none' : 'block';
            toggleIcon.textContent = isVisible ? '▶' : '▼';
            this.settings.showSvgViewer = !isVisible;
        });

        const controls = contentWrapper.createDiv();
        controls.style.cssText = 'display: flex; flex-wrap: wrap; gap: 15px; padding: 10px; background: var(--background-primary); border-radius: 5px; margin-bottom: 15px; align-items: center;';

        const smoothSlider = this.createControl(controls, 'Smooth:', 'range', '0', '20', this.settings.defaultSmoothness.toString());
        const widthSlider = this.createControl(controls, 'Width:', 'range', '0.5', '10', '2.5', '0.5');
        const opacitySlider = this.createControl(controls, 'Opacity:', 'range', '0.1', '1', '1', '0.1');
        const colorPicker = this.createControl(controls, 'Color:', 'color', '', '', '#000000');
        const speedSlider = this.createControl(controls, 'Speed:', 'range', '1', '50', this.settings.defaultReplaySpeed.toString());

        const btnGroup = controls.createDiv();
        btnGroup.style.cssText = 'display: flex; gap: 8px; margin-left: auto;';

        const replayBtn = btnGroup.createEl('button', { text: 'Play' });
        replayBtn.style.cssText = 'padding: 6px 12px; cursor: pointer; background: var(--interactive-accent); color: var(--text-on-accent); border: none; border-radius: 4px;';

        const pdfBtn = btnGroup.createEl('button', { text: 'PDF' });
        pdfBtn.style.cssText = 'padding: 6px 12px; cursor: pointer; background: var(--interactive-accent); color: var(--text-on-accent); border: none; border-radius: 4px;';

        const svgContainer = contentWrapper.createDiv();
        svgContainer.style.cssText = 'display: flex; justify-content: center; background: white; border-radius: 5px; padding: 20px; position: relative;';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 595 842');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', 'auto');
        svg.style.background = 'white';
        svgContainer.appendChild(svg);

        // Render functions
        const smoothPointsLocal = (points: number[][], factor: number): number[][] => {
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
        };

        let isReplaying = false;
        let replayStrokeIndex = 0;
        let replayPointIndex = 0;

        const renderStrokes = (upToStroke?: number, upToPoint?: number) => {
            const smoothness = parseInt(smoothSlider.value);
            const strokeWidth = parseFloat(widthSlider.value);
            const opacity = parseFloat(opacitySlider.value);
            const color = colorPicker.value;

            while (svg.firstChild) {
                svg.removeChild(svg.firstChild);
            }

            const maxStroke = upToStroke !== undefined ? upToStroke : detectedStrokes.length;

            for (let s = 0; s < maxStroke; s++) {
                const stroke = detectedStrokes[s];
                if (stroke.length < 2) continue;

                const maxPoint = (s === upToStroke && upToPoint !== undefined) ? upToPoint : stroke.length;
                const partialStroke = stroke.slice(0, maxPoint);

                if (partialStroke.length < 2) continue;

                const smoothed = smoothPointsLocal(partialStroke, smoothness);
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

                let d = `M ${smoothed[0][0]} ${smoothed[0][1]}`;
                for (let i = 1; i < smoothed.length - 1; i++) {
                    const xc = (smoothed[i][0] + smoothed[i + 1][0]) / 2;
                    const yc = (smoothed[i][1] + smoothed[i + 1][1]) / 2;
                    d += ` Q ${smoothed[i][0]} ${smoothed[i][1]}, ${xc} ${yc}`;
                }
                if (smoothed.length > 1) {
                    d += ` L ${smoothed[smoothed.length - 1][0]} ${smoothed[smoothed.length - 1][1]}`;
                }

                path.setAttribute('d', d);
                path.setAttribute('stroke', color);
                path.setAttribute('stroke-width', strokeWidth.toString());
                path.setAttribute('stroke-opacity', opacity.toString());
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');

                svg.appendChild(path);
            }
        };

        const startReplay = () => {
            if (isReplaying) {
                isReplaying = false;
                replayBtn.textContent = 'Play';
                renderStrokes();
                return;
            }

            isReplaying = true;
            replayBtn.textContent = 'Stop';
            replayStrokeIndex = 0;
            replayPointIndex = 0;

            const animate = () => {
                if (!isReplaying) return;

                if (replayStrokeIndex >= detectedStrokes.length) {
                    isReplaying = false;
                    replayBtn.textContent = 'Play';
                    return;
                }

                const currentStroke = detectedStrokes[replayStrokeIndex];
                const speed = parseInt(speedSlider.value);

                if (replayPointIndex < currentStroke.length) {
                    replayPointIndex += Math.max(1, Math.floor(speed / 5));
                    renderStrokes(replayStrokeIndex + 1, replayPointIndex);
                    setTimeout(() => requestAnimationFrame(animate), 20);
                } else {
                    replayStrokeIndex++;
                    replayPointIndex = 0;
                    requestAnimationFrame(animate);
                }
            };

            animate();
        };

        const exportPDF = async () => {
            try {
                if (!window.jspdf) {
                    new Notice('jsPDF library not loaded');
                    return;
                }

                const { jsPDF } = window.jspdf;

                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'pt',
                    format: 'a4'
                });

                const canvas = document.createElement('canvas');
                canvas.width = 595 * 2;
                canvas.height = 842 * 2;
                const ctx = canvas.getContext('2d');

                if (!ctx) return;

                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.scale(2, 2);

                const strokeWidth = parseFloat(widthSlider.value);
                const opacity = parseFloat(opacitySlider.value);
                const color = colorPicker.value;
                const smoothness = parseInt(smoothSlider.value);

                ctx.strokeStyle = color;
                ctx.lineWidth = strokeWidth;
                ctx.globalAlpha = opacity;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                detectedStrokes.forEach(stroke => {
                    if (stroke.length < 2) return;
                    const smoothed = smoothPointsLocal(stroke, smoothness);

                    ctx.beginPath();
                    ctx.moveTo(smoothed[0][0], smoothed[0][1]);
                    for (let i = 1; i < smoothed.length; i++) {
                        ctx.lineTo(smoothed[i][0], smoothed[i][1]);
                    }
                    ctx.stroke();
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(imgData, 'JPEG', 0, 0, 595, 842);

                const pdfBlob = pdf.output('blob');
                const arrayBuffer = await pdfBlob.arrayBuffer();

                const pdfFileName = strokeFileName.replace('_strokes.json', '_rendered.pdf');
                const pdfPath = `${this.settings.pdfFolder}/${pdfFileName}`;
                const normalizedPdfPath = normalizePath(pdfPath);

                try {
                    const existingPdf = this.app.vault.getAbstractFileByPath(normalizedPdfPath);

                    if (existingPdf instanceof TFile) {
                        await this.app.vault.modifyBinary(existingPdf, arrayBuffer);
                        new Notice(`Updated: ${pdfFileName}`);
                    } else {
                        await this.app.vault.createFolder(this.settings.pdfFolder).catch(() => {});
                        await this.app.vault.createBinary(normalizedPdfPath, arrayBuffer);
                        new Notice(`Created: ${pdfFileName}`);
                    }
                } catch (error: unknown) {
                    log.error('Failed to save PDF:', error);
                    new Notice('Failed to save PDF: ' + (error instanceof Error ? error.message : 'Unknown error'));
                }

            } catch (error: unknown) {
                new Notice('PDF export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
            }
        };

        smoothSlider.addEventListener('input', () => renderStrokes());
        widthSlider.addEventListener('input', () => renderStrokes());
        opacitySlider.addEventListener('input', () => renderStrokes());
        colorPicker.addEventListener('input', () => renderStrokes());
        replayBtn.addEventListener('click', startReplay);
        pdfBtn.addEventListener('click', exportPDF);

        renderStrokes();
    }

    private createControl(parent: HTMLElement, label: string, type: string, min: string, max: string, value: string, step = '1'): HTMLInputElement {
        const group = parent.createDiv();
        group.style.cssText = 'display: flex; align-items: center; gap: 8px;';
        group.createEl('label', { text: label }).style.cssText = 'min-width: 70px; font-weight: 500;';
        const input = group.createEl('input', { type }) as HTMLInputElement;
        if (type === 'range') {
            input.min = min;
            input.max = max;
            input.step = step;
            input.value = value;
            input.style.cssText = 'width: 120px;';
            const valueSpan = group.createEl('span', { text: value });
            valueSpan.style.cssText = 'min-width: 30px; font-weight: bold;';
            input.addEventListener('input', () => {
                valueSpan.textContent = input.value;
            });
        } else if (type === 'color') {
            input.value = value;
            input.style.cssText = 'width: 50px; height: 30px;';
        }
        return input;
    }
}
