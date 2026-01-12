// utils/pen-mapping-helpers.ts - Pen mapping initialization helper

import { App } from 'obsidian';
import type { PenMappings } from '../types.js';
import { loadPenMappings } from './pen-mappings.js';

export async function initPenMappings(app: App): Promise<PenMappings> {
    return await loadPenMappings(app);
}

export { getKnownPenMappings as getPenMappings } from './pen-mappings.js';
