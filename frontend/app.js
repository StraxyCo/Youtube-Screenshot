// Dynamically load html2canvas
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
document.head.appendChild(script);

const API_BASE = 'https://yt-frame-extractor-backend.onrender.com';

console.log('🎬 YouTube Frame Extractor Loaded');
console.log('API_BASE:', API_BASE);

let offset = 0;
const DEFAULT_TIMESTAMPS = [1, 2, 3, 4, 5, 6, 7, 8];
let currentUrl = '';
let currentVideoId = '';
let currentTitle = '';
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

async function getMetadata(url) {
  try {
    console.log('📤 Fetching metadata for:', url);
    const response = await fetch(`${API_BASE}/metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Backend error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Metadata received:', data);
    return data;
  } catch (err) {
    console.error('❌ Metadata error:', err.message);
    throw err;
  }
}

async function captureFrame(videoId, timestamp) {
  return new Promise((resolve) => {
    try {
      console.log(`🎥 Capturing frame at ${timestamp}s`);

      // Create a temporary player container (insert in normal document flow)
      const container = document.createElement('div');
      container.id = `temp-player-${timestamp}`;
      container.style.width = '100%';
      container.style.maxWidth = '800px';
      container.style.height = '450px';
      container.style.backgroundColor = '#000';
      container.style.borderRadius = '8px';
      container.style.overflow = 'hidden';
      container.style.margin = '20px auto';
      container.style.border = '2px solid #333';

      const embed = document.createElement('iframe');
      embed.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${timestamp}&controls=1&modestbranding=1`;
      embed.style.border = 'none';
      embed.style.width = '100%';
      embed.style.height = '100%';
      embed.allow = 'autoplay';

      container.appendChild(embed);

      // Insert right after the input section
      const inputSection = document.querySelector('.input-section');
      if (inputSection) {
        inputSection.parentNode.insertBefore(container, inputSection.nextSibling);
      } else {
        document.body.appendChild(container);
      }

      // Wait for iframe to load, play, and render
      setTimeout(async () => {
        try {
          console.log(`📊 DEBUG: Container size:`, container.offsetWidth, 'x', container.offsetHeight);
          console.log(`📊 DEBUG: Container visible:`, container.offsetParent !== null);
          console.log(`📊 DEBUG: Container computed style:`, window.getComputedStyle(container).display);
          console.log(`📊 DEBUG: iframe src:`, embed.src);
          console.log(`📊 DEBUG: iframe readyState:`, embed.readyState);

          console.log(`📸 html2canvas capturing at ${timestamp}s`);
          const canvas = await html2canvas(container, {
            backgroundColor: '#000000',
            scale: window.devicePixelRatio || 1,
            useCORS: true,
            allowTaint: true,
            logging: true,  // Enable logging to see what html2canvas sees
            foreignObjectRendering: true
          });

          console.log(`📊 Canvas size:`, canvas.width, 'x', canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.95);
          console.log(`✅ Frame captured at ${timestamp}s, base64 length:`, base64.length);

          // Clean up
          document.body.removeChild(container);

          resolve({ timestamp, data: base64 });
        } catch (err) {
          console.error(`❌ Capture error at ${timestamp}s:`, err);
          console.error(`❌ Error details:`, err.message, err.stack);
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
          resolve({ timestamp, data: null });
        }
      }, 4000); // Longer wait for iframe to fully load
    } catch (err) {
      console.error(`❌ Frame error at ${timestamp}s:`, err.message);
      resolve({ timestamp, data: null });
    }
  });
}

function renderFrames(title, frames) {
  currentTitle = title;
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
      placeholder.textContent = 'Capture\nFailed';
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

async function performExtraction(url) {
  if (!url.trim()) {
    showError('Please enter a YouTube URL');
    return;
  }

  isLoading = true;
  extractBtn.disabled = true;
  nextBtn.disabled = true;
  loadingIndicator.classList.remove('hidden');
  gridSection.classList.remove('visible');

  try {
    console.log('🚀 Starting extraction for:', url);

    // Get metadata
    const metadata = await getMetadata(url);
    currentVideoId = metadata.videoId;
    currentTitle = metadata.title;

    console.log('📸 Capturing frames...');
    const timestamps = getCurrentTimestamps();

    // Capture frames sequentially
    const frames = [];
    for (const ts of timestamps) {
      const frame = await captureFrame(metadata.videoId, ts);
      frames.push(frame);
      // Small delay between captures
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('🎉 All frames captured:', frames.length);
    renderFrames(metadata.title, frames);
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
  await performExtraction(currentUrl);
});

urlInput.addEventListener('keypress', async e => {
  if (e.key === 'Enter') {
    currentUrl = urlInput.value.trim();
    offset = 0;
    await performExtraction(currentUrl);
  }
});

nextBtn.addEventListener('click', async () => {
  offset += 8;
  await performExtraction(currentUrl);
});
