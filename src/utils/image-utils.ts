// image-utils.ts - Image processing utilities

export async function processImageWithBackground(blob: Blob, backgroundColor: string): Promise<ArrayBuffer> {
    if (!backgroundColor || backgroundColor === 'transparent' || backgroundColor === '#FFFFFF') {
        return await blob.arrayBuffer();
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
        }
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((processedBlob) => {
                if (processedBlob) {
                    void processedBlob.arrayBuffer().then(resolve).catch(reject);
                } else {
                    reject(new Error('Failed to process image'));
                }
            }, 'image/png', 1.0);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(blob);
    });
}
