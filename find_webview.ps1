$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "Clearing old logs..." -ForegroundColor Yellow
adb logcat -c

Write-Host "Looking for WebView sockets..." -ForegroundColor Cyan
$output = adb shell "cat /proc/net/unix 2>/dev/null"
$output | Select-String "webview" | Select-Object -First 5
