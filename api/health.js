const { spawn } = require('child_process');

module.exports = async function handler(req, res) {
  console.log('[API/health] Received request:', req.method);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    console.log('[API/health] OPTIONS request, returning 200');
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    console.log('[API/health] Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[API/health] Checking yt-dlp version...');
    const proc = spawn('yt-dlp', ['--version']);
    let version = '';

    proc.stdout.on('data', chunk => (version += chunk));

    proc.on('close', code => {
      if (code === 0) {
        console.log('[API/health] yt-dlp version:', version.trim().split(' ')[0]);
        res.status(200).json({
          status: 'ok',
          ytdlp: version.trim().split(' ')[0]
        });
      } else {
        console.log('[API/health] yt-dlp not available, exit code:', code);
        res.status(500).json({ error: 'yt-dlp not available' });
      }
    });

    proc.on('error', err => {
      console.log('[API/health] yt-dlp error:', err.message);
      res.status(500).json({ error: 'yt-dlp error: ' + err.message });
    });
  } catch (err) {
    console.log('[API/health] Exception:', err.message);
    res.status(500).json({ error: 'Health check failed' });
  }
};
