import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { initDB, savePhoto, getAllPhotos, getPhotoCount, clearAllPhotos, _resetDB } from './db.js';

describe('photo storage', () => {
  beforeEach(async () => {
    _resetDB();
    indexedDB.deleteDatabase('personal-museum');
  });

  it('should initialize the database', async () => {
    const db = await initDB();
    expect(db).toBeDefined();
    db.close();
  });

  it('should save and retrieve a photo', async () => {
    const blob = new Blob(['fake-image'], { type: 'image/png' });
    const photo = { blob, name: 'test.png', width: 800, height: 600 };

    await savePhoto(photo);
    const photos = await getAllPhotos();

    expect(photos).toHaveLength(1);
    expect(photos[0].name).toBe('test.png');
    expect(photos[0].width).toBe(800);
    expect(photos[0].height).toBe(600);
    expect(photos[0].blob).toBeInstanceOf(Blob);
    expect(photos[0].id).toBeDefined();
    expect(photos[0].addedAt).toBeDefined();
  });

  it('should save multiple photos and return all', async () => {
    const blob = new Blob(['fake'], { type: 'image/png' });
    await savePhoto({ blob, name: 'a.png', width: 100, height: 100 });
    await savePhoto({ blob, name: 'b.png', width: 200, height: 200 });
    await savePhoto({ blob, name: 'c.png', width: 300, height: 300 });

    const photos = await getAllPhotos();
    expect(photos).toHaveLength(3);
  });

  it('should return photo count', async () => {
    const blob = new Blob(['fake'], { type: 'image/png' });
    expect(await getPhotoCount()).toBe(0);

    await savePhoto({ blob, name: 'a.png', width: 100, height: 100 });
    expect(await getPhotoCount()).toBe(1);

    await savePhoto({ blob, name: 'b.png', width: 200, height: 200 });
    expect(await getPhotoCount()).toBe(2);
  });

  it('should clear all photos', async () => {
    const blob = new Blob(['fake'], { type: 'image/png' });
    await savePhoto({ blob, name: 'a.png', width: 100, height: 100 });
    await savePhoto({ blob, name: 'b.png', width: 200, height: 200 });

    await clearAllPhotos();
    expect(await getPhotoCount()).toBe(0);
  });
});
