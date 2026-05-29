# YouTube Frame Extractor

Extract precise frames from YouTube videos, display them in a grid, and download them with formatted names ready for Figma.

## Structure

```
/
├── api/                 # Vercel API routes (serverless backend)
│   ├── extract.js      # POST /api/extract for frame extraction
│   └── health.js       # GET /api/health for health check
├── frontend/           # Static frontend (served by Vercel)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── package.json        # Root dependencies
├── vercel.json         # Vercel configuration
├── .gitignore
└── README.md
```

## Local Development

### Setup

1. Install dependencies:
```bash
npm install
cd frontend
npm install  # if needed
```

2. Ensure `yt-dlp` is installed on your system:
```bash
pip3 install yt-dlp
```

### Running Locally

**Option 1: Serve frontend + test API manually**

Terminal 1 - Frontend:
```bash
cd frontend
python3 -m http.server 8000
```

Terminal 2 - Test API (Node.js):
```bash
node -e "
import('./api/extract.js').then(m => {
  const mockReq = { body: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', timestamps: [1, 2] }, method: 'POST' };
  const mockRes = { status: (s) => ({ json: (d) => console.log(JSON.stringify(d, null, 2)) }), setHeader: () => {} };
  m.default(mockReq, mockRes);
});
"
```

Visit `http://localhost:8000` in your browser.

## Deployment to Vercel

### One-Click Setup

1. **Connect your repo to Vercel:**
   - Go to https://vercel.com/new
   - Import the `Youtube-Screenshot` repo from GitHub
   - Click "Import"

2. **Configure the project:**
   - **Framework**: Other (or leave blank)
   - **Root Directory**: `.` (root of repo)
   - **Build Command**: `npm install`
   - Leave environment variables blank for now

3. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Vercel auto-builds and deploys both frontend + backend API routes

4. **Get your live URL:**
   - Vercel shows your deployment URL (e.g., `https://youtube-screenshot.vercel.app`)
   - Frontend is at the root
   - API routes are at `/api/extract` and `/api/health`

5. **Update frontend to use live API (optional):**
   - In `frontend/app.js`, update:
     ```js
     const BACKEND_URL = 'https://your-vercel-url.vercel.app';
     ```
   - Or leave it as `localhost:3000` (frontend will auto-detect Vercel API routes on deployment)

### Test After Deployment

1. Open your Vercel URL
2. Paste a YouTube video URL
3. Click "Extract"
4. Click a frame to download it as `{title}-{timestamp}s.jpg`

---

## API

### POST /api/extract

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "timestamps": [1, 2, 3, 4, 5, 6, 7, 8]
}
```

**Response:**
```json
{
  "title": "video-title-slugified",
  "frames": [
    {
      "timestamp": 1,
      "data": "data:image/jpeg;base64,..."
    }
  ]
}
```

### GET /api/health

**Response:**
```json
{
  "status": "ok",
  "ytdlp": "2025.10.14"
}
```

---

## Architecture

- **Frontend**: Static HTML/CSS/JS (served by Vercel)
- **Backend**: Node.js serverless functions (Vercel API routes)
  - Uses `yt-dlp` for YouTube metadata + video streaming
  - Uses `ffmpeg-static` for frame extraction
  - No database or file system writes (all in-memory pipes)
- **Deployment**: Single Vercel project handles everything

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| API returns 400 "unable to retrieve metadata" | YouTube URL is private, geoblocked, or invalid |
| Frames return as `null` | yt-dlp took too long to download video (60s timeout). Retry. |
| CORS errors in browser | Check that frontend URL matches CORS header in API |
| `/api/health` returns 500 | yt-dlp not available in Vercel environment (rare) |

---

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework, no build step)
- **Backend**: Node.js + Express (migrated to Vercel serverless)
- **Tools**: yt-dlp, ffmpeg-static
- **Deployment**: Vercel (frontend + API routes)
