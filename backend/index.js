const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

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
      '--socket-timeout', '10',
      url
    ]);

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', chunk => (output += chunk));
    proc.stderr.on('data', chunk => (errorOutput += chunk));

    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error('Unable to retrieve video title'));
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

    setTimeout(() => {
      proc.kill();
      reject(new Error('Metadata fetch timeout'));
    }, 15000);
  });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.post('/metadata', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('[POST /metadata] URL:', url);

    // Extract video ID
    let videoId;
    try {
      videoId = extractVideoId(url);
      console.log('[POST /metadata] Video ID:', videoId);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Get metadata for title
    let metadata;
    try {
      metadata = await getVideoMetadata(url);
      console.log('[POST /metadata] Title:', metadata.title);
    } catch (err) {
      console.log('[POST /metadata] Could not fetch metadata:', err.message);
      metadata = { title: 'YouTube Video' };
    }

    const title = slugify(metadata.title || 'youtube-video');

    res.json({ videoId, title });
  } catch (err) {
    console.error('[POST /metadata] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to get metadata' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
