# Build Release AAB for Google Play
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
Set-Location android
.\gradlew.bat bundleRelease
Set-Location ..

# Copy and rename the AAB
$sourceAAB = "android\app\build\outputs\bundle\release\app-release.aab"
$destAAB = "JournalMate-v1.2.0-build20-release.aab"

if (Test-Path $sourceAAB) {
    Copy-Item $sourceAAB $destAAB
    Write-Host "Release AAB ready: $destAAB" -ForegroundColor Green
    Write-Host "File size: $((Get-Item $destAAB).Length / 1MB) MB" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: AAB not found at $sourceAAB" -ForegroundColor Red
}
