import { savePhoto, getPhotoCount } from '../storage/db.js';

const MAX_TEXTURE_SIZE = 2048;

/**
 * Read image dimensions from a File/Blob.
 * Returns { width, height }.
 */
async function getImageDimensions(file) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}

/**
 * Process and save uploaded files.
 * Accepts a FileList from an <input type="file">.
 * Returns the new total photo count.
 */
export async function handleUpload(fileList) {
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) continue;
    const { width, height } = await getImageDimensions(file);
    await savePhoto({ blob: file, name: file.name, width, height });
  }
  return getPhotoCount();
}
