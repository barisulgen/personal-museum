# Personal Museum

A personal 3D virtual photo gallery where you upload your photos and walk through them displayed on the walls of a museum-like environment.

Built with vanilla Three.js — no frameworks, no backend. Everything runs in the browser.

## Features

- **First-person walkthrough** — WASD movement, mouse look, fullscreen immersion
- **Auto-generated rooms** — Upload any number of photos; the museum builds itself with connected gallery rooms
- **Grand foyer** — Welcome hall with title text, exhibit info, and chandelier lighting
- **Feature walls** — Walls with single large landscape paintings alongside standard gallery arrangements
- **3D photo frames** — Aspect-ratio-preserving frames with white mat, dark wood border, and spotlight illumination
- **Background music** — Sequential multi-track playlist with mute toggle (persisted)
- **Client-side storage** — Photos stored in IndexedDB, no server needed
- **Texture optimization** — Large images auto-downscaled to 2048px on upload

## Getting Started

```bash
npm install
npm run dev
```

1. Open the dev server URL in your browser
2. Click **Upload Photos** and select your images
3. Click **Start the Tour**
4. Walk with **WASD**, look with **mouse**, press **ESC** to exit

## Background Music

Place MP3 files in `public/personal-museum-bg-songs/`. Tracks play sequentially in a loop.

## Tech Stack

- [Three.js](https://threejs.org/) — 3D rendering
- [idb](https://github.com/jakearchibald/idb) — IndexedDB wrapper
- [Vite](https://vitejs.dev/) — Build tool

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |

## License

MIT
