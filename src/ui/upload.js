import { savePhoto, getPhotoCount } from '../storage/db.js';

const MAX_TEXTURE_SIZE = 2048;

/**
 * Downscale an image if it exceeds MAX_TEXTURE_SIZE on its longest edge.
 * Returns { blob, width, height } with the (possibly resized) image.
 */
async function processImage(file) {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width <= MAX_TEXTURE_SIZE && height <= MAX_TEXTURE_SIZE) {
    bitmap.close();
    return { blob: file, width, height };
  }

  // Downscale
  const scale = MAX_TEXTURE_SIZE / Math.max(width, height);
  const newW = Math.round(width * scale);
  const newH = Math.round(height * scale);

  const canvas = new OffscreenCanvas(newW, newH);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, newW, newH);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
  return { blob, width: newW, height: newH };
}

/**
 * Process and save uploaded files.
 * Accepts a FileList from an <input type="file">.
 * Returns the new total photo count.
 */
export async function handleUpload(fileList) {
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) continue;
    const { blob, width, height } = await processImage(file);
    await savePhoto({ blob, name: file.name, width, height });
  }
  return getPhotoCount();
}
