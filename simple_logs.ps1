$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"

Write-Host "Checking if device is connected..."
adb devices

Write-Host ""
Write-Host "Getting recent logs..."
$logs = adb logcat -d -t 100
$logs | ForEach-Object { Write-Host $_ }
