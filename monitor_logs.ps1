$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Monitoring Notification Logs ===" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Clear logs first for fresh output
adb logcat -c

# Monitor notification and Capacitor related logs
adb logcat NotificationPlugin:V NotificationAlarmReceiver:V Capacitor:V CapacitorPlugin:V *:S
