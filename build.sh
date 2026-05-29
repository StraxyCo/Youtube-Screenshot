#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Installing Python and yt-dlp..."
apt-get update || true
apt-get install -y python3-pip || true
pip3 install yt-dlp

echo "Build complete!"
