$env:PATH = "$env:PATH;C:\Users\tanar\AppData\Local\Android\Sdk\platform-tools"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"

Write-Host "=== Building JournalMate APK ===" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path "c:\Users\tanar\private\pathwise_app\android"

Write-Host "Building debug APK..." -ForegroundColor Yellow
& .\gradlew.bat assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installing APK..." -ForegroundColor Yellow

    # Uninstall first to avoid signature issues
    adb uninstall ai.journalmate.app 2>$null

    # Install the new APK
    adb install -r "app\build\outputs\apk\debug\app-debug.apk"

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Installation successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Launching app..." -ForegroundColor Yellow
        adb shell am start -n ai.journalmate.app/.MainActivity
        Write-Host ""
        Write-Host "Done! App should now be running." -ForegroundColor Green
    } else {
        Write-Host "Installation failed!" -ForegroundColor Red
    }
} else {
    Write-Host "Build failed!" -ForegroundColor Red
}
