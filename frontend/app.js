// Determine API base URL
// On Vercel: will be set to Render backend URL before deployment
// Locally: defaults to localhost:3000
const API_BASE = window.BACKEND_URL || 'http://localhost:3000';

console.log('🎬 YouTube Frame Extractor Loaded');
console.log('API_BASE:', API_BASE);

let offset = 0;
const DEFAULT_TIMESTAMPS = [1, 2, 3, 4, 5, 6, 7, 8];
let currentUrl = '';
let currentTitle = '';
let currentFrames = [];
let isLoading = false;

const urlInput = document.getElementById('urlInput');
const extractBtn = document.getElementById('extractBtn');
const nextBtn = document.getElementById('nextBtn');
const errorToast = document.getElementById('errorToast');
const loadingIndicator = document.getElementById('loadingIndicator');
const gridSection = document.getElementById('gridSection');
const framesGrid = document.getElementById('framesGrid');
const videoTitle = document.getElementById('videoTitle');

function showError(message) {
  errorToast.textContent = message;
  errorToast.classList.remove('hidden');
  setTimeout(() => {
    errorToast.classList.add('hidden');
  }, 5000);
}

function getCurrentTimestamps() {
  return DEFAULT_TIMESTAMPS.map(t => t + offset);
}

async function extractFrames(youtubeUrl, timestamps) {
  try {
    const endpoint = `${API_BASE}/extract`;
    console.log('📤 Calling:', endpoint);
    console.log('📝 Payload:', { url: youtubeUrl, timestamps });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: youtubeUrl, timestamps })
    });

    console.log('📨 Response status:', response.status);
    console.log('📨 Response headers:', response.headers);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Backend error:', errorData);
      throw new Error(errorData.error || `Backend error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Extraction success:', data);
    return data;
  } catch (err) {
    console.error('❌ Extraction error:', err.message);
    throw new Error(err.message || 'Failed to extract frames');
  }
}

function renderFrames(title, frames) {
  currentTitle = title;
  currentFrames = frames;
  videoTitle.textContent = title;

  framesGrid.innerHTML = '';

  frames.forEach(frame => {
    const container = document.createElement('div');
    container.className = frame.data ? 'frame-container' : 'frame-container unavailable';

    if (frame.data) {
      const img = document.createElement('img');
      img.className = 'frame-image';
      img.src = frame.data;
      container.appendChild(img);

      const feedback = document.createElement('div');
      feedback.className = 'frame-feedback';
      feedback.textContent = '✓ Downloaded';
      container.appendChild(feedback);

      container.addEventListener('click', () => {
        downloadFrame(frame.data, title, frame.timestamp);
        container.classList.add('downloaded');
        setTimeout(() => {
          container.classList.remove('downloaded');
        }, 1500);
      });
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'frame-placeholder';
      placeholder.textContent = 'Timestamp\nout of range';
      container.appendChild(placeholder);
    }

    const timestamp = document.createElement('div');
    timestamp.className = 'frame-timestamp';
    timestamp.textContent = `${frame.timestamp}s`;
    container.appendChild(timestamp);

    const icon = document.createElement('div');
    icon.className = 'download-icon';
    icon.textContent = '⬇';
    container.appendChild(icon);

    framesGrid.appendChild(container);
  });

  gridSection.classList.add('visible');
  nextBtn.disabled = false;
}

function downloadFrame(base64DataUrl, title, timestamp) {
  const link = document.createElement('a');
  link.href = base64DataUrl;
  link.download = `${title}-${timestamp}s.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function performExtraction(url, timestamps) {
  if (!url.trim()) {
    showError('Please enter a YouTube URL');
    return;
  }

  console.log('🚀 Starting extraction for:', url);
  console.log('⏱️ Timestamps:', timestamps);

  isLoading = true;
  extractBtn.disabled = true;
  nextBtn.disabled = true;
  loadingIndicator.classList.remove('hidden');
  gridSection.classList.remove('visible');

  try {
    const result = await extractFrames(url, timestamps);
    console.log('🎉 Got frames:', result.frames.length);
    renderFrames(result.title, result.frames);
  } catch (err) {
    console.error('💥 Extraction failed:', err.message);
    showError(err.message);
    gridSection.classList.remove('visible');
  } finally {
    isLoading = false;
    extractBtn.disabled = false;
    loadingIndicator.classList.add('hidden');
  }
}

extractBtn.addEventListener('click', async () => {
  currentUrl = urlInput.value.trim();
  offset = 0;
  await performExtraction(currentUrl, getCurrentTimestamps());
});

urlInput.addEventListener('keypress', async e => {
  if (e.key === 'Enter') {
    currentUrl = urlInput.value.trim();
    offset = 0;
    await performExtraction(currentUrl, getCurrentTimestamps());
  }
});

nextBtn.addEventListener('click', async () => {
  offset += 8;
  await performExtraction(currentUrl, getCurrentTimestamps());
});
