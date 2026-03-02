$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== Checking NotificationAlarmReceiver Registration ===" -ForegroundColor Cyan

Write-Host "`nAll registered receivers in the app:" -ForegroundColor Yellow
$output = adb shell "dumpsys package ai.journalmate.app"
$output | Select-String -Pattern "receiver" -Context 0,5

Write-Host "`n=== Checking NotificationAlarmReceiver specifically ===" -ForegroundColor Cyan
$output | Select-String -Pattern "NotificationAlarm" -Context 2,5

Write-Host "`n=== Checking BootReceiver ===" -ForegroundColor Cyan
$output | Select-String -Pattern "BootReceiver" -Context 2,5

Write-Host "`n=== Recent logcat from notification components ===" -ForegroundColor Yellow
adb logcat -d -t 100 | Select-String -Pattern "NotificationPlugin|NotificationAlarm|NativeNotifications" | Select-Object -Last 30
