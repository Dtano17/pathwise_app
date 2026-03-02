$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Full Log Analysis ===" -ForegroundColor Cyan

# Clear logcat first
adb logcat -c

Write-Host "`nLogs cleared. Now triggering broadcast..." -ForegroundColor Yellow

# Send the broadcast
adb shell "am broadcast -a SCHEDULED_NOTIFICATION -n ai.journalmate.app/.NotificationAlarmReceiver --ei id 77777 --es title 'ADB Test' --es body 'Testing notification system'"

Start-Sleep -Seconds 3

Write-Host "`nAll recent logs from the app:" -ForegroundColor Yellow
adb logcat -d | Select-String "ai.journalmate|NotificationAlarm|NotificationPlugin|BroadcastReceiver" | Select-Object -Last 30

Write-Host "`n`nChecking for any errors:" -ForegroundColor Red
adb logcat -d | Select-String "Error|Exception|error|exception" | Select-String "journalmate|Notification" | Select-Object -Last 10
