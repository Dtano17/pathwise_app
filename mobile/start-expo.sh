#!/bin/bash
echo "🚀 Starting JournalMate Mobile with Expo Go"
echo ""
echo "📱 Instructions:"
echo "1. Make sure your main Replit app is running"
echo "2. Install Expo Go on your phone (iOS or Android)"
echo "3. Scan the QR code that appears below"
echo ""
echo "⏳ Starting Expo development server..."
echo ""

cd "$(dirname "$0")"
npm start
