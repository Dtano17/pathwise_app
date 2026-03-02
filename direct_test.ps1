$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Direct Notification Test ===" -ForegroundColor Cyan

# First, let's check if the app is running and get its PID
Write-Host "`nChecking app status..." -ForegroundColor Yellow
adb shell pidof ai.journalmate.app

# Try using 'input' to simulate actions, or use am to send a test broadcast
Write-Host "`nSending explicit broadcast to NotificationAlarmReceiver..." -ForegroundColor Yellow
adb shell "am broadcast -a SCHEDULED_NOTIFICATION --receiver-permission android.permission.RECEIVE_BOOT_COMPLETED -n ai.journalmate.app/.NotificationAlarmReceiver --ei id 88888 --es title 'Test Notification' --es body 'Triggered via ADB'"

# Check logs immediately after
Write-Host "`nChecking logs..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
adb logcat -d -t 30 | Select-String -Pattern "NotificationAlarm|NotificationPlugin|journalmate" -CaseSensitive:$false
