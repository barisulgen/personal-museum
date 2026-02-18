import { describe, it, expect } from 'vitest';
import { computeLayout } from './layout.js';

describe('computeLayout', () => {
  it('should return just a foyer for 0 photos', () => {
    const layout = computeLayout(0);
    expect(layout.rooms).toHaveLength(1);
    expect(layout.rooms[0].type).toBe('foyer');
  });

  it('should create 1 gallery room for a small number of photos', () => {
    const layout = computeLayout(5);
    expect(layout.rooms).toHaveLength(2); // foyer + 1 gallery
    expect(layout.rooms[1].type).toBe('gallery');
    expect(layout.rooms[1].photoSlots).toBe(5);
  });

  it('should create multiple gallery rooms when photos exceed capacity', () => {
    const layout = computeLayout(20);
    expect(layout.rooms.length).toBeGreaterThan(2);
    const totalSlots = layout.rooms
      .filter((r) => r.type === 'gallery')
      .reduce((sum, r) => sum + r.photoSlots, 0);
    expect(totalSlots).toBeGreaterThanOrEqual(20);
  });

  it('should connect rooms with doorways', () => {
    const layout = computeLayout(10);
    for (let i = 0; i < layout.rooms.length - 1; i++) {
      const room = layout.rooms[i];
      expect(room.doorways.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should position rooms so they do not overlap', () => {
    const layout = computeLayout(40);
    for (let i = 0; i < layout.rooms.length; i++) {
      for (let j = i + 1; j < layout.rooms.length; j++) {
        const a = layout.rooms[i];
        const b = layout.rooms[j];
        // Check no center overlap (rooms are on a grid)
        const samePos = a.position.x === b.position.x && a.position.z === b.position.z;
        expect(samePos).toBe(false);
      }
    }
  });
});
