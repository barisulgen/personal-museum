import { handleUpload } from './upload.js';
import { getPhotoCount } from '../storage/db.js';

let onStartTour = null;
let photoCount = 0;

export function initOverlay({ onStart }) {
  onStartTour = onStart;
  const overlay = document.getElementById('overlay');

  overlay.innerHTML = `
    <div class="menu-panel">
      <h1>Personal Museum</h1>
      <p class="subtitle">A private gallery for your photographs</p>
      <button id="upload-btn">Upload Photos</button>
      <input type="file" id="file-input" accept="image/*" multiple />
      <p class="photo-count" id="photo-count"></p>
      <button id="start-btn" disabled>Start the Tour</button>
      <button class="mute-btn" id="mute-btn">♪ Music: On</button>
    </div>
  `;

  const uploadBtn = document.getElementById('upload-btn');
  const fileInput = document.getElementById('file-input');
  const startBtn = document.getElementById('start-btn');
  const muteBtn = document.getElementById('mute-btn');

  uploadBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    if (e.target.files.length === 0) return;
    photoCount = await handleUpload(e.target.files);
    updatePhotoCount();
    e.target.value = '';
  });

  startBtn.addEventListener('click', () => {
    if (photoCount > 0 && onStartTour) {
      onStartTour();
    }
  });

  // Mute toggle
  const muted = localStorage.getItem('museum-muted') === 'true';
  updateMuteBtn(muteBtn, muted);

  muteBtn.addEventListener('click', () => {
    const isMuted = localStorage.getItem('museum-muted') === 'true';
    const newMuted = !isMuted;
    localStorage.setItem('museum-muted', String(newMuted));
    updateMuteBtn(muteBtn, newMuted);
    document.dispatchEvent(new CustomEvent('museum-mute-toggle', { detail: { muted: newMuted } }));
  });

  // Load initial count
  getPhotoCount().then((count) => {
    photoCount = count;
    updatePhotoCount();
  });
}

function updatePhotoCount() {
  const el = document.getElementById('photo-count');
  const startBtn = document.getElementById('start-btn');
  if (photoCount === 0) {
    el.textContent = 'No photos yet';
  } else {
    el.textContent = `${photoCount} photo${photoCount !== 1 ? 's' : ''} uploaded`;
  }
  startBtn.disabled = photoCount === 0;
}

function updateMuteBtn(btn, muted) {
  btn.textContent = muted ? '♪ Music: Off' : '♪ Music: On';
}

export function showOverlay() {
  document.getElementById('overlay').classList.remove('hidden');
  // Refresh photo count when returning to menu
  getPhotoCount().then((count) => {
    photoCount = count;
    updatePhotoCount();
  });
}

export function hideOverlay() {
  document.getElementById('overlay').classList.add('hidden');
}
