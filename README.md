# YouTube Frame Extractor

Extract precise frames from YouTube videos, display them in a grid, and download them with formatted names ready for Figma.

## Structure

```
/
├── backend/          # Node.js backend (Railway)
│   ├── index.js
│   ├── package.json
│   ├── railway.toml
│   └── .env.example
├── frontend/         # Static frontend (Vercel)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .gitignore
└── README.md
```

## Local Development

### Backend

1. Install dependencies:
```bash
cd backend
npm install
```

2. Ensure `yt-dlp` is installed on your system:
```bash
pip3 install yt-dlp
ffmpeg --version  # or install via homebrew
```

3. Start the backend:
```bash
npm start
```

The backend will run on `http://localhost:3000`.

4. Test the health endpoint:
```bash
curl http://localhost:3000/health
```

### Frontend

1. Open `frontend/index.html` in a browser, or serve it:
```bash
cd frontend
python3 -m http.server 8000
```

Visit `http://localhost:8000`.

## Deployment

### 1. Backend (Railway)

1. Connect GitHub repo to Railway
2. Select `backend/` folder as root directory
3. Railway auto-detects Node.js and runs `npm start`
4. Once deployed, copy the public URL and update `frontend/app.js`

### 2. Frontend (Vercel)

1. Update `BACKEND_URL` in `frontend/app.js` with Railway URL
2. Commit and push
3. Create new project on Vercel, select repo, set root directory to `frontend/`
4. Deploy

## API

### POST /extract

Request:
```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "timestamps": [1, 2, 3, 4, 5, 6, 7, 8]
}
```

Response:
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

### GET /health

Response:
```json
{
  "status": "ok",
  "ytdlp": "version"
}
```
