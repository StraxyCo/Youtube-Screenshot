#!/bin/bash
set -e

echo "Installing Node dependencies..."
npm install

echo "Installing Python and yt-dlp..."
apt-get update
apt-get install -y python3 python3-pip
pip3 install yt-dlp

echo "Build complete!"
