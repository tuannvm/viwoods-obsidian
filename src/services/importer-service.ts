// importer-service.ts - Core import business logic for Viwoods Notes Importer Plugin

import { App } from 'obsidian';
import type {
    PageData,
    BookResult,
    ViwoodsSettings,
    PenMappings
} from '../types.js';
import { hashImageData } from '../utils/file-utils.js';
import { log } from '../utils/logger.js';

export class ImporterService {
    constructor(
        private app: App,
        private settings: ViwoodsSettings,
        private penMappings: PenMappings
    ) {}

    async convertNoteToBook(
        zip: any,
        files: string[],
        fileName: string,
        isNewFormat: boolean
    ): Promise<BookResult> {
        const bookName = fileName.replace('.note', '').replace('.zip', '');
        log.debug(`Converting note to book: ${fileName}, format: ${isNewFormat ? 'new' : 'old'}`);
        log.debug(`Total files in archive: ${files.length}`);
        const allAudioFiles = files.filter(f => f.includes('audio') || f.endsWith('.m4a') || f.endsWith('.mp3'));
        log.debug(`Found ${allAudioFiles.length} audio files:`, allAudioFiles);

        if (isNewFormat) {
            return await this.convertNewFormat(zip, files, bookName, allAudioFiles);
        } else {
            return await this.convertOldFormat(zip, files, bookName, allAudioFiles);
        }
    }

    private async convertNewFormat(
        zip: any,
        files: string[],
        bookName: string,
        allAudioFiles: string[]
    ): Promise<BookResult> {
        let metadata: any = {};
        const pages: PageData[] = [];

        const noteFileInfo = files.find(f => f.includes('NoteFileInfo.json'));
        if (noteFileInfo) {
            metadata = JSON.parse(await zip.file(noteFileInfo).async('string'));
            bookName = this.settings.filePrefix + (metadata.fileName || bookName);
            log.debug(`Book name from metadata: ${bookName}`);
        }

        const pageResourceFile = files.find(f => f.includes('PageResource.json'));
        if (pageResourceFile) {
            const pageResource = JSON.parse(await zip.file(pageResourceFile).async('string'));
            const mainBmpFiles = pageResource.filter((r: any) => r.fileName?.includes('mainBmp'));
            log.debug(`Processing ${mainBmpFiles.length} pages`);

            for (let i = 0; i < mainBmpFiles.length; i++) {
                const bmpResource = mainBmpFiles[i];
                const imageFile = files.find(f => f === bmpResource.fileName);
                if (imageFile) {
                    const blob = await zip.file(imageFile).async('blob');
                    const hash = await hashImageData(blob);
                    const pageData: PageData = { pageNum: i + 1, image: { blob, hash } };

                    // Extract stroke data if enabled
                    if (this.settings.outputFormat === 'svg' || this.settings.outputFormat === 'both' || this.settings.enableSvgViewer) {
                        const pathFiles = pageResource.filter((r: any) => r.resourceType === 7);
                        const pathResource = pathFiles[i];
                        if (pathResource) {
                            const pathFile = files.find(f => f.includes(pathResource.fileName));
                            if (pathFile) {
                                pageData.stroke = JSON.parse(await zip.file(pathFile).async('string'));
                            }
                        }
                    }

                    // Extract audio
                    const pageNum = i + 1;
                    const audioFile = this.findAudioFile(files, allAudioFiles, pageNum);
                    if (audioFile) {
                        const audioBlob = await zip.file(audioFile).async('blob');
                        const audioFileName = audioFile.split('/').pop() || audioFile.split('\\').pop();
                        pageData.audio = {
                            blob: audioBlob,
                            originalName: audioFileName || '',
                            name: `${bookName}_page_${String(pageNum).padStart(3, '0')}_audio.m4a`
                        };
                        log.debug(`Added audio for page ${pageNum}: ${audioFile}`);
                    }

                    pages.push(pageData);
                }
            }
        }

        let thumbnail = null;
        if (this.settings.includeThumbnails) {
            const thumbnailFile = files.find(f => f.includes('Thumbnail') || f.includes('thumbnai'));
            if (thumbnailFile) {
                thumbnail = await zip.file(thumbnailFile).async('blob');
                log.debug('Found thumbnail');
            }
        }

        log.debug(`Conversion complete: ${pages.length} pages, ${pages.filter(p => p.audio).length} with audio`);
        return { bookName, metadata, pages, thumbnail };
    }

