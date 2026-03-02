# Build Debug APK for testing
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Set-Location android
.\gradlew.bat assembleDebug
Set-Location ..

# Show the APK location
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    Write-Host "Debug APK ready: $apkPath" -ForegroundColor Green
    Write-Host "File size: $((Get-Item $apkPath).Length / 1MB) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To install on your device:" -ForegroundColor Yellow
    Write-Host "  adb install -r $apkPath" -ForegroundColor White
} else {
    Write-Host "ERROR: APK not found at $apkPath" -ForegroundColor Red
}
