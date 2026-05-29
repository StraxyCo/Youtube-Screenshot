const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  throw new Error('Invalid YouTube URL');
}

function getVideoMetadata(url) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', [
      '--dump-json',
      '--no-playlist',
      '--socket-timeout', '30',
      '--extractor-args', 'youtube:player_client=web',
      url
    ]);

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', chunk => (output += chunk));
    proc.stderr.on('data', chunk => (errorOutput += chunk));

    proc.on('close', code => {
      if (code !== 0) {
        const errorMsg = errorOutput.includes('private')
          ? 'Video unavailable: This video is private'
          : errorOutput.includes('not found')
          ? 'Video unavailable: Video not found'
          : 'Video unavailable: Unable to retrieve metadata';
        reject(new Error(errorMsg));
      } else {
        try {
          const metadata = JSON.parse(output);
          resolve(metadata);
        } catch (err) {
          reject(new Error('Failed to parse video metadata'));
        }
      }
    });

    proc.on('error', err => reject(new Error(`yt-dlp error: ${err.message}`)));
  });
}

async function extractFrame(videoId, timestamp) {
  try {
    console.log(`[extractFrame] Capturing frame at ${timestamp}s for video ${videoId}`);

    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&start=${timestamp}&mute=1`;
    console.log(`[extractFrame] Loading: ${embedUrl}`);

    await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for video to load and play
    await new Promise(r => setTimeout(r, 2000));

    const screenshot = await page.screenshot({ type: 'jpeg', quality: 95 });
    const base64 = 'data:image/jpeg;base64,' + screenshot.toString('base64');

    await browser.close();

    console.log(`[extractFrame] Frame captured successfully at ${timestamp}s`);
    return { timestamp, data: base64 };
  } catch (err) {
    console.error(`[extractFrame] Error at ${timestamp}s:`, err.message);
    return { timestamp, data: null };
  }
}

app.get('/health', async (req, res) => {
  try {
    const proc = spawn('yt-dlp', ['--version']);
    let version = '';

    proc.stdout.on('data', chunk => (version += chunk));

    proc.on('close', code => {
      if (code === 0) {
        res.json({
          status: 'ok',
          ytdlp: version.trim().split(' ')[0],
          puppeteer: 'available'
        });
      } else {
        res.status(500).json({ error: 'yt-dlp not available' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

app.post('/extract', async (req, res) => {
  try {
    const { url, timestamps } = req.body;

    if (!url || !Array.isArray(timestamps) || timestamps.length === 0) {
      return res.status(400).json({ error: 'Invalid request: url and timestamps required' });
    }

    console.log('[POST /extract] URL:', url);
    console.log('[POST /extract] Timestamps:', timestamps);

    // Extract video ID
    let videoId;
    try {
      videoId = extractVideoId(url);
      console.log('[POST /extract] Video ID:', videoId);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Get metadata for title
    let metadata;
    try {
      metadata = await getVideoMetadata(url);
      console.log('[POST /extract] Title:', metadata.title);
    } catch (err) {
      console.log('[POST /extract] Metadata error (non-critical):', err.message);
      metadata = { title: 'Unknown Video' };
    }

    const title = slugify(metadata.title || 'unknown-video');

    // Extract frames in sequence (not parallel to avoid browser conflicts)
    console.log('[POST /extract] Starting frame extraction...');
    const frames = [];
    for (const ts of timestamps) {
      const frame = await extractFrame(videoId, ts);
      frames.push(frame);
      // Small delay between frames
      await new Promise(r => setTimeout(r, 500));
    }

    console.log('[POST /extract] All frames extracted:', frames.length);
    res.status(200).json({ title, frames });
  } catch (err) {
    console.error('[POST /extract] Error:', err.message);
    res.status(500).json({ error: err.message || 'Extraction failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