    private async convertOldFormat(
        zip: any,
        files: string[],
        bookName: string,
        allAudioFiles: string[]
    ): Promise<BookResult> {
        let metadata: any = {};
        const pages: PageData[] = [];

        const notesBeanFile = files.find(f => f.includes('NotesBean.json'));
        if (notesBeanFile) {
            metadata = JSON.parse(await zip.file(notesBeanFile).async('string'));
            bookName = this.settings.filePrefix + (metadata.nickname || metadata.noteName || bookName);
            log.debug(`Book name from old format metadata: ${bookName}`);
        }

        const noteListFile = files.find(f => f.includes('NoteList.json'));
        if (noteListFile) {
            const noteList = JSON.parse(await zip.file(noteListFile).async('string'));
            log.debug(`Processing ${noteList.length} pages from old format`);

            for (let i = 0; i < noteList.length; i++) {
                const page = noteList[i];
                const imageFile = files.find(f => f === `${page.pageId}.png`);
                if (imageFile) {
                    const blob = await zip.file(imageFile).async('blob');
                    const hash = await hashImageData(blob);
                    const pageData: PageData = { pageNum: i + 1, image: { blob, hash } };

                    const pageNum = i + 1;
                    const audioFile = files.find(f =>
                        (f.includes('audio') || f.endsWith('.m4a')) &&
                        (f.includes(`${pageNum}`) || f.includes(`page${pageNum}`) || f.includes(`Page${pageNum}`))
                    );

                    if (audioFile) {
                        const audioBlob = await zip.file(audioFile).async('blob');
                        const audioFileName = audioFile.split('/').pop() || audioFile.split('\\').pop();
                        pageData.audio = {
                            blob: audioBlob,
                            originalName: audioFileName || '',
                            name: `${bookName}_page_${String(pageNum).padStart(3, '0')}_audio.m4a`
                        };
                        log.debug(`Added audio for page ${pageNum} (old format): ${audioFile}`);
                    }

                    pages.push(pageData);
                }
            }
        }

        return { bookName, metadata, pages, thumbnail: null };
    }

    private findAudioFile(files: string[], allAudioFiles: string[], pageNum: number): string | null {
        const audioPatterns = [
            `audio/page_${pageNum}`,
            `audio/Page_${pageNum}`,
            `page_${pageNum}.m4a`,
            `Page${String(pageNum).padStart(3, '0')}`,
            `audio/${pageNum}`,
            (f: string) => {
                const audioMatch = f.match(/audio[/\\].*?(\d+)/i);
                return audioMatch && parseInt(audioMatch[1]) === pageNum;
            }
        ];

        for (const pattern of audioPatterns) {
            if (typeof pattern === 'string') {
                const found = files.find(f => f.includes(pattern));
                if (found) {
                    log.debug(`Found audio for page ${pageNum} using pattern`);
                    return found;
                }
            } else if (typeof pattern === 'function') {
                const found = files.find(f => pattern(f));
                if (found) {
                    log.debug(`Found audio for page ${pageNum} using function pattern`);
                    return found;
                }
            }
        }

        // Fallback: use audio file by index
        if (allAudioFiles.length > 0) {
            const sortedAudioFiles = allAudioFiles.sort();
            if (sortedAudioFiles[pageNum - 1]) {
                log.debug(`Using audio file by index for page ${pageNum}: ${sortedAudioFiles[pageNum - 1]}`);
                return sortedAudioFiles[pageNum - 1];
            }
        }

        log.debug(`No audio found for page ${pageNum}`);
        return null;
    }
}
