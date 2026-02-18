let audioEl = null;

export function initAudio() {
  audioEl = document.getElementById('bg-music');
  const muted = localStorage.getItem('museum-muted') === 'true';
  audioEl.muted = muted;
  audioEl.volume = 0.4;

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
