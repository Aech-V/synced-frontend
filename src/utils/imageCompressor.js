/**
 * Compresses an image file using HTML5 Canvas.
 * @param {File} file - The original image file
 * @param {number} maxWidth - Maximum width (e.g., 1280 for HD chat)
 * @param {number} quality - JPEG compression quality (0.0 to 1.0)
 * @returns {Promise<File>} - The compressed File object
 */
export const compressImage = (file, maxWidth = 1280, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            return reject(new Error("Invalid file type. Must be an image."));
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions keeping aspect ratio
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert back to Blob/File
                canvas.toBlob((blob) => {
                    if (!blob) return reject(new Error("Canvas compression failed"));
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};