$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Testing JournalMate Notifications ===" -ForegroundColor Cyan
Write-Host ""

# Method 1: Use activity manager to start with a special intent that triggers notification
Write-Host "Method 1: Sending test notification via activity..." -ForegroundColor Yellow

# Create a test notification by calling the Java code directly via debug bridge
# First, let's check if the app has a test endpoint or we can use eval

Write-Host ""
Write-Host "Method 2: Injecting JavaScript to call NativeNotifications.show()..." -ForegroundColor Yellow

# Use Chrome DevTools Protocol to inject JS (requires USB debugging + Chrome remote debugging)
# Or we can use a simpler approach - send an intent to open a specific deep link that triggers notification

Write-Host ""
Write-Host "Method 3: Triggering notification via service..." -ForegroundColor Yellow
adb shell am startservice -n ai.journalmate.app/.JournalMateService --es action "TEST_NOTIFICATION"

Write-Host ""
Write-Host "Checking recent logs..." -ForegroundColor Yellow
adb logcat -d -t 50 | Select-String -Pattern "NotificationPlugin|NotificationAlarm|NOTIFICATION" | Select-Object -Last 15
