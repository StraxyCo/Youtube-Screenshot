const { spawn } = require('child_process');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const proc = spawn('yt-dlp', ['--version']);
    let version = '';

    proc.stdout.on('data', chunk => (version += chunk));

    proc.on('close', code => {
      if (code === 0) {
        res.status(200).json({
          status: 'ok',
          ytdlp: version.trim().split(' ')[0]
        });
      } else {
        res.status(500).json({ error: 'yt-dlp not available' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Health check failed' });
  }
};
