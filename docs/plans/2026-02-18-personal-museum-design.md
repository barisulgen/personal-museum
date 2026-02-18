# Personal Museum — Design Document

A personal 3D virtual gallery where users upload their photos and walk through them displayed on the walls of a museum-like environment.

## Architecture

- **Stack:** Vanilla Three.js + Vite, fully client-side
- **Storage:** IndexedDB (via `idb` wrapper) for photo blobs + metadata
- **Dependencies:** `three`, `idb`, `vite`

### Project Structure

```
personal-museum/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.js             # Bootstrap: init scene, start loop
│   ├── scene/
│   │   ├── museum.js       # Top-level scene assembly
│   │   ├── room.js         # Single room: walls, floor, ceiling, frames
│   │   ├── layout.js       # Room generator: connects rooms into a floorplan
│   │   ├── frame.js        # Photo frame mesh + texture loading
│   │   └── lighting.js     # Museum lighting setup
│   ├── controls/
│   │   ├── player.js       # FPS camera: WASD + pointer lock + mouse look
│   │   └── collision.js    # Raycasting wall collision
│   ├── storage/
│   │   └── db.js           # IndexedDB wrapper: save/load/delete photos
│   └── ui/
│       ├── overlay.js      # Menu state UI
│       └── upload.js       # File input handling
└── public/
    └── textures/           # Wall, floor, ceiling textures
```

## UI States

### Menu State (default on load)

- 3D scene visible in background with a slowly rotating ambient camera in the foyer
- Centered UI panel:
  - "Personal Museum" title/info text
  - Upload button (file picker, `image/*`, multiple) with photo count display
  - Mute/unmute toggle for background music
  - "Start the Tour" button — disabled until at least 1 photo is uploaded
- Music can begin playing here if unmuted

### Tour State

- Enters fullscreen (Fullscreen API) + pointer lock simultaneously
- All menu UI hidden — pure immersive walkthrough
- Player spawns in foyer, WASD + mouse look active
- No HUD beyond an optional crosshair

### Transitions

- **Menu → Tour:** "Start the Tour" → fullscreen + pointer lock → generate scene → enter
- **Tour → Menu:** ESC or exit fullscreen → pointer lock released → menu UI reappears, ambient camera resumes
- Re-entering tour regenerates rooms if photos changed

## Foyer

- Grand entrance hall: taller ceiling (~6m), wider floor (~14m x 12m)
- Back wall: large "Welcome to Personal Museum" title (canvas-rendered text → texture)
- Side walls: exhibit description placards (photo count, date range)
- Central decorative element (bench — simple box geometry)
- Bright warm point light in center (chandelier feel)
- Single doorway at far end leading to first gallery room
- No photo frames — purely atmospheric and informational
- Empty state: doorway blocked with sign "Upload photos to open the gallery"

## Gallery Room Generation

- Each room: rectangular box (~10m x 8m x 4m high)
- Each wall segment between doorways holds 2-3 photo frames (~8-10 slots per room)
- When photos exceed a room's capacity, a new room is generated with a connecting doorway
- Linear layout: Foyer → Gallery 1 → Gallery 2 → ...
- Rooms placed on a grid, extending forward then alternating left/right (zigzag path)
- Doorways are openings in shared walls

## Photo Frames

- Rectangular box geometry with extruded border (dark wood or gold material)
- White mat/margin between frame edge and photo
- Photo texture scaled to fit preserving aspect ratio (letterboxed if needed)
- Centered vertically at eye height (~1.6m)
- Evenly spaced along walls, avoiding corners and doorways

## Player Controls (Tour State)

- WASD / arrow keys: move forward/back/strafe (~3m/s, delta-time based)
- Mouse: look around (yaw + pitch, pitch clamped to ~±85 degrees)
- Pointer Lock API for mouse capture
- Collision: raycasts from player toward movement direction, block if wall within ~0.5m

## Visual Style

- **Walls:** Warm off-white/cream, plaster-like
- **Floor:** Dark hardwood or polished marble (repeating texture)
- **Ceiling:** Flat, slightly lighter than walls
- **Baseboards:** Thin dark strip at wall-floor junction
- **Lighting:** Low ambient warm tone + spot lights angled at each photo frame (museum picture lighting)
- **Shadows:** Soft shadow maps enabled
- **Fog:** Light distance fog matching wall color for depth

## Background Music

- Single looping MP3 file (user-provided, placed in `public/`)
- `<audio>` element with loop attribute
- Plays across both menu and tour states (no restart on transition)
- Starts on first user interaction
- Mute/unmute toggle in menu UI
- Mute preference persisted in localStorage

## Storage

- **Database:** `personal-museum` (IndexedDB)
- **Object store:** `photos`
- **Record schema:**
  - `id` — auto-incremented
  - `blob` — original image file as Blob
  - `name` — original filename
  - `width`, `height` — original dimensions
  - `addedAt` — timestamp
- On upload: read dimensions via `createImageBitmap`, store blob + metadata
- On tour start: `URL.createObjectURL()` for each blob → Three.js textures
- On tour exit: revoke object URLs to free memory
- Textures downscaled to max 2048px on longest edge to manage GPU memory
- No delete UI in v1 — users clear browser data to reset
