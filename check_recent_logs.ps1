$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Recent Notification & Capacitor Logs ===" -ForegroundColor Cyan
Write-Host ""

# Get recent logs
adb logcat -d -t 200 | Select-String -Pattern "NotificationPlugin|NotificationAlarm|Capacitor|NativeNotifications|CapacitorPlugin" | Select-Object -Last 50
