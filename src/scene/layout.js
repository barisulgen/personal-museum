const GALLERY_WIDTH = 14;
const GALLERY_DEPTH = 11;
const GALLERY_HEIGHT = 7;
const FOYER_WIDTH = 18;
const FOYER_DEPTH = 14;
const FOYER_HEIGHT = 9;
const FRAMES_PER_ROOM = 8;
const DOORWAY_WIDTH = 2.8;
const DOORWAY_HEIGHT = 3.8;

/**
 * Return the opposite wall name.
 */
function oppositeWall(wall) {
  switch (wall) {
    case 'north': return 'south';
    case 'south': return 'north';
    case 'east':  return 'west';
    case 'west':  return 'east';
  }
}

/**
 * Compute the museum layout given a number of photos.
 * Returns an object with an array of room descriptors, each having
 * position, dimensions, doorways, and frame (photo slot) assignments.
 *
 * Rooms are placed in a zigzag pattern:
 *   foyer -> south -> east -> south -> west -> south -> east -> ...
 */
export function computeLayout(photoCount) {
  const rooms = [];

  // Direction sequence for zigzag placement.
  // Each entry describes how to move from the previous room to the next.
  // 'exitWall' is the wall on the previous room where the doorway is placed.
  // The entering wall on the new room is the opposite of exitWall.
  const directionSequence = [
    { dx: 0, dz: 1, exitWall: 'south' },  // move south
    { dx: 1, dz: 0, exitWall: 'east' },   // move east
    { dx: 0, dz: 1, exitWall: 'south' },  // move south
    { dx: -1, dz: 0, exitWall: 'west' },  // move west
  ];

  // Create the foyer
  const foyer = {
    type: 'foyer',
    width: FOYER_WIDTH,
    depth: FOYER_DEPTH,
    height: FOYER_HEIGHT,
    position: { x: 0, z: 0 },
    doorways: [],
    photoSlots: 0,
  };
  rooms.push(foyer);

  if (photoCount === 0) return { rooms };

  // Calculate number of gallery rooms needed
  const galleryCount = Math.ceil(photoCount / FRAMES_PER_ROOM);

  let photosRemaining = photoCount;

  // Track current position for placement
  let curX = 0;
  let curZ = 0;

  for (let i = 0; i < galleryCount; i++) {
    const prevRoom = rooms[rooms.length - 1];

    // Determine the direction from prevRoom to this new gallery
    const dir = directionSequence[i % directionSequence.length];

    // Calculate the spacing based on the previous room and new room dimensions.
    // We need to move from prevRoom center to new room center.
    // Along the movement axis, the distance is half the previous room + half the new room.
    const prevHalfW = prevRoom.width / 2;
    const prevHalfD = prevRoom.depth / 2;
    const newHalfW = GALLERY_WIDTH / 2;
    const newHalfD = GALLERY_DEPTH / 2;

    // Compute step size along x and z
    let stepX = 0;
    let stepZ = 0;
    if (dir.dx !== 0) {
      // Moving east or west: step along x by half-widths
      stepX = dir.dx * (prevHalfW + newHalfW);
    }
    if (dir.dz !== 0) {
      // Moving south (positive z): step along z by half-depths
      stepZ = dir.dz * (prevHalfD + newHalfD);
    }

    curX = prevRoom.position.x + stepX;
    curZ = prevRoom.position.z + stepZ;

    const slotsInThisRoom = Math.min(photosRemaining, FRAMES_PER_ROOM);

    const gallery = {
      type: 'gallery',
      width: GALLERY_WIDTH,
      depth: GALLERY_DEPTH,
      height: GALLERY_HEIGHT,
      position: { x: curX, z: curZ },
      doorways: [],
      photoSlots: slotsInThisRoom,
    };

    // Create a doorway pair connecting prevRoom and this gallery.
    // The previous room gets a doorway on its exit wall.
    // The new gallery gets a doorway on the opposite (entry) wall.
    const entryWall = oppositeWall(dir.exitWall);

    // Doorway position is the center of the wall
    const prevDoorwayPos = (dir.exitWall === 'north' || dir.exitWall === 'south')
      ? prevRoom.width / 2
      : prevRoom.depth / 2;

    const newDoorwayPos = (entryWall === 'north' || entryWall === 'south')
      ? GALLERY_WIDTH / 2
      : GALLERY_DEPTH / 2;

    prevRoom.doorways.push({
      wall: dir.exitWall,
      position: prevDoorwayPos,
      width: DOORWAY_WIDTH,
      height: DOORWAY_HEIGHT,
    });

    gallery.doorways.push({
      wall: entryWall,
      position: newDoorwayPos,
      width: DOORWAY_WIDTH,
      height: DOORWAY_HEIGHT,
    });

    rooms.push(gallery);
    photosRemaining -= slotsInThisRoom;
  }

  return { rooms };
}

export {
  FRAMES_PER_ROOM,
  GALLERY_WIDTH,
  GALLERY_DEPTH,
  GALLERY_HEIGHT,
  FOYER_WIDTH,
  FOYER_DEPTH,
  FOYER_HEIGHT,
  DOORWAY_WIDTH,
  DOORWAY_HEIGHT,
};
