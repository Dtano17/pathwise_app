$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Testing JournalMate Notifications ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Trigger immediate notification via broadcast
Write-Host "Test 1: Sending immediate notification via broadcast..." -ForegroundColor Yellow
adb shell am broadcast -a SCHEDULED_NOTIFICATION -n ai.journalmate.app/.NotificationAlarmReceiver --ei id 99999 --es title "Test Notification" --es body "This is a test notification from Claude!"

Write-Host ""
Write-Host "Test 2: Check notification logs..." -ForegroundColor Yellow
adb logcat -d -s NotificationPlugin:V NotificationAlarmReceiver:V | Select-Object -Last 20
