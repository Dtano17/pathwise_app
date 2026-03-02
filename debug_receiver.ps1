$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Debug Receiver Registration ===" -ForegroundColor Cyan

# Check if the receiver is in the installed package
Write-Host "`nChecking package components..." -ForegroundColor Yellow
adb shell "dumpsys package ai.journalmate.app | grep -A 5 'NotificationAlarmReceiver'"

Write-Host "`nChecking all receivers in the app:" -ForegroundColor Yellow
adb shell "dumpsys package ai.journalmate.app | grep -E 'receiver|Receiver'"

Write-Host "`nTrying to run receiver directly with run-as..." -ForegroundColor Yellow
# This won't work for non-debuggable apps but let's try

# Let's check the actual installed APK manifest
Write-Host "`nChecking notification permission status..." -ForegroundColor Yellow
adb shell "dumpsys package ai.journalmate.app | grep -i notification"

Write-Host "`nFull broadcast receivers list:" -ForegroundColor Yellow
adb shell "dumpsys package ai.journalmate.app" | Select-String "receiver" -Context 0,3
