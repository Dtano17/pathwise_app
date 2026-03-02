$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "=== All Recent App Logs (Last 300 lines) ===" -ForegroundColor Cyan
Write-Host ""

# Get recent logs from our app specifically
$output = adb logcat -d -t 300
$output | Select-String -Pattern "journalmate|NotificationPlugin|Capacitor|NativeNotification" -CaseSensitive:$false | Select-Object -Last 60
