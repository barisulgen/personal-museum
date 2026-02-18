const TRACKS = [
  '/personal-museum-bg-songs/bg_music_1.mp3',
  '/personal-museum-bg-songs/bg_music_2.mp3',
  '/personal-museum-bg-songs/bg_music_3.mp3',
];

let audioEl = null;
let currentTrack = 0;

function loadTrack(index) {
  audioEl.src = TRACKS[index];
  audioEl.load();
}

function playNext() {
  currentTrack = (currentTrack + 1) % TRACKS.length;
  loadTrack(currentTrack);
  audioEl.play().catch(() => {});
}

export function initAudio() {
  audioEl = document.getElementById('bg-music');
  const muted = localStorage.getItem('museum-muted') === 'true';
  audioEl.muted = muted;
  audioEl.volume = 0.4;

  // Load first track
  loadTrack(currentTrack);

  // When a track ends, play the next one
  audioEl.addEventListener('ended', playNext);

  // Listen for mute toggle from overlay
  document.addEventListener('museum-mute-toggle', (e) => {
    audioEl.muted = e.detail.muted;
  });

  // Start playback on first user interaction
  const startOnInteraction = () => {
    audioEl.play().catch(() => {});
    document.removeEventListener('click', startOnInteraction);
    document.removeEventListener('keydown', startOnInteraction);
  };
  document.addEventListener('click', startOnInteraction);
  document.addEventListener('keydown', startOnInteraction);
}
