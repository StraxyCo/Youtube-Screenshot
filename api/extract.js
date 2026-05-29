const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

function getVideoMetadata(url) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', ['--dump-json', '--no-playlist', url]);
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
          : errorOutput.includes('geoblocked')
          ? 'Video unavailable: This video is geoblocked'
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

function extractFrame(url, timestamp) {
  return new Promise((resolve) => {
    let resolved = false;

    const ytdlp = spawn('yt-dlp', [
      '-f',
      'bestvideo[ext=mp4]/bestvideo',
      '--no-playlist',
      '-o',
      '-',
      url
    ]);

    const ff = spawn(ffmpegPath, [
      '-i',
      'pipe:0',
      '-ss',
      String(timestamp),
      '-frames:v',
      '1',
      '-f',
      'image2',
      '-vcodec',
      'mjpeg',
      '-q:v',
      '5',
      'pipe:1'
    ]);

    ytdlp.stdout.pipe(ff.stdin);

    const chunks = [];
    ff.stdout.on('data', chunk => chunks.push(chunk));

    ff.stdout.on('end', () => {
      if (resolved) return;
      resolved = true;
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        resolve({ timestamp, data: null });
      } else {
        const base64 = 'data:image/jpeg;base64,' + buffer.toString('base64');
        resolve({ timestamp, data: base64 });
      }
    });

    ff.on('error', () => {
      if (resolved) return;
      resolved = true;
      resolve({ timestamp, data: null });
    });

    ytdlp.on('error', () => {
      if (resolved) return;
      resolved = true;
      resolve({ timestamp, data: null });
    });

    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      ytdlp.kill();
      ff.kill();
      resolve({ timestamp, data: null });
    }, 60000);
  });
}

module.exports = async function handler(req, res) {
  console.log('[API/extract] Received request:', req.method);
  console.log('[API/extract] Headers:', req.headers);

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    console.log('[API/extract] OPTIONS request, returning 200');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.log('[API/extract] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, timestamps } = req.body;
    console.log('[API/extract] Body:', { url, timestamps });

    if (!url || !Array.isArray(timestamps) || timestamps.length === 0) {
      console.log('[API/extract] Invalid body');
      return res.status(400).json({ error: 'Invalid request: url and timestamps required' });
    }

    console.log('[API/extract] Getting metadata for:', url);
    let metadata;
    try {
      metadata = await getVideoMetadata(url);
      console.log('[API/extract] Metadata received:', metadata.title);
    } catch (err) {
      console.log('[API/extract] Metadata error:', err.message);
      return res.status(400).json({ error: err.message });
    }

    const title = slugify(metadata.title || 'untitled');
    console.log('[API/extract] Slugified title:', title);

    console.log('[API/extract] Extracting', timestamps.length, 'frames...');
    const framePromises = timestamps.map(ts => extractFrame(url, ts));
    const frames = await Promise.all(framePromises);
    console.log('[API/extract] Frames extracted:', frames.length);

    res.status(200).json({ title, frames });
  } catch (err) {
    console.error('[API/extract] Error:', err.message);
    res.status(500).json({ error: err.message || 'Extraction failed' });
  }
};
