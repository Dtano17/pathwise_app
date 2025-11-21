#!/bin/bash

# JournalMate Mobile - Quick Deploy Script
# This script guides you through deploying to iOS App Store and Google Play

set -e

echo "🚀 JournalMate Mobile Deployment"
echo "================================="
echo ""

# Check if eas-cli is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
    echo "✅ EAS CLI installed"
fi

echo ""
echo "📱 What would you like to do?"
echo ""
echo "1) Configure EAS project (first-time setup)"
echo "2) Build iOS app"
echo "3) Build Android app"
echo "4) Build both iOS and Android"
echo "5) Submit iOS to App Store"
echo "6) Submit Android to Google Play"
echo "7) Check build status"
echo "8) Exit"
echo ""

read -p "Enter choice [1-8]: " choice

case $choice in
    1)
        echo ""
        echo "🔧 Configuring EAS project..."
        eas login
        eas build:configure
        echo ""
        echo "✅ Configuration complete!"
        echo "📝 Next: Update eas.json with your Apple ID and credentials"
        ;;
    2)
        echo ""
        echo "🍎 Building iOS app for production..."
        eas build --platform ios --profile production
        echo ""
        echo "✅ iOS build started!"
        echo "⏱️  Build will take 30-45 minutes"
        echo "📧 You'll receive an email when complete"
        ;;
    3)
        echo ""
        echo "🤖 Building Android app for production..."
        eas build --platform android --profile production
        echo ""
        echo "✅ Android build started!"
        echo "⏱️  Build will take 30-45 minutes"
        echo "📧 You'll receive an email when complete"
        ;;
    4)
        echo ""
        echo "📱 Building both iOS and Android for production..."
        eas build --platform all --profile production
        echo ""
        echo "✅ Builds started!"
        echo "⏱️  Builds will take 30-45 minutes each"
        echo "📧 You'll receive emails when complete"
        ;;
    5)
        echo ""
        echo "🍎 Submitting iOS app to App Store..."
        echo "⚠️  Make sure you've completed App Store Connect setup first!"
        read -p "Continue? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            eas submit --platform ios
            echo ""
            echo "✅ iOS submission complete!"
            echo "⏱️  Review takes 24-48 hours typically"
        fi
        ;;
    6)
        echo ""
        echo "🤖 Submitting Android app to Google Play..."
        echo "⚠️  Make sure you've completed Google Play Console setup first!"
        read -p "Continue? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            eas submit --platform android
            echo ""
            echo "✅ Android submission complete!"
            echo "⏱️  Review takes 2-7 days typically"
        fi
        ;;
    7)
        echo ""
        echo "📊 Checking build status..."
        eas build:list
        ;;
    8)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📚 For detailed instructions, see:"
echo "   • DEPLOYMENT_GUIDE.md - Complete deployment walkthrough"
echo "   • APP_STORE_CHECKLIST.md - Submission checklist"
echo ""
