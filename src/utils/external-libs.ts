// external-libs.ts - External library loading utilities

// JSZip type definition (loaded externally)
interface JSZip {
    loadAsync(data: Blob | string): Promise<JSZip>;
    files: { [filename: string]: JSZipFile };
    file(path: string): JSZipFile | null;
}

interface JSZipFile {
    async(type: string): Promise<string | Blob | ArrayBuffer>;
}

// jsPDF type definition (loaded externally)
interface jsPDF {
    new(options?: { orientation?: string; unit?: string; format?: string }): jsPDFInstance;
    output(type: string): Blob;
    addImage(imgData: string, format: string, x: number, y: number, w: number, h: number): void;
    save(filename: string): void;
}

interface jsPDFInstance {
    output(type: string): Blob;
    addImage(imgData: string, format: string, x: number, y: number, w: number, h: number): void;
    save(filename: string): void;
}

declare global {
    interface Window {
        JSZip?: { loadAsync(data: Blob | string): Promise<JSZip> };
        jspdf?: { jsPDF: jsPDF };
    }
}

export type { JSZip, JSZipFile, jsPDF, jsPDFInstance };

export async function loadJSZip(): Promise<void> {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.async = true;
    document.head.appendChild(script);
    return new Promise<void>((resolve) => {
        script.onload = () => resolve();
    });
}

export async function loadJsPDF(): Promise<void> {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    document.head.appendChild(script);
    return new Promise<void>((resolve) => {
        script.onload = () => resolve();
    });
}

export function hasJSZip(): boolean {
    return typeof window.JSZip !== 'undefined';
}

export function hasJsPDF(): boolean {
    return typeof window.jspdf !== 'undefined';
}
