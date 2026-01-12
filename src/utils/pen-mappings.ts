// pen-mappings.ts - Pen mapping utilities for Viwoods Notes Importer Plugin

import { App, TFile } from 'obsidian';
import type { PenMappings } from '../types.js';
import { log } from './logger.js';

export async function loadPenMappings(app: App): Promise<PenMappings> {
    try {
        const mappingPath = 'Attachments/pen_mapping.json';
        const mappingFile = app.vault.getAbstractFileByPath(mappingPath);
        if (mappingFile instanceof TFile) {
            const content = await app.vault.read(mappingFile);
            const mappings = JSON.parse(content);
            log.debug('Loaded pen mappings from Attachments/pen_mapping.json');
            return mappings;
        }
    } catch (error) {
        log.error('Failed to load pen mappings:', error);
    }
    log.debug('Using default pen mappings');
    return getKnownPenMappings();
}

export function getKnownPenMappings(): PenMappings {
    const mappings: PenMappings = {};
    const penTypes = ['calligraphy', 'fountain', 'ballpoint', 'fineliner', 'pencil', 'highlighter', 'thinkers'];
    const colors = ['black', 'gray', 'blue', 'red', 'green'];
    const thicknesses = ['Ultra Fine', 'Fine', 'Medium', 'Medium Bold', 'Bold'];
    let penId = 0;
    for (const type of penTypes) {
        const colorsForType = type === 'highlighter' ? ['yellow', 'green', 'blue', 'red', 'gray'] : colors;
        for (const color of colorsForType) {
            for (const thickness of thicknesses) {
                mappings[penId] = { type, color, thickness, opacity: type === 'highlighter' ? 0.3 : (type === 'pencil' ? 0.8 : 1) };
                penId++;
            }
        }
    }
    return mappings;
}
